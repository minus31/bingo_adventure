import "server-only";

import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  countTeamBingos,
  EMPTY_GAME,
  missionOwner,
  TEAM_IDS,
  TEAMS,
  type GameState,
  type TeamId,
} from "@/lib/game";
import { applyGameAction, normalizeGameAction, type GameAction } from "@/lib/game-actions";
import { BLOB_STORAGE_ENABLED, blobDatePrefix, DATA_DIRECTORY, koreaDate, UPLOAD_DIRECTORY } from "@/lib/server-paths";

const DATA_FILE = path.join(DATA_DIRECTORY, "game-state.json");
const TEMP_FILE = path.join(DATA_DIRECTORY, "game-state.tmp.json");
const TEAM_DIRECTORY = path.join(DATA_DIRECTORY, "teams");
let mutationQueue = Promise.resolve();

type ProgressMutation =
  | { type: "mission_saved"; boardTeamId: TeamId; catalogId: string; slotId: string }
  | { type: "video_submitted"; catalogId: string; submissionId: string; teamId: TeamId }
  | { type: "winner_decided"; catalogId: string; submissionId: string }
  | { type: "decision_cleared"; catalogId: string }
  | { type: "submission_toggled"; submissionId: string }
  | { type: "reset" };

type ActivityLogEntry = {
  id: string;
  at: string;
  type: "board_completed" | "board_updated" | "video_submitted" | "winner_decided" | "decision_cleared" | "submission_rejected" | "submission_restored";
  teamId?: TeamId;
  catalogId?: string;
  submissionId?: string;
  slotId?: string;
};

type TeamProgressFile = {
  schemaVersion: 1;
  revision: number;
  team: { id: TeamId; name: string };
  boardCompletedAt: string;
  updatedAt: string;
  summary: {
    placedTasks: number;
    submittedTasks: number;
    leadingTasks: number;
    confirmedTasks: number;
    bingoCount: number;
  };
  cells: Array<{
    slotId: string;
    board: 1 | 2;
    position: number;
    task: {
      id: string;
      title: string;
      description: string;
      emoji: string;
      referenceUrl?: string;
    };
    progress: {
      status: "open" | "submitted" | "confirmed";
      leadingTeamId: TeamId | null;
      totalSubmissions: number;
      submissionsByTeam: Record<TeamId, number>;
      thisTeamSubmitted: boolean;
    };
  }>;
  activityLog: ActivityLogEntry[];
};

type BlobGameEvent = {
  schemaVersion: 1;
  id: string;
  at: string;
  pathname: string;
  action: GameAction;
};

type BlobSnapshot = {
  schemaVersion: 1;
  date: string;
  revision: number;
  eventPathnames: string[];
  updatedAt: string;
  state: GameState;
};

function isGameState(value: Partial<GameState>): value is GameState {
  return value.version === 4
    && Array.isArray(value.missions)
    && Array.isArray(value.submissions)
    && Boolean(value.decisions)
    && typeof value.decisions === "object";
}

function progressMutationFor(action: GameAction): ProgressMutation {
  if (action.type === "save-mission") {
    return {
      type: "mission_saved",
      boardTeamId: action.mission.boardTeamId,
      catalogId: action.mission.catalogId,
      slotId: action.mission.id,
    };
  }
  if (action.type === "submit") {
    return {
      type: "video_submitted",
      catalogId: action.submission.catalogId,
      submissionId: action.submission.id,
      teamId: action.submission.teamId,
    };
  }
  if (action.type === "decide") return { type: "winner_decided", catalogId: action.catalogId, submissionId: action.submissionId };
  if (action.type === "clear") return { type: "decision_cleared", catalogId: action.catalogId };
  if (action.type === "reject") return { type: "submission_toggled", submissionId: action.submissionId };
  return { type: "reset" };
}

