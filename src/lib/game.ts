export type TeamId = "A" | "B" | "C" | "D";

export type Team = {
  id: TeamId;
  name: string;
  color: string;
  soft: string;
  ring: string;
};

export type MissionSlot = {
  id: string;
  board: 1 | 2;
  number: number;
};

export type CatalogMission = {
  id: string;
  number: number;
  title: string;
  description: string;
  emoji: string;
  referenceUrl?: string;
};

export type Mission = MissionSlot & {
  boardTeamId: TeamId;
  catalogId: string;
  title: string;
  description: string;
  emoji: string;
  referenceUrl?: string;
  createdAt: string;
};

export type SubmissionStatus = "pending" | "rejected" | "approved";

export type Submission = {
  id: string;
  catalogId: string;
  teamId: TeamId;
  videoUrl: string;
  createdAt: string;
  status: SubmissionStatus;
};

export type GameState = {
  version: 4;
  missions: Mission[];
  submissions: Submission[];
  decisions: Record<string, string>;
};

export const TEAMS: Record<TeamId, Team> = {
  A: { id: "A", name: "A팀", color: "#ff5c35", soft: "#fff0eb", ring: "#ffb9a7" },
  B: { id: "B", name: "B팀", color: "#6d5dfc", soft: "#f0eeff", ring: "#c8c2ff" },
  C: { id: "C", name: "C팀", color: "#12a878", soft: "#e7f8f2", ring: "#99dec8" },
  D: { id: "D", name: "D팀", color: "#f2a900", soft: "#fff7df", ring: "#f8d77d" },
};

export const TEAM_IDS = Object.keys(TEAMS) as TeamId[];

export const MISSION_SLOTS: MissionSlot[] = Array.from({ length: 18 }, (_, index) => ({
  id: `b${index < 9 ? 1 : 2}-${(index % 9) + 1}`,
  board: index < 9 ? 1 : 2,
  number: index + 1,
}));

export const MISSION_CATALOG: CatalogMission[] = [
  { id: "task-01", number: 1, title: "어드벤처 1층 놀이기구", description: "어드벤처 1층에서 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🎢" },
  { id: "task-02", number: 2, title: "어드벤처 2·3층 놀이기구", description: "어드벤처 2층 또는 3층에서 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🎠" },
  { id: "task-03", number: 3, title: "어드벤처 4층 놀이기구", description: "어드벤처 4층에서 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🚀" },
  { id: "task-04", number: 4, title: "매직아일랜드 놀이기구", description: "매직아일랜드에서 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🏰" },
  { id: "task-05", number: 5, title: "언더랜드 놀이기구", description: "언더랜드에서 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🦇" },
  { id: "task-06", number: 6, title: "자유 놀이기구 탑승", description: "장소와 종류에 관계없이 팀원 3명 이상이 놀이기구 하나를 타고 인증 영상을 촬영하세요.", emoji: "🎡" },
  { id: "task-07", number: 7, title: "스산한 기와집", description: "어드벤처 1층 만남의 광장에 있는 스산한 기와집 앞에서 인증 영상을 촬영하세요.", emoji: "🏚️" },
  { id: "task-08", number: 8, title: "핫! 썸머! 바캉스", description: "오후 3시 30분 거리공연을 보고 팀 전원이 함께 나오는 인증 영상을 촬영하세요.", emoji: "🌴" },
  { id: "task-09", number: 9, title: "공포체험 하나 타기", description: "팀원 3명 이상이 귀담 또는 마도신당 중 하나를 체험하고 인증 영상을 촬영하세요.", emoji: "👻" },
  { id: "task-10", number: 10, title: "FREE", description: "자유롭게 정한 장면을 팀 영상으로 촬영해 제출하세요.", emoji: "⭐" },
  { id: "task-11", number: 11, title: "팀 구호 10초 영상", description: "팀원들이 함께 팀 구호를 외치는 모습을 10초 영상으로 촬영하세요.", emoji: "🎬" },
  { id: "task-12", number: 12, title: "요괴대소동 요괴와 기념촬영", description: "요괴대소동에 등장하는 요괴와 함께 인증 영상을 촬영하세요.", emoji: "👺", referenceUrl: "https://adventure.lotteworld.com/enjoy/festival/view" },
  { id: "task-13", number: 13, title: "팀원 모두 같은 포즈", description: "팀원 모두가 똑같은 포즈를 취한 인증 영상을 촬영하세요.", emoji: "🙆" },
  { id: "task-14", number: 14, title: "로티·로리와 사진", description: "롯데월드 캐릭터 또는 마스코트 로티·로리와 함께 인증 영상을 촬영하세요.", emoji: "🐻" },
  { id: "task-15", number: 15, title: "다른 팀과 합동사진", description: "다른 참가 팀을 만나 두 팀이 함께 나오는 인증 영상을 촬영하세요.", emoji: "🤝" },
  { id: "task-16", number: 16, title: "초승나루", description: "매직아일랜드 메인브릿지의 초승나루 앞에서 인증 영상을 촬영하세요.", emoji: "🌙" },
  { id: "task-17", number: 17, title: "금기의 항아리", description: "어드벤처 1층 더 라이트 오브 더 하트 앞, 금기의 항아리 앞에서 인증 영상을 촬영하세요.", emoji: "🏺" },
  { id: "task-18", number: 18, title: "장산범 계곡", description: "어드벤처 1층 로디스엠포리움 옆, 장산범 계곡 앞에서 인증 영상을 촬영하세요.", emoji: "🐯" },
];

export const EMPTY_GAME: GameState = { version: 4, missions: [], submissions: [], decisions: {} };

export const BINGO_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function missionForSlot(state: GameState, slotId: string, boardTeamId: TeamId) {
  return state.missions.find((mission) => mission.id === slotId && mission.boardTeamId === boardTeamId) ?? null;
}

export function missionForCatalog(state: GameState, catalogId: string, boardTeamId: TeamId) {
  return state.missions.find((mission) => mission.catalogId === catalogId && mission.boardTeamId === boardTeamId) ?? null;
}

export function missionSubmissions(state: GameState, catalogId: string) {
  return state.submissions
    .filter((item) => item.catalogId === catalogId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function missionOwner(state: GameState, catalogId: string) {
  const chosenId = state.decisions[catalogId];
  if (chosenId) {
    const selected = state.submissions.find((item) => item.id === chosenId);
    if (selected) return { teamId: selected.teamId, final: true, submission: selected };
  }
  const first = missionSubmissions(state, catalogId).find((item) => item.status !== "rejected");
  return first ? { teamId: first.teamId, final: false, submission: first } : null;
}

export function countTeamBingos(state: GameState, teamId: TeamId) {
  let count = 0;
  for (const board of [1, 2] as const) {
    const cells = MISSION_SLOTS.filter((slot) => slot.board === board).map((slot) => {
      const mission = missionForSlot(state, slot.id, teamId);
      const chosenId = mission ? state.decisions[mission.catalogId] : undefined;
      return chosenId
        ? state.submissions.find((item) => item.id === chosenId)?.teamId ?? null
        : null;
    });
    count += BINGO_LINES.filter((line) => line.every((index) => cells[index] === teamId)).length;
  }
  return count;
}

export function confirmedCells(state: GameState, teamId: TeamId) {
  return Object.values(state.decisions).filter(
    (submissionId) => state.submissions.find((item) => item.id === submissionId)?.teamId === teamId,
  ).length;
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
