const SPOTIFY_EMBED_TYPES = new Set([
  "track",
  "album",
  "playlist",
  "artist",
  "show",
  "episode",
] as const);

type SpotifyEmbedType =
  | "track"
  | "album"
  | "playlist"
  | "artist"
  | "show"
  | "episode";

type SpotifyEmbed = {
  type: SpotifyEmbedType;
  id: string;
  embedUrl: string;
  height: number;
};

function isSpotifyEmbedType(value: string): value is SpotifyEmbedType {
  return SPOTIFY_EMBED_TYPES.has(value as SpotifyEmbedType);
}

function getSpotifyEmbedHeight(type: SpotifyEmbedType) {
  switch (type) {
    case "track":
    case "album":
    case "artist":
    case "episode":
      return 152;
    case "playlist":
    case "show":
      return 352;
  }
}

function parseSpotifyPathSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0]?.startsWith("intl-")) {
    segments.shift();
  }

  const [type, id] = segments;

  if (!type || !id || !isSpotifyEmbedType(type)) {
    return null;
  }

  return { type, id };
}

export function getSpotifyEmbed(value: string | null | undefined): SpotifyEmbed | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("spotify:")) {
    const [, type, id] = trimmed.split(":");

    if (!type || !id || !isSpotifyEmbedType(type)) {
      return null;
    }

    return {
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`,
      height: getSpotifyEmbedHeight(type),
    };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host !== "open.spotify.com" && host !== "play.spotify.com") {
      return null;
    }

    const parsed = parseSpotifyPathSegments(url.pathname);

    if (!parsed) {
      return null;
    }

    return {
      type: parsed.type,
      id: parsed.id,
      embedUrl: `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator`,
      height: getSpotifyEmbedHeight(parsed.type),
    };
  } catch {
    return null;
  }
}
