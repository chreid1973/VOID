import { randomUUID } from "crypto";
import sharp from "sharp";
import { extractStoredR2Key, getObjectBytes, putObjectBuffer } from "../r2";

const PREVIEW_FETCH_TIMEOUT_MS = 8000;
const PREVIEW_MAX_REMOTE_BYTES = 12 * 1024 * 1024;
const FEED_PREVIEW_MAX_WIDTH = 960;
const FEED_PREVIEW_MAX_HEIGHT = 720;

async function fetchExternalImageBytes(imageRef: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(imageRef, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return null;
    }

    const contentLength = Number(res.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > PREVIEW_MAX_REMOTE_BYTES
    ) {
      return null;
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > PREVIEW_MAX_REMOTE_BYTES) {
      return null;
    }

    return bytes;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadSourceImageBytes(imageRef: string) {
  const storedKey = extractStoredR2Key(imageRef);

  if (storedKey) {
    return getObjectBytes(storedKey);
  }

  return fetchExternalImageBytes(imageRef);
}

export async function createPostPreviewVariant(
  imageRef: string,
  postId: string
) {
  try {
    const sourceBytes = await loadSourceImageBytes(imageRef);

    if (!sourceBytes || sourceBytes.byteLength === 0) {
      return null;
    }

    const previewBytes = await sharp(sourceBytes, {
      animated: true,
      failOn: "none",
    })
      .rotate()
      .resize({
        width: FEED_PREVIEW_MAX_WIDTH,
        height: FEED_PREVIEW_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 76,
        effort: 4,
      })
      .toBuffer();

    if (previewBytes.byteLength === 0) {
      return null;
    }

    const previewKey = `posts/previews/${postId}-${randomUUID()}.webp`;
    await putObjectBuffer(previewKey, previewBytes, "image/webp");

    return previewKey;
  } catch (error) {
    console.error("[createPostPreviewVariant]", error);
    return null;
  }
}
