export function normalizePreviewImageUrl(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();

  return normalized || null;
}
