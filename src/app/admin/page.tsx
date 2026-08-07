"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, CircleAlert, Clock3, Eye, Filter, KeyRound, LayoutDashboard, LockKeyhole, Medal, RotateCcw, ShieldCheck, Trophy, UsersRound, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useGame } from "@/components/game-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirmedCells, countTeamBingos, formatTime, MISSION_CATALOG, missionSubmissions, TEAM_IDS, TEAMS, type CatalogMission } from "@/lib/game";
import { cn } from "@/lib/utils";

type FilterType = "all" | "waiting" | "confirmed";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const hydrate = window.setTimeout(() => setAuthenticated(window.sessionStorage.getItem("bingo-admin") === "yes"), 0);
    return () => window.clearTimeout(hydrate);
  }, []);
  return authenticated ? <AdminDashboard onLock={() => { window.sessionStorage.removeItem("bingo-admin"); setAuthenticated(false); }} /> : <AdminLogin onSuccess={() => setAuthenticated(true)} />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin === "2026") { window.sessionStorage.setItem("bingo-admin", "yes"); onSuccess(); }
    else { setError(true); setPin(""); }
  };
  return <main className="grid min-h-dvh place-items-center bg-[#f7f5f0] p-5">
    <div className="w-full max-w-sm rounded-[28px] border bg-white p-6 shadow-[0_24px_80px_rgba(24,24,27,.1)]">
      <div className="mb-7 flex items-center justify-between"><BrandMark /><Button asChild variant="ghost" size="sm"><Link href="/"><ArrowLeft className="size-4" /> 게임으로</Link></Button></div>
      <div className="mb-6"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-orange-50 text-[#ff5c35]"><LockKeyhole className="size-5" /></div><h1 className="text-2xl font-black tracking-tight">관리자 로그인</h1><p className="mt-2 text-sm leading-6 text-zinc-500">제출 영상 검토와 최종 점유자 선정을 위해<br />관리자 PIN을 입력해 주세요.</p></div>
      <form onSubmit={submit}>
        <label className="mb-2 block text-xs font-black text-zinc-600">관리자 PIN</label>
        <div className={cn("flex h-13 items-center gap-3 rounded-xl border bg-zinc-50 px-4 focus-within:ring-2 focus-within:ring-orange-400", error && "border-red-300 bg-red-50")}><KeyRound className="size-4 text-zinc-400" /><input autoFocus inputMode="numeric" maxLength={4} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "")); setError(false); }} className="min-w-0 flex-1 bg-transparent text-lg font-black tracking-[.4em] outline-none" placeholder="••••" /></div>
        {error && <p className="mt-2 text-xs font-bold text-red-500">PIN이 올바르지 않습니다.</p>}
        <Button variant="primary" size="lg" className="mt-4 w-full" disabled={pin.length !== 4}>관리자 화면 열기</Button>
      </form>
      <p className="mt-5 text-center text-[11px] text-zinc-400">테스트 PIN · <span className="font-black text-zinc-600">2026</span></p>
    </div>
  </main>;
}

