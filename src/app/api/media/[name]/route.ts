import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIRECTORY } from "@/lib/server-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
};

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp|mp4|mov|m4v|webm)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const filePath = path.join(/* turbopackIgnore: true */ UPLOAD_DIRECTORY, name);
    const fileStat = await stat(filePath);
    const extension = name.split(".").pop()!;
    const baseHeaders = {
      "Accept-Ranges": "bytes",
      "Content-Type": TYPES[extension],
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    const range = request.headers.get("range");
    if (!range) {
      const media = await readFile(filePath);
      return new Response(media, { headers: { ...baseHeaders, "Content-Length": String(fileStat.size) } });
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
    }
    const requestedStart = match[1] ? Number(match[1]) : null;
    const requestedEnd = match[2] ? Number(match[2]) : null;
    const start = requestedStart ?? Math.max(0, fileStat.size - (requestedEnd ?? 0));
    const end = requestedStart === null
      ? fileStat.size - 1
      : Math.min(requestedEnd ?? fileStat.size - 1, fileStat.size - 1);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= fileStat.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
    }

    const length = end - start + 1;
    const media = Buffer.alloc(length);
    const handle = await open(filePath, "r");
    try {
      await handle.read(media, 0, length, start);
    } finally {
      await handle.close();
    }
    return new Response(media, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(length),
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
