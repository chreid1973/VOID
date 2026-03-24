export type CommentGifProvider = "GIPHY";

export type CommentGif = {
  id: string;
  provider: CommentGifProvider;
  url: string;
  title?: string | null;
  previewUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

const ALLOWED_GIF_HOST_PATTERNS = [
  /(^|\.)giphy\.com$/i,
  /(^|\.)giphyusercontent\.com$/i,
];

function isAllowedGifHostname(hostname: string) {
  return ALLOWED_GIF_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function isAllowedCommentGifUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      isAllowedGifHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

export function normalizeCommentGif(value: unknown): CommentGif | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === "string"
      ? record.id.trim()
      : typeof record.gifId === "string"
        ? record.gifId.trim()
        : "";
  const provider =
    typeof record.provider === "string"
      ? record.provider.trim().toUpperCase()
      : typeof record.gifProvider === "string"
        ? record.gifProvider.trim().toUpperCase()
        : "";
  const url =
    typeof record.url === "string"
      ? record.url.trim()
      : typeof record.gifUrl === "string"
        ? record.gifUrl.trim()
        : "";
  const title =
    typeof record.title === "string" && record.title.trim().length > 0
      ? record.title.trim()
      : null;
  const previewUrl =
    typeof record.previewUrl === "string" && isAllowedCommentGifUrl(record.previewUrl)
      ? record.previewUrl.trim()
      : null;
  const width =
    typeof record.width === "number" && Number.isFinite(record.width)
      ? record.width
      : null;
  const height =
    typeof record.height === "number" && Number.isFinite(record.height)
      ? record.height
      : null;

  if (!id || provider !== "GIPHY" || !url || !isAllowedCommentGifUrl(url)) {
    return null;
  }

  return {
    id,
    provider: "GIPHY",
    url,
    title,
    previewUrl,
    width,
    height,
  };
}

export function buildStoredCommentGif(
  gifId: string | null | undefined,
  gifUrl: string | null | undefined,
  gifProvider: string | null | undefined
) {
  return normalizeCommentGif({
    id: gifId,
    url: gifUrl,
    provider: gifProvider,
  });
}

export function hasCommentContent(body: string | null | undefined, gif: CommentGif | null) {
  return Boolean(body?.trim() || gif);
}
