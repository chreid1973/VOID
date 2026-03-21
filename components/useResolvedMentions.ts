"use client";

import { useEffect, useMemo, useState } from "react";

function extractMentionUsernames(text: string) {
  const mentionRegex = /(^|[^a-z0-9_])@([a-z0-9_]{3,24})(?=$|[^a-z0-9_])/gi;
  const usernames = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.add(match[2].toLowerCase());
  }

  return Array.from(usernames);
}

export function useResolvedMentions(text: string) {
  const mentionedUsernames = useMemo(() => {
    return extractMentionUsernames(text);
  }, [text]);
  const [resolvedMentions, setResolvedMentions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mentionedUsernames.length === 0) {
      setResolvedMentions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/mentions/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usernames: mentionedUsernames,
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setResolvedMentions([]);
          return;
        }

        setResolvedMentions(
          Array.isArray(data?.mentions)
            ? data.mentions
                .map((username: unknown) =>
                  typeof username === "string" ? username.toLowerCase() : ""
                )
                .filter(Boolean)
            : []
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResolvedMentions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [mentionedUsernames]);

  const unresolvedMentions = useMemo(() => {
    const resolvedSet = new Set(resolvedMentions);
    return mentionedUsernames.filter((username) => !resolvedSet.has(username));
  }, [mentionedUsernames, resolvedMentions]);

  return {
    mentionedUsernames,
    resolvedMentions,
    unresolvedMentions,
    loading,
  };
}
