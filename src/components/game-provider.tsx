"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_GAME, type GameState, type Mission, type Submission, type TeamId } from "@/lib/game";
import { applyGameAction, type GameAction } from "@/lib/game-actions";

const TEAM_KEY = "bingo-adventure-team-v1";

type GameContextValue = {
  ready: boolean;
  state: GameState;
  currentTeam: TeamId | null;
  login: (teamId: TeamId) => void;
  logout: () => void;
  saveMission: (mission: Mission) => void;
  addSubmission: (submission: Submission) => void;
  decideWinner: (catalogId: string, submissionId: string) => void;
  clearDecision: (catalogId: string) => void;
  rejectSubmission: (submissionId: string) => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<GameState>(EMPTY_GAME);
  const [currentTeam, setCurrentTeam] = useState<TeamId | null>(null);
  const requestQueue = useRef(Promise.resolve());
  const pendingActions = useRef<GameAction[]>([]);
  const confirmedSaveVersion = useRef(0);
  const refreshSequence = useRef(0);

  const mergePendingActions = useCallback((remote: GameState) => (
    pendingActions.current.reduce(applyGameAction, remote)
  ), []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const sequence = ++refreshSequence.current;
      const saveVersion = confirmedSaveVersion.current;
      try {
        const response = await fetch("/api/game", { cache: "no-store" });
        if (!response.ok) throw new Error("sync failed");
        const remote = await response.json() as GameState;
        if (
          active
          && sequence === refreshSequence.current
          && saveVersion === confirmedSaveVersion.current
        ) setState(mergePendingActions(remote));
      } catch {
        // Keep the latest in-memory state while the server reconnects.
      }
    };
    const hydrate = window.setTimeout(() => {
      setCurrentTeam(window.localStorage.getItem(TEAM_KEY) as TeamId | null);
      setReady(true);
      void refresh();
    }, 0);
    const syncWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const polling = window.setInterval(syncWhenVisible, 2500);
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      active = false;
      window.clearTimeout(hydrate);
      window.clearInterval(polling);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [mergePendingActions]);

  const save = useCallback((action: GameAction) => {
    pendingActions.current.push(action);
    setState((previous) => applyGameAction(previous, action));
    requestQueue.current = requestQueue.current.then(async () => {
      try {
        const response = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
        if (!response.ok) throw new Error("save failed");
        const remote = await response.json() as GameState;
        confirmedSaveVersion.current += 1;
        pendingActions.current = pendingActions.current.filter((pending) => pending !== action);
        setState(mergePendingActions(remote));
      } catch {
        // The optimistic local state remains available when the server is offline.
      }
    });
  }, [mergePendingActions]);

  const value = useMemo<GameContextValue>(() => ({
    ready,
    state,
    currentTeam,
    login: (teamId) => {
      window.localStorage.setItem(TEAM_KEY, teamId);
      setCurrentTeam(teamId);
    },
    logout: () => {
      window.localStorage.removeItem(TEAM_KEY);
      setCurrentTeam(null);
    },
    saveMission: (mission) => save({ type: "save-mission", mission }),
    addSubmission: (submission) => save({ type: "submit", submission }),
    decideWinner: (catalogId, submissionId) => save({ type: "decide", catalogId, submissionId }),
    clearDecision: (catalogId) => save({ type: "clear", catalogId }),
    rejectSubmission: (submissionId) => save({ type: "reject", submissionId }),
    resetGame: () => save({ type: "reset" }),
  }), [currentTeam, ready, save, state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
