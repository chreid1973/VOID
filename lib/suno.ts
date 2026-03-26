type SunoEmbed = {
  id: string;
  embedUrl: string;
  height: number;
};

function extractSunoSongId(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const [type, id] = segments;

  if (!type || !id) {
    return null;
  }

  if (type !== "song" && type !== "embed") {
    return null;
  }

  return id.trim() || null;
}

export function getSunoEmbed(value: string | null | undefined): SunoEmbed | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host !== "suno.com") {
      return null;
    }

    const songId = extractSunoSongId(url.pathname);

    if (!songId) {
      return null;
    }

    return {
      id: songId,
      embedUrl: `https://suno.com/embed/${songId}`,
      height: 240,
    };
  } catch {
    return null;
  }
}
