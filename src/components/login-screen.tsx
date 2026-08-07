"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useGame } from "@/components/game-provider";
import { TEAM_IDS, TEAMS, type TeamId } from "@/lib/game";

export function LoginScreen() {
  const { login } = useGame();
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f7f5f0] px-5 py-7 text-zinc-950">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[#ff5c35]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full bg-[#6d5dfc]/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><BrandMark /><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5c35]">Bingo Adventure</p><p className="text-sm font-black">미션 빙고</p></div></div>
          <Button asChild variant="ghost" size="sm" className="text-zinc-500"><Link href="/admin"><LockKeyhole className="size-3.5" /> 관리자</Link></Button>
        </header>
        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#e34b27]"><Sparkles className="size-3.5" /> 먼저 완성하고, 빙고를 차지하세요!</div>
            <h1 className="text-[2.65rem] font-black leading-[1.06] tracking-[-0.055em]">오늘의 모험은<br /><span className="text-[#ff5c35]">우리 팀</span>이 주인공</h1>
            <p className="mt-4 text-[15px] font-medium leading-6 text-zinc-500">팀을 선택하고 18개 과제를 빙고판에 배치하세요.<br />4팀이 같은 과제에 영상으로 함께 도전합니다.</p>
          </div>
          <div className="rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_18px_60px_rgba(24,24,27,.08)]">
            <div className="mb-3 flex items-center gap-2 px-1"><Users className="size-4 text-zinc-400" /><p className="text-sm font-black">참가할 팀을 선택하세요</p></div>
            <div className="grid grid-cols-2 gap-2.5">{TEAM_IDS.map((id) => <TeamButton key={id} teamId={id} onSelect={login} />)}</div>
          </div>
        </section>
        <p className="text-center text-[11px] font-medium text-zinc-400">팀을 선택하면 바로 게임이 시작됩니다 · 별도 비밀번호 없음</p>
      </div>
    </main>
  );
}

function TeamButton({ teamId, onSelect }: { teamId: TeamId; onSelect: (id: TeamId) => void }) {
  const team = TEAMS[teamId];
  return (
    <button type="button" onClick={() => onSelect(teamId)} className="group flex min-h-24 flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0" style={{ backgroundColor: team.soft, borderColor: team.ring }}>
      <span className="grid size-8 place-items-center rounded-full text-sm font-black text-white shadow-sm" style={{ backgroundColor: team.color }}>{team.id}</span>
      <span className="flex w-full items-center justify-between font-black" style={{ color: team.color }}>{team.name}으로 시작 <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
    </button>
  );
}
