"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import type { CommentGif } from "../lib/commentGifs";

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ?? "";
const RESULT_LIMIT = 20;

type GiphyApiAsset = {
  url?: string;
  width?: string;
  height?: string;
};

type GiphyApiGif = {
  id?: string;
  title?: string;
  images?: {
    fixed_width?: GiphyApiAsset;
    fixed_width_still?: GiphyApiAsset;
    downsized_medium?: GiphyApiAsset;
    original?: GiphyApiAsset;
  };
};

type GiphyApiResponse = {
  data?: GiphyApiGif[];
  pagination?: {
    count?: number;
    offset?: number;
    total_count?: number;
  };
};

type GiphyPickerGif = CommentGif & {
  previewUrl: string;
  width: number | null;
  height: number | null;
};

function parseDimension(value: string | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapGifResult(gif: GiphyApiGif): GiphyPickerGif | null {
  const id = gif.id?.trim();

  if (!id) {
    return null;
  }

  const displayAsset =
    gif.images?.downsized_medium ??
    gif.images?.fixed_width ??
    gif.images?.original;
  const previewAsset =
    gif.images?.fixed_width ??
    gif.images?.downsized_medium ??
    gif.images?.original;

  if (!displayAsset?.url || !previewAsset?.url) {
    return null;
  }

  return {
    id,
    provider: "GIPHY",
    url: displayAsset.url,
    previewUrl: previewAsset.url,
    title: gif.title?.trim() || "GIF",
    width: parseDimension(previewAsset.width),
    height: parseDimension(previewAsset.height),
  };
}

function mergeGifResults(current: GiphyPickerGif[], next: GiphyPickerGif[]) {
  const seen = new Set(current.map((gif) => gif.id));
  const merged = [...current];

  for (const gif of next) {
    if (seen.has(gif.id)) continue;
    seen.add(gif.id);
    merged.push(gif);
  }

  return merged;
}

async function loadGifs(query: string, signal: AbortSignal, offset: number) {
  const endpoint = query
    ? "https://api.giphy.com/v1/gifs/search"
    : "https://api.giphy.com/v1/gifs/trending";
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(RESULT_LIMIT),
    offset: String(offset),
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });

  if (query) {
    params.set("q", query);
  }

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load GIFs.");
  }

  const payload = (await response.json()) as GiphyApiResponse;
  const results = Array.isArray(payload.data)
    ? (payload.data.map(mapGifResult).filter(Boolean) as GiphyPickerGif[])
    : [];
  const totalCount = payload.pagination?.total_count;
  const nextOffset = payload.pagination?.offset ?? offset;
  const hasMore =
    typeof totalCount === "number"
      ? nextOffset + results.length < totalCount
      : results.length === RESULT_LIMIT;

  return { results, hasMore };
}

export default function GiphyPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: CommentGif) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyPickerGif[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const queuedPageRef = useRef(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setPage(0);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      queuedPageRef.current = false;
      return;
    }

    if (!GIPHY_API_KEY) {
      setResults([]);
      setPage(0);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError("Set NEXT_PUBLIC_GIPHY_API_KEY to search GIPHY.");
      queuedPageRef.current = false;
      return;
    }

    setResults([]);
    setPage(0);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(false);
    setError(null);
    queuedPageRef.current = false;
  }, [open, trimmedQuery]);

  useEffect(() => {
    if (!open || !GIPHY_API_KEY) {
      return;
    }

    const controller = new AbortController();
    const isFirstPage = page === 0;
    const timeoutId = window.setTimeout(() => {
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      void loadGifs(trimmedQuery, controller.signal, page * RESULT_LIMIT)
        .then(({ results: nextResults, hasMore: nextHasMore }) => {
          setResults((current) =>
            isFirstPage ? nextResults : mergeGifResults(current, nextResults),
          );
          setHasMore(nextHasMore);
          setError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            return;
          }

          if (isFirstPage) {
            setResults([]);
          }

          setError(err instanceof Error ? err.message : "Failed to load GIFs.");
        })
        .finally(() => {
          if (controller.signal.aborted) {
            return;
          }

          if (isFirstPage) {
            setLoading(false);
          } else {
            setLoadingMore(false);
          }

          queuedPageRef.current = false;
        });
    }, isFirstPage ? 220 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [open, page, trimmedQuery]);

  useEffect(() => {
    const container = resultsRef.current;

    if (
      !container ||
      !open ||
      loading ||
      loadingMore ||
      !hasMore ||
      queuedPageRef.current ||
      results.length === 0
    ) {
      return;
    }

    if (container.scrollHeight <= container.clientHeight + 8) {
      queuedPageRef.current = true;
      setPage((current) => current + 1);
    }
  }, [hasMore, loading, loadingMore, open, results]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
    if (loading || loadingMore || !hasMore || queuedPageRef.current) {
      return;
    }

    const target = event.currentTarget;

    if (target.scrollTop + target.clientHeight < target.scrollHeight - 140) {
      return;
    }

    queuedPageRef.current = true;
    setPage((current) => current + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a GIF"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(6, 5, 5, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(860px, 100%)",
          maxHeight: "min(82vh, 920px)",
          background: "#161515",
          border: "1px solid #2a2828",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,.48)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px 16px",
            borderBottom: "1px solid #222121",
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "#8b847c",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 5,
                }}
              >
                GIPHY
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#ede8e0",
                  letterSpacing: "-.02em",
                }}
              >
                Add a GIF
              </h3>
            </div>

            <button className="act" type="button" onClick={onClose}>
              Close
            </button>
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GIPHY"
            spellCheck={false}
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 10,
              padding: "11px 14px",
              color: "#e6e1da",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 13.5,
              outline: "none",
            }}
          />

          <p
            style={{
              fontSize: 11.5,
              color: "#6f6963",
              lineHeight: 1.5,
            }}
          >
            {trimmedQuery
              ? `Showing GIFs for “${trimmedQuery}”.`
              : "Showing trending GIFs."}{" "}
            Powered by GIPHY.
          </p>
        </div>

        <div
          ref={resultsRef}
          onScroll={handleResultsScroll}
          style={{
            padding: "16px 20px 20px",
            overflowY: "auto",
          }}
        >
          {loading && results.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8b847c" }}>Loading GIFs...</p>
          ) : error && results.length === 0 ? (
            <p style={{ fontSize: 13, color: "#ff8b72" }}>{error}</p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8b847c" }}>
              No GIFs found. Try another search.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {results.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => {
                      onSelect(gif);
                      onClose();
                    }}
                    style={{
                      background: "#111010",
                      border: "1px solid #242323",
                      borderRadius: 12,
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "1 / 1",
                        background: "#0d0c0c",
                      }}
                    >
                      <img
                        src={gif.previewUrl}
                        alt={gif.title || "GIF"}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          objectFit: "cover",
                        }}
                      />
                    </div>

                    <div style={{ padding: "10px 12px" }}>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "#c8c3bc",
                          lineHeight: 1.45,
                          minHeight: 32,
                          overflow: "hidden",
                        }}
                      >
                        {gif.title || "Untitled GIF"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {loadingMore ? (
                <p style={{ marginTop: 14, fontSize: 12.5, color: "#8b847c" }}>
                  Loading more GIFs...
                </p>
              ) : null}

              {error ? (
                <p style={{ marginTop: 14, fontSize: 12.5, color: "#ff8b72" }}>
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
