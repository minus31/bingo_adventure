"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, ExternalLink, Film, LoaderCircle, Pencil, ShieldCheck, UploadCloud, Video } from "lucide-react";
import { useGame } from "@/components/game-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatTime, missionOwner, missionSubmissions, TEAMS, type Mission, type TeamId } from "@/lib/game";
import { MAX_VIDEO_DURATION_SECONDS, MAX_VIDEO_SIZE_BYTES, videoContentType, videoExtension } from "@/lib/video";

type UploadConfiguration = {
  storage: "blob" | "local";
  pathnamePrefix: string | null;
  maximumSizeInBytes: number;
  maximumDurationSeconds: number;
};

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
}

async function readVideoDuration(video: File) {
  const source = URL.createObjectURL(video);
  try {
    return await new Promise<number>((resolve, reject) => {
      const element = document.createElement("video");
      element.preload = "metadata";
      element.onloadedmetadata = () => {
        const duration = element.duration;
        if (Number.isFinite(duration) && duration > 0) resolve(duration);
        else reject(new Error("영상 재생시간을 확인할 수 없습니다."));
      };
      element.onerror = () => reject(new Error("영상 파일을 읽을 수 없습니다."));
      element.src = source;
    });
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function uploadVideo(video: File, teamId: TeamId, catalogId: string) {
  const configurationResponse = await fetch("/api/upload", { cache: "no-store" });
  const configuration = await configurationResponse.json() as UploadConfiguration & { message?: string };
  if (!configurationResponse.ok) {
    throw new Error(configuration.message ?? "업로드 설정을 불러오지 못했습니다.");
  }
  if (configuration.storage === "blob") {
    const extension = videoExtension(video.name, video.type);
    const contentType = videoContentType(video.name, video.type);
    if (!extension || !contentType || !configuration.pathnamePrefix) {
      throw new Error("지원하지 않는 영상 형식입니다.");
    }
    const pathname = `${configuration.pathnamePrefix}/${teamId}/${catalogId}/${crypto.randomUUID()}.${extension}`;
    const blob = await upload(pathname, video, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ teamId, catalogId }),
      contentType,
    });
    return blob.url;
  }

  const form = new FormData();
  form.append("media", video, video.name || "mission-video.mp4");
  const response = await fetch("/api/upload", { method: "POST", body: form });
  const result = await response.json() as { url?: string; message?: string };
  if (!response.ok || !result.url) throw new Error(result.message ?? "영상을 업로드하지 못했습니다.");
  return result.url;
}

