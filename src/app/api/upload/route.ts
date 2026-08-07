import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MISSION_CATALOG, TEAM_IDS, type TeamId } from "@/lib/game";
import { BLOB_STORAGE_ENABLED, blobDatePrefix, UPLOAD_DIRECTORY } from "@/lib/server-paths";
import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_CONTENT_TYPES,
  videoExtension,
} from "@/lib/video";

export const runtime = "nodejs";

type ClientPayload = { teamId: TeamId; catalogId: string };

function parseClientPayload(value: string | null): ClientPayload | null {
  try {
    const parsed = JSON.parse(value ?? "null") as Partial<ClientPayload> | null;
    if (
      !parsed
      || !TEAM_IDS.includes(parsed.teamId as TeamId)
      || !MISSION_CATALOG.some((mission) => mission.id === parsed.catalogId)
    ) return null;
    return { teamId: parsed.teamId as TeamId, catalogId: parsed.catalogId as string };
  } catch {
    return null;
  }
}

export async function GET() {
  return Response.json({
    storage: BLOB_STORAGE_ENABLED ? "blob" : "local",
    pathnamePrefix: BLOB_STORAGE_ENABLED ? `${blobDatePrefix()}/videos` : null,
    maximumSizeInBytes: MAX_VIDEO_SIZE_BYTES,
    maximumDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function handleBlobUpload(request: Request) {
  const body = await request.json() as HandleUploadBody;
  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const payload = parseClientPayload(clientPayload);
      if (!payload) throw new Error("올바르지 않은 영상 업로드 요청입니다.");
      const expectedPrefix = `${blobDatePrefix()}/videos/${payload.teamId}/${payload.catalogId}/`;
      const filename = pathname.slice(expectedPrefix.length);
      if (!pathname.startsWith(expectedPrefix) || !/^[a-f0-9-]+\.(mp4|mov|m4v|webm)$/.test(filename)) {
        throw new Error("영상 저장 경로가 올바르지 않습니다.");
      }
      return {
        allowedContentTypes: [...VIDEO_CONTENT_TYPES],
        maximumSizeInBytes: MAX_VIDEO_SIZE_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 31536000,
      };
    },
  });
  return Response.json(result);
}

async function handleLocalUpload(request: Request) {
  const form = await request.formData();
  const media = form.get("media");
  if (!(media instanceof File)) {
    return Response.json({ message: "영상 파일이 필요합니다." }, { status: 400 });
  }
  const extension = videoExtension(media.name, media.type);
  if (!extension) {
    return Response.json({ message: "MP4, MOV, M4V, WebM 영상만 제출할 수 있습니다." }, { status: 415 });
  }
  if (media.size > MAX_VIDEO_SIZE_BYTES) {
    return Response.json({ message: "영상은 15MB 이하여야 합니다." }, { status: 413 });
  }
  const name = `${crypto.randomUUID()}.${extension}`;
  await mkdir(UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIRECTORY, name), Buffer.from(await media.arrayBuffer()));
  return Response.json({ url: `/api/media/${name}` });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (BLOB_STORAGE_ENABLED && contentType.includes("application/json")) {
      return await handleBlobUpload(request);
    }
    return await handleLocalUpload(request);
  } catch (error) {
    console.error("Failed to upload video", error);
    return Response.json({ message: "영상 파일을 저장하지 못했습니다." }, { status: 500 });
  }
}
