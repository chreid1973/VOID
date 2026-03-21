"use client";

import type { KeyboardEvent, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import type { MentionSuggestion } from "./MentionAutocompleteMenu";

type SelectionState = {
  start: number;
  end: number;
};

type ActiveMention = {
  query: string;
  mentionStart: number;
  cursor: number;
};

function getActiveMention(
  text: string,
  selection: SelectionState
): ActiveMention | null {
  if (selection.start !== selection.end) return null;

  const beforeCursor = text.slice(0, selection.start);
  const match = /(^|[^a-z0-9_])@([a-z0-9_ ]{0,40})$/i.exec(beforeCursor);

  if (!match) return null;

  const mentionStart = match.index + match[1].length;
  const query = match[2].trim();

  return {
    query,
    mentionStart,
    cursor: selection.start,
  };
}

export function useMentionAutocomplete<T extends HTMLInputElement | HTMLTextAreaElement>({
  text,
  selection,
  inputRef,
  onInsert,
}: {
  text: string;
  selection: SelectionState;
  inputRef: RefObject<T | null>;
  onInsert: (nextText: string, nextCursor: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const activeMention = useMemo(
    () => getActiveMention(text, selection),
    [selection, text]
  );

  useEffect(() => {
    if (!activeMention?.query) {
      setSuggestions([]);
      setHighlightedIndex(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/mentions/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: activeMention.query,
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions(Array.isArray(data?.users) ? data.users : []);
        setHighlightedIndex(0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeMention?.query]);

  function closeMenu() {
    setSuggestions([]);
    setHighlightedIndex(0);
    setLoading(false);
  }

  function selectSuggestion(suggestion: MentionSuggestion) {
    if (!activeMention) return;

    const replacement = `@${suggestion.username} `;
    const nextText =
      text.slice(0, activeMention.mentionStart) +
      replacement +
      text.slice(activeMention.cursor);
    const nextCursor = activeMention.mentionStart + replacement.length;

    onInsert(nextText, nextCursor);
    closeMenu();

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeyDown(event: KeyboardEvent<T>) {
    if (!activeMention?.query || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current === 0 ? suggestions.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedIndex] ?? suggestions[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  return {
    activeQuery: activeMention?.query ?? "",
    suggestions,
    highlightedIndex,
    loading,
    selectSuggestion,
    handleKeyDown,
    closeMenu,
  };
}
