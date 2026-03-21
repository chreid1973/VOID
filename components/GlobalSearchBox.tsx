"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { SearchSuggestionResponse } from "../lib/search-types";

type GlobalSearchBoxProps = {
  initialValue?: string;
  placeholder?: string;
};

type FlatSuggestion = {
  key: string;
  kind: "user" | "community" | "post";
  href: string;
  label: string;
  meta: string;
  icon: string;
  accentColor?: string;
};

const EMPTY_SUGGESTIONS: SearchSuggestionResponse = {
  users: [],
  communities: [],
  posts: [],
};

function SuggestionSection({
  title,
  items,
  highlightedKey,
  onHighlight,
  onSelect,
}: {
  title: string;
  items: FlatSuggestion[];
  highlightedKey: string | null;
  onHighlight: (key: string) => void;
  onSelect: (href: string) => void;
}) {
  return (
    <div>
      <p
        style={{
          padding: "10px 14px 6px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "#6f6963",
        }}
      >
        {title}
      </p>

      <div style={{ paddingBottom: 4 }}>
        {items.map((item) => {
          const isHighlighted = highlightedKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onMouseEnter={() => onHighlight(item.key)}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(item.href);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                border: "none",
                background: isHighlighted ? "rgba(255, 72, 38, 0.09)" : "transparent",
                color: "#e6e1da",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: item.accentColor ? `${item.accentColor}20` : "#201f1f",
                  color: item.accentColor ?? "#8b847c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#ede8e0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "#7f7871",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.meta}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GlobalSearchBox({
  initialValue = "",
  placeholder = "Search posts, communities, users…",
}: GlobalSearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] =
    useState<SearchSuggestionResponse>(EMPTY_SUGGESTIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const trimmedQuery = inputValue.trim();
  const deferredQuery = useDeferredValue(trimmedQuery);
  const currentHref = useMemo(() => {
    const currentQuery = searchParams.toString();
    return currentQuery ? `${pathname}?${currentQuery}` : pathname;
  }, [pathname, searchParams]);
  const fullResultsHref = trimmedQuery
    ? `/search?q=${encodeURIComponent(trimmedQuery)}`
    : "/search";

  const flatSuggestions = useMemo<FlatSuggestion[]>(() => {
    const items: FlatSuggestion[] = [];

    for (const user of suggestions.users) {
      items.push({
        key: `user:${user.id}`,
        kind: "user",
        href: `/u/${encodeURIComponent(user.username)}`,
        label: user.displayName || `u/${user.username}`,
        meta: user.displayName ? `u/${user.username}` : "User",
        icon: "@",
      });
    }

    for (const community of suggestions.communities) {
      items.push({
        key: `community:${community.id}`,
        kind: "community",
        href: `/feed?community=${encodeURIComponent(community.name)}`,
        label: community.displayName,
        meta: `c/${community.name}`,
        icon: community.icon,
        accentColor: community.color,
      });
    }

    for (const post of suggestions.posts) {
      items.push({
        key: `post:${post.id}`,
        kind: "post",
        href: `/p/${post.publicId}?from=${encodeURIComponent(currentHref)}`,
        label: post.title,
        meta: `${post.community.displayName} · u/${
          post.author.displayName || post.author.username
        }`,
        icon: post.community.icon,
        accentColor: post.community.color,
      });
    }

    return items;
  }, [currentHref, suggestions.communities, suggestions.posts, suggestions.users]);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (deferredQuery.length < 2) {
      abortRef.current?.abort();
      setSuggestions(EMPTY_SUGGESTIONS);
      setIsLoading(false);
      setIsOpen(false);
      setHighlightedKey(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/search/suggest?query=${encodeURIComponent(deferredQuery)}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load search suggestions.");
        }

        const data = (await response.json()) as SearchSuggestionResponse;

        setSuggestions(data);
        setIsOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSuggestions(EMPTY_SUGGESTIONS);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [deferredQuery]);

  useEffect(() => {
    if (flatSuggestions.length === 0) {
      setHighlightedKey(null);
      return;
    }

    setHighlightedKey((current) => {
      if (current && flatSuggestions.some((item) => item.key === current)) {
        return current;
      }

      return null;
    });
  }, [flatSuggestions]);

  function navigateToHref(href: string) {
    setIsOpen(false);
    setHighlightedKey(null);
    router.push(href);
  }

  function handleSubmit() {
    navigateToHref(fullResultsHref);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedKey(null);
      return;
    }

    if (event.key === "ArrowDown") {
      if (flatSuggestions.length === 0) return;

      event.preventDefault();
      setIsOpen(true);

      const currentIndex = flatSuggestions.findIndex(
        (item) => item.key === highlightedKey
      );
      const nextIndex =
        currentIndex >= 0 && currentIndex < flatSuggestions.length - 1
          ? currentIndex + 1
          : 0;

      setHighlightedKey(flatSuggestions[nextIndex]?.key ?? null);
      return;
    }

    if (event.key === "ArrowUp") {
      if (flatSuggestions.length === 0) return;

      event.preventDefault();
      setIsOpen(true);

      const currentIndex = flatSuggestions.findIndex(
        (item) => item.key === highlightedKey
      );
      const nextIndex =
        currentIndex > 0 ? currentIndex - 1 : flatSuggestions.length - 1;

      setHighlightedKey(flatSuggestions[nextIndex]?.key ?? null);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const highlightedItem = flatSuggestions.find(
        (item) => item.key === highlightedKey
      );

      if (isOpen && highlightedItem) {
        navigateToHref(highlightedItem.href);
        return;
      }

      handleSubmit();
    }
  }

  const showDropdown = isOpen && trimmedQuery.length >= 2;
  const hasSuggestions = flatSuggestions.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        className="si"
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onFocus={() => {
          if (trimmedQuery.length >= 2) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />

      {showDropdown ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            background: "#151413",
            border: "1px solid #2a2828",
            borderRadius: 14,
            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.42)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          {isLoading && !hasSuggestions ? (
            <p
              style={{
                padding: "12px 14px",
                fontSize: 12,
                color: "#8b847c",
              }}
            >
              Searching…
            </p>
          ) : null}

          {suggestions.users.length > 0 ? (
            <SuggestionSection
              title="Users"
              items={flatSuggestions.filter((item) => item.kind === "user")}
              highlightedKey={highlightedKey}
              onHighlight={setHighlightedKey}
              onSelect={navigateToHref}
            />
          ) : null}

          {suggestions.communities.length > 0 ? (
            <SuggestionSection
              title="Communities"
              items={flatSuggestions.filter((item) => item.kind === "community")}
              highlightedKey={highlightedKey}
              onHighlight={setHighlightedKey}
              onSelect={navigateToHref}
            />
          ) : null}

          {suggestions.posts.length > 0 ? (
            <SuggestionSection
              title="Posts"
              items={flatSuggestions.filter((item) => item.kind === "post")}
              highlightedKey={highlightedKey}
              onHighlight={setHighlightedKey}
              onSelect={navigateToHref}
            />
          ) : null}

          {!isLoading && !hasSuggestions ? (
            <p
              style={{
                padding: "12px 14px",
                fontSize: 12,
                color: "#8b847c",
              }}
            >
              No instant matches. Press Enter for full results.
            </p>
          ) : null}

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            style={{
              width: "100%",
              border: "none",
              borderTop: "1px solid #242323",
              background: "#121111",
              color: "#d8d2ca",
              textAlign: "left",
              padding: "12px 14px",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View all results for “{trimmedQuery}”
          </button>
        </div>
      ) : null}
    </div>
  );
}
