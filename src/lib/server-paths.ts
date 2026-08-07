import "server-only";

import path from "node:path";

const configuredDataDirectory = process.env.BINGO_DATA_DIRECTORY?.trim();

export const DATA_DIRECTORY = configuredDataDirectory
  ? path.resolve(/* turbopackIgnore: true */ configuredDataDirectory)
  : path.join(process.cwd(), ".data");

export const UPLOAD_DIRECTORY = path.join(DATA_DIRECTORY, "uploads");

export const BLOB_STORAGE_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const configuredBlobRoot = process.env.BINGO_BLOB_ROOT?.replace(/^\/+|\/+$/g, "");
export const BLOB_ROOT = configuredBlobRoot && /^[a-zA-Z0-9/_-]+$/.test(configuredBlobRoot)
  ? configuredBlobRoot
  : "bingo-adventure";

export function koreaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function blobDatePrefix(date = new Date()) {
  return `${BLOB_ROOT}/games/${koreaDate(date)}`;
}
