"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, CircleUserRound, Clapperboard, Gamepad2, LogOut, Medal, Plus, ShieldCheck, Trophy } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useGame } from "@/components/game-provider";
import { MissionDialog } from "@/components/mission-dialog";
import { MissionPickerDialog } from "@/components/mission-picker-dialog";
import { Button } from "@/components/ui/button";
import { confirmedCells, countTeamBingos, MISSION_SLOTS, missionForCatalog, missionForSlot, missionOwner, missionSubmissions, TEAM_IDS, TEAMS, type GameState, type Mission, type MissionSlot, type TeamId } from "@/lib/game";
import { cn } from "@/lib/utils";

type View = "game" | "ranking" | "mine";

export function GameScreen() {
  const { state, currentTeam, logout } = useGame();
  const [view, setView] = useState<View>("game");
  const [selected, setSelected] = useState<Mission | null>(null);
  const [editing, setEditing] = useState<MissionSlot | null>(null);
  if (!currentTeam) return null;
  const team = TEAMS[currentTeam];
  const myMissionCount = new Set(state.submissions.filter((item) => item.teamId === currentTeam).map((item) => item.catalogId)).size;
  const myConfirmed = confirmedCells(state, currentTeam);
  const registeredCount = state.missions.filter((mission) => mission.boardTeamId === currentTeam).length;
  const editingMission = editing ? missionForSlot(state, editing.id, currentTeam) : null;

  return (
    <div className="min-h-dvh bg-[#f7f5f0] pb-24 text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#f7f5f0]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5"><BrandMark className="size-9 rounded-[11px]" /><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff5c35]">Bingo Adventure</p><p className="text-sm font-black leading-none">미션 빙고</p></div></div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="관리자 페이지"><Link href="/admin"><ShieldCheck className="size-4" /></Link></Button>
            <button type="button" className="flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-xs font-black shadow-sm" onClick={logout} title="팀 변경"><span className="grid size-7 place-items-center rounded-full text-white" style={{ backgroundColor: team.color }}>{team.id}</span>{team.name}<LogOut className="size-3 text-zinc-400" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-5">
        {view === "game" && <>
          <section className="relative mb-5 overflow-hidden rounded-[24px] bg-zinc-950 p-5 text-white shadow-lg">
            <div className="absolute -right-10 -top-14 size-40 rounded-full opacity-25 blur-2xl" style={{ backgroundColor: team.color }} />
            <div className="relative"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-white/55">{team.name}의 현재 모험</p><h1 className="mt-1 text-2xl font-black tracking-tight">우리 팀만의 빙고 배치</h1></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">LIVE</span></div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[.07] py-3"><Stat value={`${myMissionCount}/18`} label="도전한 칸" /><Stat value={String(myConfirmed)} label="최종 점유" /><Stat value={String(countTeamBingos(state, currentTeam))} label="완성 빙고" /></div>
            </div>
          </section>

          {registeredCount < 18 && <section className="mb-5 rounded-[20px] border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-orange-950">우리 팀 과제 배치 중</p><p className="mt-1 text-xs font-medium leading-5 text-orange-800/70">각 팀은 18개 과제를 서로 다르게 배치해요.<br />수행 결과는 같은 과제가 있는 칸에 반영돼요.</p></div><span className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-black text-[#ff5c35] shadow-sm">{registeredCount}/18</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-200"><div className="h-full rounded-full bg-[#ff5c35] transition-all" style={{ width: `${registeredCount / 18 * 100}%` }} /></div>
          </section>}

          <div className="mb-4 flex items-center justify-between px-1"><div><h2 className="text-lg font-black tracking-tight">오늘의 빙고판</h2><p className="mt-0.5 text-xs font-medium text-zinc-500">빈 칸은 목록에서 선택하고, 채운 칸은 영상으로 도전하세요</p></div><div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400"><span className="size-2 rounded-full bg-[#ff5c35]" /> 최초 제출팀</div></div>
          <Board board={1} boardTeamId={currentTeam} title="BINGO 1" subtitle={`${team.name}의 첫 번째 9개 과제`} state={state} onSelect={setSelected} onFill={setEditing} />
          <Board board={2} boardTeamId={currentTeam} title="BINGO 2" subtitle={`${team.name}의 두 번째 9개 과제`} state={state} onSelect={setSelected} onFill={setEditing} />
        </>}
        {view === "ranking" && <RankingView state={state} currentTeam={currentTeam} />}
        {view === "mine" && <MySubmissions state={state} teamId={currentTeam} onSelect={setSelected} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-4"><NavButton active={view === "game"} icon={Gamepad2} label="빙고판" onClick={() => setView("game")} /><NavButton active={view === "ranking"} icon={BarChart3} label="순위" onClick={() => setView("ranking")} /><NavButton active={view === "mine"} icon={Clapperboard} label="내 영상" onClick={() => setView("mine")} /></div>
      </nav>
      {selected && <MissionDialog mission={selected} open onOpenChange={(open) => !open && setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} />}
      {editing && <MissionPickerDialog slot={editing} mission={editingMission} open onOpenChange={(open) => !open && setEditing(null)} />}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="text-center"><p className="text-xl font-black">{value}</p><p className="mt-0.5 text-[10px] font-bold text-white/45">{label}</p></div>;
}

function Board({ board, boardTeamId, title, subtitle, state, onSelect, onFill }: { board: 1 | 2; boardTeamId: TeamId; title: string; subtitle: string; state: GameState; onSelect: (mission: Mission) => void; onFill: (slot: MissionSlot) => void }) {
  return (
    <section className="mb-5 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_10px_35px_rgba(24,24,27,.05)]">
      <div className="flex items-center justify-between px-1 pb-3 pt-1"><div><p className="text-sm font-black">{title}</p><p className="text-[11px] font-medium text-zinc-400">{subtitle}</p></div><span className="grid size-8 place-items-center rounded-xl bg-zinc-100 text-xs font-black text-zinc-500">{board}/2</span></div>
      <div className="grid grid-cols-3 gap-1.5">
        {MISSION_SLOTS.filter((slot) => slot.board === board).map((slot) => {
          const mission = missionForSlot(state, slot.id, boardTeamId);
          const owner = mission ? missionOwner(state, mission.catalogId) : null;
          const ownerTeam = owner ? TEAMS[owner.teamId] : null;
          const count = mission ? missionSubmissions(state, mission.catalogId).length : 0;
          return <button type="button" key={slot.id} onClick={() => mission ? onSelect(mission) : onFill(slot)} className={cn("relative flex aspect-[.92] min-h-0 flex-col overflow-hidden rounded-xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0", mission ? "items-start justify-between" : "items-center justify-center border-dashed")} style={{ backgroundColor: ownerTeam?.soft ?? (mission ? "#fafafa" : "#ffffff"), borderColor: ownerTeam?.ring ?? (mission ? "#e4e4e7" : "#fdba74") }}>
            {mission ? <>
              <span className="text-lg leading-none">{mission.emoji}</span>
              <span className="relative z-10 line-clamp-2 text-[11px] font-black leading-[1.25] tracking-[-0.02em]">{mission.title}</span>
              {ownerTeam ? <div className="flex w-full items-center justify-between"><span className="rounded-md px-1.5 py-0.5 text-[9px] font-black text-white" style={{ backgroundColor: ownerTeam.color }}>{ownerTeam.name}</span>{owner?.final && <ShieldCheck className="size-3" style={{ color: ownerTeam.color }} />}</div> : <span className="text-[9px] font-bold text-zinc-400">배치 완료</span>}
              {count > 1 && <span className="absolute right-1.5 top-1.5 rounded-full bg-zinc-950 px-1.5 py-0.5 text-[8px] font-black text-white">+{count - 1}</span>}
            </> : <>
              <span className="grid size-8 place-items-center rounded-full bg-orange-50 text-[#ff5c35]"><Plus className="size-4" strokeWidth={3} /></span>
              <span className="mt-2 text-[11px] font-black text-[#ff5c35]">과제 채우기</span>
              <span className="mt-1 text-[8px] font-bold text-zinc-300">MISSION {String(slot.number).padStart(2, "0")}</span>
            </>}
          </button>;
        })}
      </div>
    </section>
  );
}

function RankingView({ state, currentTeam }: { state: GameState; currentTeam: TeamId }) {
  const ranking = useMemo(() => TEAM_IDS.map((teamId) => ({ teamId, bingo: countTeamBingos(state, teamId), cells: confirmedCells(state, teamId) })).sort((a, b) => b.bingo - a.bingo || b.cells - a.cells), [state]);
  return <section><div className="mb-5 rounded-[24px] bg-gradient-to-br from-[#ff5c35] to-[#ff815f] p-5 text-white shadow-lg"><Trophy className="mb-4 size-8" /><h1 className="text-2xl font-black tracking-tight">실시간 최종 순위</h1><p className="mt-1 text-sm font-medium text-white/70">관리자가 확정한 칸과 완성 빙고 기준이에요.</p></div>
    <div className="space-y-2.5">{ranking.map((item, index) => { const team = TEAMS[item.teamId]; return <div key={item.teamId} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-4", item.teamId === currentTeam && "ring-2 ring-offset-2")} style={{ borderColor: team.ring, "--tw-ring-color": team.color } as React.CSSProperties}><span className="w-7 text-center text-lg font-black text-zinc-300">{index + 1}</span><span className="grid size-10 place-items-center rounded-full font-black text-white" style={{ backgroundColor: team.color }}>{team.id}</span><div className="flex-1"><p className="font-black">{team.name}{item.teamId === currentTeam && <span className="ml-1 text-[10px] font-bold text-zinc-400">MY</span>}</p><p className="text-xs text-zinc-400">확정 {item.cells}칸</p></div><div className="text-right"><p className="text-xl font-black" style={{ color: team.color }}>{item.bingo}</p><p className="text-[10px] font-bold text-zinc-400">BINGO</p></div></div>; })}</div>
  </section>;
}

function MySubmissions({ state, teamId, onSelect }: { state: GameState; teamId: TeamId; onSelect: (mission: Mission) => void }) {
  const mine = state.submissions.filter((item) => item.teamId === teamId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <section><div className="mb-5"><p className="text-xs font-black text-[#ff5c35]">MY ADVENTURE</p><h1 className="mt-1 text-2xl font-black tracking-tight">우리 팀의 영상</h1><p className="mt-1 text-sm text-zinc-500">총 {mine.length}번의 도전이 있어요.</p></div>
    {mine.length ? <div className="space-y-2.5">{mine.map((item) => { const mission = missionForCatalog(state, item.catalogId, teamId); if (!mission) return null; const final = state.decisions[item.catalogId] === item.id; return <button key={item.id} onClick={() => onSelect(mission)} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition hover:shadow-md"><video src={item.videoUrl} muted playsInline preload="metadata" className="size-16 rounded-xl bg-zinc-950 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{mission.title}</p><p className={cn("mt-1 text-xs font-bold", final ? "text-emerald-600" : item.status === "rejected" ? "text-red-500" : "text-amber-600")}>{final ? "최종 점유 성공" : item.status === "rejected" ? "미션 부적합" : "검토 대기 중"}</p></div><ChevronRight className="size-4 text-zinc-300" /></button>; })}</div>
    : <div className="grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-white text-center"><div><CircleUserRound className="mx-auto mb-3 size-9 text-zinc-300" /><p className="font-black">아직 제출한 영상이 없어요</p><p className="mt-1 text-xs text-zinc-400">빙고판에서 첫 도전을 시작해 보세요.</p></div></div>}
  </section>;
}

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Medal; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-black transition", active ? "text-[#ff5c35]" : "text-zinc-400")}><Icon className="size-5" strokeWidth={active ? 2.7 : 2} />{label}</button>;
}
