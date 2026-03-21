import type { ReactNode } from "react";
import Link from "next/link";

export default function MentionText({
  text,
  mentions,
}: {
  text: string;
  mentions: string[];
}) {
  const mentionRegex = /(^|[^a-z0-9_])@([a-z0-9_]{3,24})(?=$|[^a-z0-9_])/gi;
  const validMentions = new Set(
    mentions.map((username) => username.toLowerCase())
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

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

    if (validMentions.has(username)) {
      nodes.push(
        <Link
          key={`mention-${username}-${key}`}
          href={`/u/${encodeURIComponent(username)}`}
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

  return <>{nodes}</>;
}
