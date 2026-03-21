import sanitizeHtml from "sanitize-html";

const ALLOWED_RICH_TEXT_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "a",
  "blockquote",
  "ul",
  "li",
  "code",
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizePostBodyHtml(html: string | null | undefined) {
  if (!html?.trim()) {
    return null;
  }

  const sanitized = sanitizeHtml(html, {
    allowedTags: [...ALLOWED_RICH_TEXT_TAGS],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
    },
  }).trim();

  const plainText = sanitizeHtml(sanitized, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .trim();

  return plainText ? sanitized : null;
}

export function plainTextToRichHtml(text: string | null | undefined) {
  const trimmed = text?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const normalizedParagraph = paragraph.trimEnd();
      return `<p>${escapeHtml(normalizedParagraph).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

export function appendPlainTextToRichHtml(
  baseHtml: string | null | undefined,
  text: string | null | undefined
) {
  const appendedHtml = plainTextToRichHtml(text);

  if (!appendedHtml) {
    return sanitizePostBodyHtml(baseHtml);
  }

  return sanitizePostBodyHtml(`${baseHtml ?? ""}${appendedHtml}`);
}