function AdminDashboard({ onLock }: { onLock: () => void }) {
  const { state, resetGame } = useGame();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selected, setSelected] = useState<CatalogMission | null>(null);
  const submittedMissions = new Set(state.submissions.map((item) => item.catalogId)).size;
  const registeredMissions = state.missions.length;
  const confirmed = Object.keys(state.decisions).length;
  const rejected = state.submissions.filter((item) => item.status === "rejected").length;
  const visible = MISSION_CATALOG
    .filter((mission) => filter === "all" || (filter === "confirmed" ? Boolean(state.decisions[mission.id]) : missionSubmissions(state, mission.id).length > 0 && !state.decisions[mission.id]))
    .sort((a, b) => a.number - b.number);
  const ranking = useMemo(() => TEAM_IDS.map((teamId) => ({ teamId, bingo: countTeamBingos(state, teamId), cells: confirmedCells(state, teamId) })).sort((a, b) => b.bingo - a.bingo || b.cells - a.cells), [state]);

  const reset = () => {
    if (window.confirm("배치한 과제, 제출 영상, 판정 결과를 모두 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) resetGame();
  };

  return <div className="min-h-dvh bg-[#f6f7f9] text-zinc-950">
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><BrandMark className="size-9" /><div><p className="text-sm font-black">Bingo Adventure</p><p className="text-[10px] font-bold text-zinc-400">ADMIN CONSOLE</p></div></div><div className="flex items-center gap-1"><Button asChild variant="ghost" size="sm"><Link href="/"><ArrowLeft className="size-4" /> 게임 화면</Link></Button><Button variant="ghost" size="sm" onClick={onLock}><LockKeyhole className="size-4" /><span className="hidden sm:inline">잠금</span></Button></div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-end justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-black text-[#ff5c35]"><LayoutDashboard className="size-4" /> DASHBOARD</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">게임 운영 현황</h1><p className="mt-1 text-sm text-zinc-500">제출된 인증 자료를 검토하고 최종 점유팀을 확정하세요.</p></div><Button variant="outline" size="sm" onClick={reset} className="text-red-500"><RotateCcw className="size-3.5" /><span className="hidden sm:inline">전체 초기화</span></Button></div>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={UsersRound} value={String(state.submissions.length)} label="전체 제출" sub={`부적합 ${rejected}건`} color="#6d5dfc" />
        <SummaryCard icon={Eye} value={`${registeredMissions}/72`} label="팀별 과제 배치" sub={`완료 ${TEAM_IDS.filter((teamId) => state.missions.filter((mission) => mission.boardTeamId === teamId).length === 18).length}팀`} color="#f2a900" />
        <SummaryCard icon={ShieldCheck} value={`${confirmed}/18`} label="최종 확정" sub={`검토 필요 ${submittedMissions - confirmed}개`} color="#12a878" />
        <SummaryCard icon={Trophy} value={String(ranking[0]?.bingo ?? 0)} label="최고 빙고" sub={ranking[0] ? `${TEAMS[ranking[0].teamId].name} 선두` : "아직 집계 전"} color="#ff5c35" />
      </section>

      <section className="mb-6 rounded-[22px] border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black">최종 순위</h2><p className="text-xs text-zinc-400">빙고 수 우선, 확정 칸 수 차순</p></div><Medal className="size-5 text-amber-500" /></div>
        <div className="grid gap-2 sm:grid-cols-4">{ranking.map((item, index) => { const team = TEAMS[item.teamId]; return <div key={item.teamId} className="flex items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: team.soft, borderColor: team.ring }}><span className="text-sm font-black text-zinc-400">{index + 1}</span><span className="grid size-8 place-items-center rounded-full text-xs font-black text-white" style={{ backgroundColor: team.color }}>{team.id}</span><div className="flex-1"><p className="text-sm font-black">{team.name}</p><p className="text-[10px] text-zinc-500">{item.cells}칸 확정</p></div><div className="text-right"><p className="font-black" style={{ color: team.color }}>{item.bingo}</p><p className="text-[8px] font-black text-zinc-400">BINGO</p></div></div>; })}</div>
      </section>

      <section className="rounded-[22px] border bg-white shadow-sm">
        <div className="border-b p-4 sm:flex sm:items-center sm:justify-between sm:p-5"><div><h2 className="font-black">미션별 제출 검토</h2><p className="mt-0.5 text-xs text-zinc-400">미션을 선택해 인증 자료를 제출 시간순으로 검토하세요.</p></div><div className="mt-3 flex gap-1 rounded-xl bg-zinc-100 p-1 sm:mt-0"><Filter className="ml-2 mr-1 size-3.5 self-center text-zinc-400" />{(["all", "waiting", "confirmed"] as FilterType[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("rounded-lg px-3 py-1.5 text-[11px] font-black", filter === item ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-400")}>{item === "all" ? "전체" : item === "waiting" ? "검토 대기" : "확정"}</button>)}</div></div>
        <div className="divide-y">{visible.map((mission) => {
          const submissions = missionSubmissions(state, mission.id); const decision = state.decisions[mission.id]; const winner = decision ? state.submissions.find((item) => item.id === decision) : null;
          const placedTeams = new Set(state.missions.filter((item) => item.catalogId === mission.id).map((item) => item.boardTeamId)).size;
          return <button key={mission.id} onClick={() => setSelected(mission)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-zinc-50 sm:px-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl">{mission.emoji}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{mission.title}</p>{winner && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600">확정</span>}</div><p className="mt-0.5 text-[11px] text-zinc-400">{placedTeams}/4팀 배치 · 제출 {submissions.length}건{winner ? ` · ${TEAMS[winner.teamId].name} 점유` : submissions.length ? " · 검토 필요" : " · 미제출"}</p></div>{submissions.length > 0 && <div className="hidden -space-x-1.5 sm:flex">{submissions.slice(0, 4).map((item) => <span key={item.id} className="grid size-6 place-items-center rounded-full border-2 border-white text-[8px] font-black text-white" style={{ backgroundColor: TEAMS[item.teamId].color }}>{item.teamId}</span>)}</div>}<ChevronRight className="size-4 shrink-0 text-zinc-300" /></button>;
        })}</div>
        {visible.length === 0 && <div className="grid min-h-40 place-items-center text-center"><div><CircleAlert className="mx-auto mb-2 size-6 text-zinc-300" /><p className="text-sm font-bold text-zinc-400">조건에 맞는 미션이 없습니다.</p></div></div>}
      </section>
    </main>
    <ReviewDialog mission={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} />
  </div>;
}

function SummaryCard({ icon: Icon, value, label, sub, color }: { icon: typeof Eye; value: string; label: string; sub: string; color: string }) {
  return <div className="rounded-[20px] border bg-white p-4 shadow-sm"><div className="mb-4 grid size-9 place-items-center rounded-xl" style={{ backgroundColor: `${color}15`, color }}><Icon className="size-4" /></div><p className="text-2xl font-black tracking-tight">{value}</p><p className="text-xs font-black text-zinc-600">{label}</p><p className="mt-1 text-[10px] text-zinc-400">{sub}</p></div>;
}

function ReviewDialog({ mission, open, onOpenChange }: { mission: CatalogMission | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, decideWinner, clearDecision, rejectSubmission } = useGame();
  if (!mission) return null;
  const submissions = missionSubmissions(state, mission.id);
  const decision = state.decisions[mission.id];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl">
    <div className="mb-4 pr-10"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-xl">{mission.emoji}</span><div><p className="text-[10px] font-black text-[#ff5c35]">MISSION {String(mission.number).padStart(2, "0")}</p><DialogTitle className="text-xl font-black">{mission.title}</DialogTitle></div></div><DialogDescription className="mt-3 whitespace-pre-wrap text-sm text-zinc-500">{mission.description || "과제를 수행한 모습을 영상으로 확인해 주세요."}</DialogDescription></div>
    <div className="mb-4 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-xs"><span className="font-bold text-zinc-500">총 {submissions.length}건 · 제출 시간순</span>{decision && <Button variant="ghost" size="sm" onClick={() => clearDecision(mission.id)} className="h-7 text-red-500"><RotateCcw className="size-3" /> 판정 취소</Button>}</div>
    {submissions.length ? <div className="space-y-3">{submissions.map((item, index) => { const team = TEAMS[item.teamId]; const selected = decision === item.id; const rejected = item.status === "rejected"; return <article key={item.id} className={cn("overflow-hidden rounded-2xl border-2", selected ? "border-emerald-400" : rejected ? "border-red-200 opacity-60" : "border-zinc-200")}>
      <div className="relative aspect-video bg-zinc-950"><video src={item.videoUrl} controls playsInline preload="metadata" className="size-full object-contain" /><span className="absolute left-3 top-3 rounded-full bg-zinc-950/75 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">#{index + 1} 제출</span>{selected && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white"><Check className="size-3" /> 최종 점유</span>}</div>
      <div className="flex items-center gap-3 p-3"><span className="grid size-9 place-items-center rounded-full text-xs font-black text-white" style={{ backgroundColor: team.color }}>{team.id}</span><div className="min-w-0 flex-1"><p className="text-sm font-black">{team.name}</p><p className="flex items-center gap-1 text-[10px] text-zinc-400"><Clock3 className="size-3" /> {formatTime(item.createdAt)}{index === 0 && " · 최초 제출"}</p></div>{!selected && <><Button variant={rejected ? "outline" : "danger"} size="sm" onClick={() => rejectSubmission(item.id)}>{rejected ? "복구" : <><X className="size-3" /> 부적합</>}</Button><Button size="sm" onClick={() => decideWinner(mission.id, item.id)} disabled={rejected}><ShieldCheck className="size-3" /> 점유 확정</Button></>}</div>
    </article>; })}</div> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed bg-zinc-50 text-center"><div><Eye className="mx-auto mb-2 size-7 text-zinc-300" /><p className="text-sm font-black text-zinc-500">아직 제출된 영상이 없습니다</p></div></div>}
  </DialogContent></Dialog>;
}
