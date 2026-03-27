import type { ReactNode } from "react";
import Link from "next/link";

const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function trimUrlMatch(value: string) {
  let trimmed = value;

  while (/[),.!?;:]$/.test(trimmed)) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function pushMentionNodes(
  nodes: ReactNode[],
  text: string,
  mentions: string[],
  keyPrefix: string,
  linkMentions: boolean,
  key: number
) {
  const mentionRegex = /(^|[^a-z0-9_])@([a-z0-9_]{3,24})(?=$|[^a-z0-9_])/gi;
  const validMentions = new Set(
    mentions.map((username) => username.toLowerCase())
  );
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const prefix = match[1];
    const username = match[2].toLowerCase();
    const fullStart = match.index;
    const mentionStart = fullStart + prefix.length;
    const mentionToken = `@${match[2]}`;

    if (cursor < fullStart) {
      nodes.push(text.slice(cursor, fullStart));
    }

    if (prefix) {
      nodes.push(prefix);
    }

    if (validMentions.has(username) && linkMentions) {
      nodes.push(
        <Link
          key={`${keyPrefix}-${username}-${key}`}
          href={`/u/${encodeURIComponent(username)}`}
          prefetch={false}
          style={{
            color: "#ff8a57",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {mentionToken}
        </Link>
      );
      key += 1;
    } else {
      nodes.push(mentionToken);
    }

    cursor = mentionStart + mentionToken.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return key;
}

export function renderMentionTextNodes(
  text: string,
  mentions: string[],
  keyPrefix = "mention",
  linkMentions = true,
  linkUrls = true
) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  if (!linkUrls) {
    pushMentionNodes(nodes, text, mentions, keyPrefix, linkMentions, key);
    return nodes;
  }

  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const fullStart = match.index;
    const rawUrl = match[0];
    const trimmedUrl = trimUrlMatch(rawUrl);
    const trailing = rawUrl.slice(trimmedUrl.length);

    if (cursor < fullStart) {
      key = pushMentionNodes(
        nodes,
        text.slice(cursor, fullStart),
        mentions,
        keyPrefix,
        linkMentions,
        key
      );
    }

    const href = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    nodes.push(
      <a
        key={`${keyPrefix}-url-${key}`}
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          color: "#d8a57f",
          textDecoration: "underline",
          textUnderlineOffset: "0.15em",
          overflowWrap: "anywhere",
        }}
      >
        {trimmedUrl}
      </a>
    );
    key += 1;

    if (trailing) {
      nodes.push(trailing);
    }

    cursor = fullStart + rawUrl.length;
  }

  if (cursor < text.length) {
    pushMentionNodes(
      nodes,
      text.slice(cursor),
      mentions,
      keyPrefix,
      linkMentions,
      key
    );
  }

  return nodes;
}

export default function MentionText({
  text,
  mentions,
  linkMentions = true,
  linkUrls = true,
}: {
  text: string;
  mentions: string[];
  linkMentions?: boolean;
  linkUrls?: boolean;
}) {
  return (
    <>
      {renderMentionTextNodes(text, mentions, "mention", linkMentions, linkUrls)}
    </>
  );
}