export function MissionDialog({
  mission,
  open,
  onOpenChange,
  onEdit,
}: {
  mission: Mission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}) {
  const { state, currentTeam, addSubmission } = useGame();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const submissions = useMemo(() => missionSubmissions(state, mission.catalogId), [mission.catalogId, state]);
  const owner = missionOwner(state, mission.catalogId);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!currentTeam) return null;
  const myCount = submissions.filter((item) => item.teamId === currentTeam).length;
  const canEdit = mission.boardTeamId === currentTeam && submissions.length === 0 && Boolean(onEdit);

  const selectFile = async (selected?: File) => {
    if (!selected) return;
    setChecking(true);
    setError("");
    try {
      if (!isVideoFile(selected)) throw new Error("MP4, MOV, M4V, WebM 영상만 제출할 수 있어요.");
      if (selected.size > MAX_VIDEO_SIZE_BYTES) throw new Error("영상은 15MB 이하로 선택해 주세요.");
      const duration = await readVideoDuration(selected);
      if (duration > MAX_VIDEO_DURATION_SECONDS) throw new Error("영상은 최대 10초까지만 제출할 수 있어요.");
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    } catch (reason) {
      setFile(null);
      setPreview(null);
      setError(reason instanceof Error ? reason.message : "영상 파일을 확인하지 못했습니다.");
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    if (!file) return setError("제출할 영상을 먼저 촬영하거나 선택해 주세요.");
    setSaving(true);
    setError("");
    try {
      const videoUrl = await uploadVideo(file, currentTeam, mission.catalogId);
      addSubmission({
        id: crypto.randomUUID(),
        catalogId: mission.catalogId,
        teamId: currentTeam,
        videoUrl,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "제출 중 문제가 생겼어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {complete ? (
          <div className="py-7 text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-8" strokeWidth={3} /></div>
            <DialogTitle className="text-2xl font-black tracking-tight">영상 제출 완료!</DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">{TEAMS[currentTeam].name}의 인증 영상이 등록됐어요. 다른 팀의 화면에도 곧 반영됩니다.</DialogDescription>
            <Button variant="primary" className="mt-7 w-full" onClick={() => onOpenChange(false)}>빙고판으로 돌아가기</Button>
          </div>
        ) : (<>
          <div className="mb-5 pr-10">
            <div className="mb-3 flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-2xl">{mission.emoji}</span>
              <div className="min-w-0 flex-1"><p className="text-xs font-black text-[#ff5c35]">MISSION {String(mission.number).padStart(2, "0")}</p><DialogTitle className="text-xl font-black tracking-tight">{mission.title}</DialogTitle></div>
            </div>
            <DialogDescription className="whitespace-pre-wrap text-sm font-medium leading-6 text-zinc-500">{mission.description || "과제를 수행한 모습을 영상으로 남겨 주세요."}</DialogDescription>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
              {mission.referenceUrl && <a href={mission.referenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-[#ff5c35]">행사 안내 보기 <ExternalLink className="size-3" /></a>}
              {canEdit && <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-black text-[#ff5c35]"><Pencil className="size-3" /> 배치 과제 변경</button>}
            </div>
          </div>

          {owner && <div className="mb-4 flex items-center gap-3 rounded-2xl border p-3" style={{ backgroundColor: TEAMS[owner.teamId].soft, borderColor: TEAMS[owner.teamId].ring }}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-black text-white" style={{ backgroundColor: TEAMS[owner.teamId].color }}>{owner.teamId}</span>
            <div className="min-w-0 flex-1"><p className="text-xs font-black" style={{ color: TEAMS[owner.teamId].color }}>{owner.final ? "최종 점유 완료" : "현재 가장 빠른 팀"}</p><p className="truncate text-xs font-medium text-zinc-500">{formatTime(owner.submission.createdAt)} 제출, 추가 도전 가능</p></div>
            {owner.final ? <ShieldCheck className="size-5" style={{ color: TEAMS[owner.teamId].color }} /> : <Clock3 className="size-5" style={{ color: TEAMS[owner.teamId].color }} />}
          </div>}

          {preview ? (
            <div className="overflow-hidden rounded-2xl bg-zinc-950">
              <video src={preview} controls playsInline preload="metadata" className="aspect-video w-full object-contain" />
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs text-white/70">
                <span className="min-w-0 truncate font-bold">{file?.name || "촬영한 영상"}</span>
                <span className="shrink-0 font-black">{file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : ""}</span>
              </div>
            </div>
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-center">
              <div><span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-white text-[#ff5c35] shadow-sm"><Film className="size-5" /></span><p className="text-sm font-black">인증 영상을 준비해 주세요</p><p className="mt-1 text-xs text-zinc-400">MP4, MOV, M4V, WebM, 최대 10초, 15MB</p></div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 text-sm font-bold text-white active:scale-[0.98]">
              <input type="file" accept="video/*" capture="environment" className="sr-only" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              <Video className="size-4" /> 영상 촬영
            </label>
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800 active:scale-[0.98]">
              <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" className="sr-only" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              <Film className="size-4" /> 보관함 선택
            </label>
          </div>

          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-400"><span>전체 {submissions.length}건 제출</span><span>우리 팀 {myCount}건</span></div>
          <Button variant="primary" size="lg" className="mt-3 w-full" disabled={!file || saving || checking} onClick={submit}>{saving ? <><LoaderCircle className="size-4 animate-spin" /> 업로드 중, 화면을 유지해 주세요</> : checking ? <><LoaderCircle className="size-4 animate-spin" /> 영상 길이 확인 중</> : <><UploadCloud className="size-4" /> 이 영상으로 제출하기</>}</Button>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
