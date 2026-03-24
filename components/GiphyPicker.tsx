"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CommentGif } from "../lib/commentGifs";

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim() ?? "";
const RESULT_LIMIT = 18;

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

async function loadGifs(query: string, signal: AbortSignal) {
  const endpoint = query
    ? "https://api.giphy.com/v1/gifs/search"
    : "https://api.giphy.com/v1/gifs/trending";
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(RESULT_LIMIT),
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

  const payload = (await response.json()) as { data?: GiphyApiGif[] };
  return Array.isArray(payload.data)
    ? payload.data.map(mapGifResult).filter(Boolean) as GiphyPickerGif[]
    : [];
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!GIPHY_API_KEY) {
      setResults([]);
      setLoading(false);
      setError("Set NEXT_PUBLIC_GIPHY_API_KEY to search GIPHY.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void loadGifs(trimmedQuery, controller.signal)
        .then((nextResults) => {
          setResults(nextResults);
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            return;
          }

          setResults([]);
          setError(err instanceof Error ? err.message : "Failed to load GIFs.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [open, trimmedQuery]);

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
            {trimmedQuery ? `Showing GIFs for “${trimmedQuery}”.` : "Showing trending GIFs."} Powered by GIPHY.
          </p>
        </div>

        <div
          style={{
            padding: "16px 20px 20px",
            overflowY: "auto",
          }}
        >
          {loading ? (
            <p style={{ fontSize: 13, color: "#8b847c" }}>Loading GIFs...</p>
          ) : error ? (
            <p style={{ fontSize: 13, color: "#ff8b72" }}>{error}</p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8b847c" }}>
              No GIFs found. Try another search.
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