function makeLogEntry(
  state: GameState,
  mutation: ProgressMutation,
  at: string,
  id = crypto.randomUUID(),
): ActivityLogEntry | null {
  const base = { id, at };
  if (mutation.type === "mission_saved") {
    return { ...base, type: "board_updated", teamId: mutation.boardTeamId, catalogId: mutation.catalogId, slotId: mutation.slotId };
  }
  if (mutation.type === "video_submitted") {
    return { ...base, type: "video_submitted", teamId: mutation.teamId, catalogId: mutation.catalogId, submissionId: mutation.submissionId };
  }
  if (mutation.type === "winner_decided") {
    const winner = state.submissions.find((item) => item.id === mutation.submissionId);
    return { ...base, type: "winner_decided", teamId: winner?.teamId, catalogId: mutation.catalogId, submissionId: mutation.submissionId };
  }
  if (mutation.type === "decision_cleared") {
    return { ...base, type: "decision_cleared", catalogId: mutation.catalogId };
  }
  if (mutation.type === "submission_toggled") {
    const submission = state.submissions.find((item) => item.id === mutation.submissionId);
    if (!submission) return null;
    return {
      ...base,
      type: submission.status === "rejected" ? "submission_rejected" : "submission_restored",
      teamId: submission.teamId,
      catalogId: submission.catalogId,
      submissionId: submission.id,
    };
  }
  return null;
}

function completedAtForTeam(state: GameState, teamId: TeamId, fallback: string) {
  const times = state.missions
    .filter((mission) => mission.boardTeamId === teamId)
    .map((mission) => mission.createdAt)
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort();
  return times.at(-1) ?? fallback;
}

function buildTeamProgress(
  state: GameState,
  teamId: TeamId,
  activityLog: ActivityLogEntry[],
  updatedAt: string,
  boardCompletedAt: string,
  revision: number,
): TeamProgressFile {
  const placements = state.missions
    .filter((mission) => mission.boardTeamId === teamId)
    .sort((a, b) => a.number - b.number);
  const submittedTasks = new Set(
    state.submissions.filter((submission) => submission.teamId === teamId).map((submission) => submission.catalogId),
  ).size;
  const leadingTasks = placements.filter((mission) => missionOwner(state, mission.catalogId)?.teamId === teamId).length;
  const confirmedTasks = placements.filter((mission) => {
    const owner = missionOwner(state, mission.catalogId);
    return owner?.teamId === teamId && owner.final;
  }).length;

  return {
    schemaVersion: 1,
    revision,
    team: { id: teamId, name: TEAMS[teamId].name },
    boardCompletedAt,
    updatedAt,
    summary: {
      placedTasks: placements.length,
      submittedTasks,
      leadingTasks,
      confirmedTasks,
      bingoCount: countTeamBingos(state, teamId),
    },
    cells: placements.map((mission) => {
      const submissions = state.submissions.filter((submission) => submission.catalogId === mission.catalogId);
      const owner = missionOwner(state, mission.catalogId);
      const submissionsByTeam = Object.fromEntries(
        TEAM_IDS.map((candidate) => [candidate, submissions.filter((submission) => submission.teamId === candidate).length]),
      ) as Record<TeamId, number>;
      return {
        slotId: mission.id,
        board: mission.board,
        position: mission.number,
        task: {
          id: mission.catalogId,
          title: mission.title,
          description: mission.description,
          emoji: mission.emoji,
          referenceUrl: mission.referenceUrl,
        },
        progress: {
          status: owner ? owner.final ? "confirmed" : "submitted" : "open",
          leadingTeamId: owner?.teamId ?? null,
          totalSubmissions: submissions.length,
          submissionsByTeam,
          thisTeamSubmitted: submissionsByTeam[teamId] > 0,
        },
      };
    }),
    activityLog,
  };
}

async function readLocalGameState(): Promise<GameState> {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8")) as Partial<GameState>;
    return isGameState(parsed) ? parsed : EMPTY_GAME;
  } catch {
    return EMPTY_GAME;
  }
}

