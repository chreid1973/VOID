const FETCH_TIMEOUT_MS = 4_000;
const MAX_HTML_BYTES = 128 * 1024;

type LinkMetadata = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};

function addDefaultProtocol(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    isPrivateIpv4(normalized)
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function cleanText(value: string | null | undefined, maxLength: number) {
  if (!value) return null;

  const normalized = decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ?? null;
}

function extractMetaContent(html: string, key: string) {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    const attrPattern =
      /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

    let match: RegExpExecArray | null;

    while ((match = attrPattern.exec(tag))) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    const metaKey = attrs.property || attrs.name;
    if (metaKey?.toLowerCase() === key.toLowerCase()) {
      return attrs.content ?? null;
    }
  }

  return null;
}

function resolveExternalAssetUrl(
  value: string | null | undefined,
  baseUrl: string
) {
  if (!value) return null;

  try {
    const resolved = new URL(value, baseUrl);

    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }

    if (isPrivateHostname(resolved.hostname)) {
      return null;
    }

    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
}

async function readHtmlSnippet(res: Response) {
  if (!res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let html = "";

  try {
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const remaining = MAX_HTML_BYTES - received;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;

      received += chunk.byteLength;
      html += decoder.decode(chunk, { stream: true });

      if (received >= MAX_HTML_BYTES) break;
    }

    html += decoder.decode();
    return html;
  } finally {
    try {
      await reader.cancel();
    } catch {}
  }
}

export function normalizeExternalUrl(input: string) {
  const value = input.trim();

  if (!value) {
    throw new Error("Link URL is required.");
  }

  let url: URL;

  try {
    url = new URL(addDefaultProtocol(value));
  } catch {
    throw new Error("Enter a valid link URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https links are allowed.");
  }

  if (isPrivateHostname(url.hostname)) {
    throw new Error("Private or local network links are not allowed.");
  }

  url.hash = "";
  return url.toString();
}

export function getLinkFallbackTitle(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "Shared link";
  }
}

export async function fetchLinkMetadata(urlString: string): Promise<LinkMetadata> {
  const normalizedUrl = normalizeExternalUrl(urlString);

  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const finalUrl = !isPrivateHostname(new URL(res.url).hostname)
      ? res.url
      : normalizedUrl;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();

    if (!res.ok || !contentType.includes("text/html")) {
      return {
        url: finalUrl,
        title: null,
        description: null,
        imageUrl: null,
      };
    }

    const html = await readHtmlSnippet(res);

    return {
      url: finalUrl,
      title: cleanText(
        extractMetaContent(html, "og:title") ??
          extractMetaContent(html, "twitter:title") ??
          extractTitle(html),
        300
      ),
      description: cleanText(
        extractMetaContent(html, "og:description") ??
          extractMetaContent(html, "description") ??
          extractMetaContent(html, "twitter:description"),
        1000
      ),
      imageUrl: resolveExternalAssetUrl(
        extractMetaContent(html, "og:image") ??
          extractMetaContent(html, "twitter:image"),
        finalUrl
      ),
    };
  } catch {
    return {
      url: normalizedUrl,
      title: null,
      description: null,
      imageUrl: null,
    };
  }
}
