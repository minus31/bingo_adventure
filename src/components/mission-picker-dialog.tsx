"use client";

import { Check, ListChecks, LockKeyhole, UsersRound } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MISSION_CATALOG, TEAMS, type CatalogMission, type Mission, type MissionSlot } from "@/lib/game";
import { cn } from "@/lib/utils";

export function MissionPickerDialog({
  slot,
  mission,
  open,
  onOpenChange,
}: {
  slot: MissionSlot;
  mission?: Mission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, currentTeam, saveMission } = useGame();
  if (!currentTeam) return null;

  const selectMission = (catalogMission: CatalogMission) => {
    const usedByAnotherSlot = state.missions.some(
      (item) => item.boardTeamId === currentTeam
        && item.catalogId === catalogMission.id
        && item.id !== slot.id,
    );
    if (usedByAnotherSlot) return;
    saveMission({
      ...slot,
      boardTeamId: currentTeam,
      catalogId: catalogMission.id,
      title: catalogMission.title,
      description: catalogMission.description,
      emoji: catalogMission.emoji,
      referenceUrl: catalogMission.referenceUrl,
      createdAt: mission?.createdAt ?? new Date().toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="mb-4 pr-10">
          <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-orange-50 text-[#ff5c35]">
            <ListChecks className="size-5" />
          </span>
          <p className="text-xs font-black text-[#ff5c35]">BINGO CELL {String(slot.number).padStart(2, "0")}</p>
          <DialogTitle className="mt-1 text-xl font-black tracking-tight">
            {mission ? "배치할 과제 변경" : "배치할 과제 선택"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-zinc-500">
            기존 18개 과제 중 하나를 선택하세요. 각 팀은 과제를 서로 다른 위치에 배치할 수 있어요.
          </DialogDescription>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-700">
          <span className="flex items-center gap-2"><UsersRound className="size-4" /> {TEAMS[currentTeam].name}에서 선택</span>
          <span>{state.missions.filter((item) => item.boardTeamId === currentTeam).length}/18 배치</span>
        </div>

        <div className="max-h-[58dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {MISSION_CATALOG.map((catalogMission) => {
            const usedByAnotherSlot = state.missions.some(
              (item) => item.boardTeamId === currentTeam
                && item.catalogId === catalogMission.id
                && item.id !== slot.id,
            );
            const isCurrent = mission?.catalogId === catalogMission.id;
            return (
              <button
                type="button"
                key={catalogMission.id}
                disabled={usedByAnotherSlot}
                onClick={() => selectMission(catalogMission)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  isCurrent ? "border-orange-300 bg-orange-50" : "border-zinc-200 bg-white",
                  usedByAnotherSlot ? "cursor-not-allowed bg-zinc-50 opacity-55" : "hover:border-orange-200 hover:bg-orange-50/50",
                )}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl">{catalogMission.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black text-zinc-400">과제 {String(catalogMission.number).padStart(2, "0")}</span>
                  <span className="mt-0.5 block text-sm font-black text-zinc-900">{catalogMission.title}</span>
                  <span className="mt-1 line-clamp-1 block text-[11px] font-medium text-zinc-400">{catalogMission.description}</span>
                </span>
                {isCurrent ? <span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-[#ff5c35]"><Check className="size-3.5" /> 현재</span>
                  : usedByAnotherSlot ? <span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-zinc-400"><LockKeyhole className="size-3.5" /> 배치 완료</span>
                    : <span className="shrink-0 rounded-lg bg-zinc-950 px-2 py-1 text-[10px] font-black text-white">선택</span>}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
