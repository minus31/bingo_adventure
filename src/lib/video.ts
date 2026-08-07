export const MAX_VIDEO_DURATION_SECONDS = 10;
export const MAX_VIDEO_SIZE_BYTES = 15 * 1024 * 1024;

export const VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
] as const;

export const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm"] as const;

export function videoExtension(filename: string, contentType: string) {
  const byType: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
  };
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  return byType[contentType]
    ?? (VIDEO_EXTENSIONS.includes(fromName as (typeof VIDEO_EXTENSIONS)[number]) ? fromName : null);
}

export function videoContentType(filename: string, contentType: string) {
  if (VIDEO_CONTENT_TYPES.includes(contentType as (typeof VIDEO_CONTENT_TYPES)[number])) return contentType;
  const extension = videoExtension(filename, contentType);
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  if (extension === "m4v") return "video/x-m4v";
  return extension === "mp4" ? "video/mp4" : null;
}