async function writeLocalGameState(state: GameState) {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  await writeFile(TEMP_FILE, JSON.stringify(state), "utf8");
  await rename(TEMP_FILE, DATA_FILE);
}

function localTeamFile(teamId: TeamId) {
  return path.join(TEAM_DIRECTORY, `team-${teamId}.json`);
}

async function readLocalTeamProgress(teamId: TeamId): Promise<TeamProgressFile | null> {
  try {
    const parsed = JSON.parse(await readFile(localTeamFile(teamId), "utf8")) as TeamProgressFile;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.activityLog)) return null;
    return { ...parsed, revision: parsed.revision ?? 0 };
  } catch {
    return null;
  }
}

async function writeLocalTeamProgress(progress: TeamProgressFile) {
  await mkdir(TEAM_DIRECTORY, { recursive: true });
  const destination = localTeamFile(progress.team.id);
  const temporary = path.join(TEAM_DIRECTORY, `team-${progress.team.id}.tmp.json`);
  await writeFile(temporary, JSON.stringify(progress, null, 2), "utf8");
  await rename(temporary, destination);
}

async function clearLocalTeamProgressFiles() {
  await Promise.all(TEAM_IDS.map(async (teamId) => {
    try {
      await unlink(localTeamFile(teamId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }));
}

async function syncLocalTeamProgressFiles(
  previousState: GameState,
  state: GameState,
  mutation: ProgressMutation,
) {
  if (mutation.type === "reset") {
    await Promise.all([
      clearLocalTeamProgressFiles(),
      rm(UPLOAD_DIRECTORY, { recursive: true, force: true }),
    ]);
    return;
  }

  const updatedAt = new Date().toISOString();
  const isGlobalProgressMutation = mutation.type !== "mission_saved";
  await Promise.all(TEAM_IDS.map(async (teamId) => {
    const previousCount = previousState.missions.filter((mission) => mission.boardTeamId === teamId).length;
    const currentCount = state.missions.filter((mission) => mission.boardTeamId === teamId).length;
    if (currentCount !== 18) return;

    const existing = await readLocalTeamProgress(teamId);
    const justCompleted = previousCount < 18 || !existing;
    const boardChanged = mutation.type === "mission_saved" && mutation.boardTeamId === teamId;
    if (!justCompleted && !boardChanged && !isGlobalProgressMutation) return;

    const entries = existing?.activityLog ? [...existing.activityLog] : [];
    if (justCompleted) {
      entries.push({ id: crypto.randomUUID(), at: updatedAt, type: "board_completed", teamId });
    }
    const mutationEntry = makeLogEntry(state, mutation, updatedAt);
    if (mutationEntry && (!justCompleted || mutation.type !== "mission_saved")) entries.push(mutationEntry);
    await writeLocalTeamProgress(buildTeamProgress(
      state,
      teamId,
      entries,
      updatedAt,
      existing?.boardCompletedAt ?? completedAtForTeam(state, teamId, updatedAt),
      (existing?.revision ?? 0) + 1,
    ));
  }));
}

function blobSnapshotPrefix() {
  return `${blobDatePrefix()}/snapshots/`;
}

function blobSnapshotPath(events: BlobGameEvent[]) {
  const revision = String(events.length).padStart(10, "0");
  const lastEventId = events.at(-1)?.id ?? "initial";
  return `${blobSnapshotPrefix()}${revision}-${lastEventId}.json`;
}

function blobTeamPath(teamId: TeamId) {
  return `${blobDatePrefix()}/teams/team-${teamId}.json`;
}

function blobEventPrefix() {
  return `${blobDatePrefix()}/events/`;
}

function blobVideoPrefix() {
  return `${blobDatePrefix()}/videos/`;
}

async function jsonFromBlob<T>(pathname: string): Promise<{ value: T; etag: string } | null> {
  const result = await get(pathname, { access: "public", useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const value = await new Response(result.stream).json() as T;
  return { value, etag: result.blob.etag };
}

async function readBlobSnapshot(): Promise<BlobSnapshot | null> {
  try {
    const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: blobSnapshotPrefix(), cursor, limit: 1000 });
      blobs.push(...page.blobs.filter((blob) => /\/\d{10}-(?:initial|[a-f0-9-]+)\.json$/.test(blob.pathname)));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const latest = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname)).at(-1);
    if (!latest) return null;
    const result = await jsonFromBlob<BlobSnapshot>(latest.pathname);
    if (
      !result
      || result.value.schemaVersion !== 1
      || result.value.date !== koreaDate()
      || !Array.isArray(result.value.eventPathnames)
      || !isGameState(result.value.state)
    ) return null;
    return result.value;
  } catch {
    return null;
  }
}

async function listAllEventBlobs() {
  const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix: blobEventPrefix(), cursor, limit: 1000 });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

