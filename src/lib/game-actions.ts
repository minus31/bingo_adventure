import {
  EMPTY_GAME,
  MISSION_CATALOG,
  MISSION_SLOTS,
  TEAM_IDS,
  type GameState,
  type Mission,
  type Submission,
  type TeamId,
} from "@/lib/game";

export type GameAction =
  | { type: "save-mission"; mission: Mission }
  | { type: "submit"; submission: Submission }
  | { type: "decide"; catalogId: string; submissionId: string }
  | { type: "clear"; catalogId: string }
  | { type: "reject"; submissionId: string }
  | { type: "reset" };

function isTeamId(value: unknown): value is TeamId {
  return typeof value === "string" && TEAM_IDS.includes(value as TeamId);
}

function isCatalogId(value: unknown): value is string {
  return typeof value === "string" && MISSION_CATALOG.some((item) => item.id === value);
}

function normalizeDate(value: unknown, fallback: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function isAllowedVideoUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (/^\/api\/media\/[a-f0-9-]+\.(mp4|mov|m4v|webm)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname.endsWith(".blob.vercel-storage.com")
      && /\.(mp4|mov|m4v|webm)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function normalizeMission(value: unknown, now: string): Mission | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Mission>;
  const slot = MISSION_SLOTS.find((item) => item.id === candidate.id);
  const catalogMission = MISSION_CATALOG.find((item) => item.id === candidate.catalogId);
  if (!slot || !catalogMission || !isTeamId(candidate.boardTeamId)) return null;
  return {
    ...slot,
    boardTeamId: candidate.boardTeamId,
    catalogId: catalogMission.id,
    title: catalogMission.title,
    description: catalogMission.description,
    emoji: catalogMission.emoji,
    referenceUrl: catalogMission.referenceUrl,
    createdAt: normalizeDate(candidate.createdAt, now),
  };
}

function normalizeSubmission(value: unknown, now: string): Submission | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Submission>;
  if (
    typeof candidate.id !== "string"
    || !/^[a-f0-9-]{16,}$/.test(candidate.id)
    || !isCatalogId(candidate.catalogId)
    || !isTeamId(candidate.teamId)
    || !isAllowedVideoUrl(candidate.videoUrl)
  ) return null;
  return {
    id: candidate.id,
    catalogId: candidate.catalogId,
    teamId: candidate.teamId,
    videoUrl: candidate.videoUrl,
    createdAt: normalizeDate(candidate.createdAt, now),
    status: "pending",
  };
}

export function normalizeGameAction(value: unknown, now = new Date().toISOString()): GameAction | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "save-mission") {
    const mission = normalizeMission(candidate.mission, now);
    return mission ? { type: "save-mission", mission } : null;
  }
  if (candidate.type === "submit") {
    const submission = normalizeSubmission(candidate.submission, now);
    return submission ? { type: "submit", submission } : null;
  }
  if (candidate.type === "decide" && isCatalogId(candidate.catalogId) && typeof candidate.submissionId === "string") {
    return { type: "decide", catalogId: candidate.catalogId, submissionId: candidate.submissionId };
  }
  if (candidate.type === "clear" && isCatalogId(candidate.catalogId)) {
    return { type: "clear", catalogId: candidate.catalogId };
  }
  if (candidate.type === "reject" && typeof candidate.submissionId === "string") {
    return { type: "reject", submissionId: candidate.submissionId };
  }
  if (candidate.type === "reset") return { type: "reset" };
  return null;
}

export function applyGameAction(previous: GameState, action: GameAction): GameState {
  if (action.type === "save-mission") {
    const mission = action.mission;
    const current = previous.missions.find(
      (item) => item.id === mission.id && item.boardTeamId === mission.boardTeamId,
    );
    const hasSubmissions = current
      ? previous.submissions.some((item) => item.catalogId === current.catalogId)
      : false;
    const catalogAlreadyUsed = previous.missions.some(
      (item) => item.boardTeamId === mission.boardTeamId
        && item.catalogId === mission.catalogId
        && item.id !== mission.id,
    );
    if (catalogAlreadyUsed || hasSubmissions) return previous;
    if (current && current.catalogId === mission.catalogId) return previous;
    return {
      ...previous,
      missions: current
        ? previous.missions.map((item) => item.id === mission.id && item.boardTeamId === mission.boardTeamId ? mission : item)
        : [...previous.missions, mission],
    };
  }
  if (action.type === "submit") {
    const submission = action.submission;
    if (
      !previous.missions.some((item) => item.boardTeamId === submission.teamId && item.catalogId === submission.catalogId)
      || previous.submissions.some((item) => item.id === submission.id)
    ) return previous;
    return { ...previous, submissions: [...previous.submissions, submission] };
  }
  if (action.type === "decide") {
    const winner = previous.submissions.find(
      (item) => item.id === action.submissionId && item.catalogId === action.catalogId,
    );
    if (!winner || winner.status === "rejected" || previous.decisions[action.catalogId] === action.submissionId) {
      return previous;
    }
    return {
      ...previous,
      decisions: { ...previous.decisions, [action.catalogId]: action.submissionId },
      submissions: previous.submissions.map((item) => item.catalogId === action.catalogId
        ? { ...item, status: item.id === action.submissionId ? "approved" as const : item.status === "approved" ? "pending" as const : item.status }
        : item),
    };
  }
  if (action.type === "clear") {
    if (!previous.decisions[action.catalogId]) return previous;
    const decisions = { ...previous.decisions };
    delete decisions[action.catalogId];
    return {
      ...previous,
      decisions,
      submissions: previous.submissions.map((item) => item.catalogId === action.catalogId && item.status === "approved"
        ? { ...item, status: "pending" as const }
        : item),
    };
  }
  if (action.type === "reject") {
    const target = previous.submissions.find((item) => item.id === action.submissionId);
    if (!target || previous.decisions[target.catalogId] === target.id) return previous;
    return {
      ...previous,
      submissions: previous.submissions.map((item) => item.id === action.submissionId
        ? { ...item, status: item.status === "rejected" ? "pending" as const : "rejected" as const }
        : item),
    };
  }
  if (action.type === "reset") return previous === EMPTY_GAME ? previous : EMPTY_GAME;
  return previous;
}