async function readBlobEvents(): Promise<BlobGameEvent[]> {
  const blobs = await listAllEventBlobs();
  const events = await Promise.all(blobs.map(async (blob) => {
    try {
      const result = await jsonFromBlob<Omit<BlobGameEvent, "pathname">>(blob.pathname);
      if (!result || result.value.schemaVersion !== 1 || typeof result.value.id !== "string") return null;
      const action = normalizeGameAction(result.value.action, result.value.at);
      if (!action || Number.isNaN(Date.parse(result.value.at))) return null;
      return { ...result.value, pathname: blob.pathname, action } satisfies BlobGameEvent;
    } catch {
      return null;
    }
  }));
  return events.filter((event): event is BlobGameEvent => Boolean(event));
}

function replayEvents(events: BlobGameEvent[]) {
  return events.reduce((state, event) => applyGameAction(state, event.action), EMPTY_GAME as GameState);
}

async function writeBlobSnapshot(): Promise<{ snapshot: BlobSnapshot; events: BlobGameEvent[] }> {
  const events = await readBlobEvents();
  const snapshot: BlobSnapshot = {
    schemaVersion: 1,
    date: koreaDate(),
    revision: events.length,
    eventPathnames: events.map((event) => event.pathname),
    updatedAt: events.at(-1)?.at ?? new Date().toISOString(),
    state: replayEvents(events),
  };
  const pathname = blobSnapshotPath(events);
  if (await jsonFromBlob<BlobSnapshot>(pathname)) return { snapshot, events };
  try {
    await put(pathname, JSON.stringify(snapshot), {
      access: "public",
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 31536000,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  } catch (error) {
    if (!await jsonFromBlob<BlobSnapshot>(pathname)) throw error;
  }
  return { snapshot, events };
}

function deriveTeamProgress(
  events: BlobGameEvent[],
  finalState: GameState,
  teamId: TeamId,
): TeamProgressFile | null {
  let replayed: GameState = EMPTY_GAME;
  let boardCompletedAt: string | null = null;
  let activityLog: ActivityLogEntry[] = [];

  for (const event of events) {
    if (event.action.type === "reset") {
      replayed = applyGameAction(replayed, event.action);
      boardCompletedAt = null;
      activityLog = [];
      continue;
    }
    const previous = replayed;
    replayed = applyGameAction(replayed, event.action);
    if (replayed === previous) continue;

    const previousCount = previous.missions.filter((mission) => mission.boardTeamId === teamId).length;
    const currentCount = replayed.missions.filter((mission) => mission.boardTeamId === teamId).length;
    const justCompleted = previousCount < 18 && currentCount === 18;
    if (justCompleted) {
      boardCompletedAt = event.at;
      activityLog.push({ id: `${event.id}:board`, at: event.at, type: "board_completed", teamId });
    }
    if (currentCount !== 18) continue;

    const mutation = progressMutationFor(event.action);
    const belongsToTeam = mutation.type !== "mission_saved" || mutation.boardTeamId === teamId;
    if (!belongsToTeam || (justCompleted && mutation.type === "mission_saved")) continue;
    const entry = makeLogEntry(replayed, mutation, event.at, `${event.id}:activity`);
    if (entry) activityLog.push(entry);
  }

  if (finalState.missions.filter((mission) => mission.boardTeamId === teamId).length !== 18) return null;
  const updatedAt = events.at(-1)?.at ?? new Date().toISOString();
  return buildTeamProgress(
    finalState,
    teamId,
    activityLog,
    updatedAt,
    boardCompletedAt ?? completedAtForTeam(finalState, teamId, updatedAt),
    events.length,
  );
}

async function writeBlobTeamProgress(progress: TeamProgressFile) {
  const pathname = blobTeamPath(progress.team.id);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let current: { value: TeamProgressFile; etag: string } | null = null;
    try {
      current = await jsonFromBlob<TeamProgressFile>(pathname);
    } catch {
      current = null;
    }
    if ((current?.value.revision ?? -1) >= progress.revision) return;
    try {
      await put(pathname, JSON.stringify(progress, null, 2), {
        access: "public",
        contentType: "application/json; charset=utf-8",
        cacheControlMaxAge: 60,
        addRandomSuffix: false,
        allowOverwrite: Boolean(current),
        ...(current ? { ifMatch: current.etag } : {}),
      });
      return;
    } catch (error) {
      const latest = await jsonFromBlob<TeamProgressFile>(pathname);
      const changedByAnotherRequest = current
        ? latest?.etag !== current.etag
        : Boolean(latest);
      if (!changedByAnotherRequest || attempt === 3) throw error;
    }
  }
}

async function syncBlobTeamProgressFiles(events: BlobGameEvent[], state: GameState) {
  const incompleteTeamPaths: string[] = [];
  const hasResetEvent = events.some((event) => event.action.type === "reset");
  await Promise.all(TEAM_IDS.map(async (teamId) => {
    const progress = deriveTeamProgress(events, state, teamId);
    if (progress) {
      await writeBlobTeamProgress(progress);
    } else if (hasResetEvent) {
      incompleteTeamPaths.push(blobTeamPath(teamId));
    }
  }));
  if (incompleteTeamPaths.length > 0) await del(incompleteTeamPaths);
}

async function clearBlobVideos() {
  const videoPathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: blobVideoPrefix(), cursor, limit: 1000 });
    videoPathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (videoPathnames.length > 0) await del(videoPathnames);
}

async function readBlobGameState(): Promise<GameState> {
  const current = await readBlobSnapshot();
  if (current) return current.state;
  const recovered = await writeBlobSnapshot();
  await syncBlobTeamProgressFiles(recovered.events, recovered.snapshot.state);
  return recovered.snapshot.state;
}

async function appendBlobEvent(action: GameAction) {
  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const order = String(Date.now()).padStart(13, "0");
  const pathname = `${blobEventPrefix()}${order}-${id}.json`;
  const event = { schemaVersion: 1, id, at, action } as const;
  await put(pathname, JSON.stringify(event), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    cacheControlMaxAge: 31536000,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
}

async function updateBlobGameState(action: GameAction): Promise<GameState> {
  const current = await readBlobGameState();
  if (applyGameAction(current, action) === current && action.type !== "reset") return current;
  await appendBlobEvent(action);
  const result = await writeBlobSnapshot();
  await syncBlobTeamProgressFiles(result.events, result.snapshot.state);
  if (action.type === "reset") await clearBlobVideos();
  return result.snapshot.state;
}

export async function readGameState(): Promise<GameState> {
  return BLOB_STORAGE_ENABLED ? readBlobGameState() : readLocalGameState();
}

export function updateGameState(action: GameAction): Promise<GameState> {
  if (BLOB_STORAGE_ENABLED) return updateBlobGameState(action);

  const operation = mutationQueue.then(async () => {
    const previous = await readLocalGameState();
    const next = applyGameAction(previous, action);
    if (next === previous && action.type !== "reset") return previous;
    await writeLocalGameState(next);
    await syncLocalTeamProgressFiles(previous, next, progressMutationFor(action));
    return next;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
