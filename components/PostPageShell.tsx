"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import "../app/(main)/feed/feed.css";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";
import BackToFeedButton from "./BackToFeedButton";
import CommentGifPreview from "./CommentGifPreview";
import { CommunityBadge, FeedSidebar, FeedTopBar } from "./FeedChrome";
import ExternalAwareImage from "./ExternalAwareImage";
import GiphyPicker from "./GiphyPicker";
import IntentPrefetchLink from "./IntentPrefetchLink";
import MentionAutocompleteMenu from "./MentionAutocompleteMenu";
import MentionText from "./MentionText";
import ReportAction from "./ReportAction";
import RichPostBody from "./RichPostBody";
import SavePostButton from "./SavePostButton";
import { useMentionAutocomplete } from "./useMentionAutocomplete";
import { useResolvedMentions } from "./useResolvedMentions";
import { normalizePreviewImageUrl } from "../lib/previewImages";
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "../lib/youtube";
import type { CommentGif } from "../lib/commentGifs";
import { hasCommentContent } from "../lib/commentGifs";

type CommunityItem = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
};

type RailPost = {
  id: string;
  publicId: string;
  title: string;
  votes: number;
  community: string;
  communityDisplayName: string;
  communityColor: string;
  communityIcon: string;
  time: string;
};

type PostComment = {
  id: string;
  body: string;
  gif: CommentGif | null;
  mentions: string[];
  score: number;
  userVote: 1 | -1 | null;
  isHidden: boolean;
  isDeleted: boolean;
  isOwner: boolean;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  replies: PostComment[];
};

type CommentSort = "best" | "new" | "old";

type PostData = {
  id: string;
  publicId: string;
  title: string;
  body: string | null;
  bodyHtml: string | null;
  url: string | null;
  imageUrl: string | null;
  mentions: string[];
  createdAt: string;
  score: number;
  userVote: 1 | -1 | null;
  isSaved: boolean;
  isOwner: boolean;
  commentCount: number;
  author: {
    username: string;
    displayName: string | null;
  };
  community: {
    name: string;
    displayName: string;
    color: string;
    icon: string;
  };
  crosspostSource: {
    id: string;
    publicId: string;
    authorName: string;
    authorUsername: string;
    community: string;
    communityDisplayName: string;
    communityColor: string;
    communityIcon: string;
  } | null;
  comments: PostComment[];
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

function linkHost(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return value;
  }
}

function preferredPostImageUrl(
  imageUrl: string | null | undefined,
  url: string | null | undefined
) {
  const normalizedImageUrl = normalizePreviewImageUrl(imageUrl);

  if (normalizedImageUrl?.startsWith("/api/media/")) {
    return normalizedImageUrl;
  }

  return getYouTubeThumbnailUrl(url) || normalizedImageUrl || null;
}

function voteDirection(value: 1 | -1 | null | undefined) {
  return value === 1 ? "up" : value === -1 ? "dn" : null;
}

function timeAgo(dateString: string, nowMs: number) {
  const date = new Date(dateString);
  const seconds = Math.floor((nowMs - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function isCommentEditable(createdAt: string, nowMs: number) {
  return nowMs - new Date(createdAt).getTime() <= 60_000;
}

function sortComments(comments: PostComment[], sort: CommentSort) {
  const sorted = [...comments];

  sorted.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    if (sort === "old") return aTime - bTime;
    if (sort === "new") return bTime - aTime;

    return b.score - a.score || bTime - aTime;
  });

  return sorted;
}

function buildCommentMaps(
  comments: PostComment[],
  parentId: string | null = null,
  rootId: string | null = null,
  parentMap = new Map<string, string | null>(),
  rootMap = new Map<string, string>()
) {
  for (const comment of comments) {
    const nextRootId = rootId ?? comment.id;

    parentMap.set(comment.id, parentId);
    rootMap.set(comment.id, nextRootId);

    buildCommentMaps(
      comment.replies,
      comment.id,
      nextRootId,
      parentMap,
      rootMap
    );
  }

  return { parentMap, rootMap };
}

function getCommentHashId(commentId: string) {
  return `comment-${commentId}`;
}

function parseCommentHash(hash: string) {
  if (!hash.startsWith("#comment-")) return null;

  const commentId = hash.slice("#comment-".length).trim();
  return commentId ? decodeURIComponent(commentId) : null;
}

function serializeCommentGif(gif: CommentGif | null) {
  return gif
    ? {
        id: gif.id,
        provider: gif.provider,
        url: gif.url,
        title: gif.title ?? null,
        previewUrl: gif.previewUrl ?? null,
        width: gif.width ?? null,
        height: gif.height ?? null,
      }
    : null;
}

function getCommentAncestors(
  parentMap: Map<string, string | null>,
  commentId: string
) {
  const ancestors: string[] = [];
  let current = parentMap.get(commentId) ?? null;

  while (current) {
    ancestors.push(current);
    current = parentMap.get(current) ?? null;
  }

  return ancestors;
}

function MentionDraftHint({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  const { mentionedUsernames, resolvedMentions, unresolvedMentions, loading } =
    useResolvedMentions(text);

  if (mentionedUsernames.length === 0) return null;

  const infoParts: string[] = [];

  if (resolvedMentions.length > 0) {
    infoParts.push(
      `Will link and notify ${resolvedMentions
        .map((username) => `@${username}`)
        .join(", ")}`
    );
  }

  if (unresolvedMentions.length > 0) {
    infoParts.push(
      `No user found for ${unresolvedMentions
        .map((username) => `@${username}`)
        .join(", ")}`
    );
  }

  return (
    <div
      style={{
        marginTop: compact ? 8 : 10,
        padding: compact ? "8px 10px" : "9px 12px",
        borderRadius: 8,
        border: "1px solid #252424",
        background: "#141313",
        display: "grid",
        gap: 4,
      }}
    >
      <p
        style={{
          fontSize: compact ? 11.5 : 12,
          color: "#8b847c",
          lineHeight: 1.5,
        }}
      >
        {loading ? "Checking mentions..." : infoParts.join(". ")}
      </p>
    </div>
  );
}

function Votes({
  postId,
  n,
  initialVote,
  vertical = false,
  onError,
}: {
  postId: string;
  n: number;
  initialVote: 1 | -1 | null;
  vertical?: boolean;
  onError?: (message: string) => void;
}) {
  const [v, setV] = useState<"up" | "dn" | null>(voteDirection(initialVote));
  const [count, setCount] = useState(Number.isFinite(n) ? n : 0);
  const [pending, setPending] = useState(false);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#7a7774";
  const dir = vertical ? "column" : "row";

  async function handleVote(nextDirection: "up" | "dn") {
    if (pending) return;

    const prevVote = v;
    const prevCount = count;
    const nextVote = prevVote === nextDirection ? null : nextDirection;
    const nextCount =
      prevCount +
      (nextVote === "up" ? 1 : nextVote === "dn" ? -1 : 0) -
      (prevVote === "up" ? 1 : prevVote === "dn" ? -1 : 0);

    setV(nextVote);
    setCount(nextCount);
    setPending(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: postId,
          targetType: "post",
          value: nextVote === null ? 0 : nextDirection === "up" ? 1 : -1,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setV(prevVote);
        setCount(prevCount);
        onError?.(data?.error || "Vote failed");
        return;
      }

      setV(data?.userVote === 1 ? "up" : data?.userVote === -1 ? "dn" : null);
      setCount(typeof data?.score === "number" ? data.score : nextCount);
    } catch {
      setV(prevVote);
      setCount(prevCount);
      onError?.("Vote failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: dir,
        alignItems: "center",
        gap: vertical ? 1 : 3,
      }}
    >
      <button
        className={`vbtn up ${v === "up" ? "voted-up" : ""}`}
        onClick={() => void handleVote("up")}
        type="button"
      >
        ▲
      </button>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: col,
          minWidth: vertical ? 26 : 34,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-.01em",
        }}
      >
        {fmt(count)}
      </span>
      <button
        className={`vbtn dn ${v === "dn" ? "voted-dn" : ""}`}
        onClick={() => void handleVote("dn")}
        type="button"
      >
        ▼
      </button>
    </div>
  );
}

function CommentVotes({
  commentId,
  n,
  initialVote,
  onError,
}: {
  commentId: string;
  n: number;
  initialVote: 1 | -1 | null;
  onError?: (message: string) => void;
}) {
  const [v, setV] = useState<"up" | "dn" | null>(voteDirection(initialVote));
  const [count, setCount] = useState(Number.isFinite(n) ? n : 0);
  const [pending, setPending] = useState(false);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#545250";

  async function handleVote(nextDirection: "up" | "dn") {
    if (pending) return;

    const prevVote = v;
    const prevCount = count;
    const nextVote = prevVote === nextDirection ? null : nextDirection;
    const nextCount =
      prevCount +
      (nextVote === "up" ? 1 : nextVote === "dn" ? -1 : 0) -
      (prevVote === "up" ? 1 : prevVote === "dn" ? -1 : 0);

    setV(nextVote);
    setCount(nextCount);
    setPending(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId: commentId,
          targetType: "comment",
          value: nextVote === null ? 0 : nextDirection === "up" ? 1 : -1,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setV(prevVote);
        setCount(prevCount);
        onError?.(data?.error || "Vote failed");
        return;
      }

      setV(data?.userVote === 1 ? "up" : data?.userVote === -1 ? "dn" : null);
      setCount(typeof data?.score === "number" ? data.score : nextCount);
    } catch {
      setV(prevVote);
      setCount(prevCount);
      onError?.("Vote failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={`vbtn up ${v === "up" ? "voted-up" : ""}`}
        style={{ fontSize: 12 }}
        onClick={() => void handleVote("up")}
        type="button"
      >
        ▲
      </button>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: col,
          padding: "0 4px",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-.01em",
        }}
      >
        {fmt(count)}
      </span>
      <button
        className={`vbtn dn ${v === "dn" ? "voted-dn" : ""}`}
        style={{ fontSize: 12 }}
        onClick={() => void handleVote("dn")}
        type="button"
      >
        ▼
      </button>
    </>
  );
}

function RightRail({
  posts: initialPosts,
  excludePostId,
  createPostHref,
}: {
  posts: RailPost[];
  excludePostId: string;
  createPostHref: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [loadingPosts, setLoadingPosts] = useState(initialPosts.length === 0);

  useEffect(() => {
    setPosts(initialPosts);
    setLoadingPosts(initialPosts.length === 0);
  }, [initialPosts]);

  useEffect(() => {
    if (initialPosts.length > 0) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function loadPosts() {
      try {
        const res = await fetch(
          `/api/trending-rail?limit=5&excludePostId=${encodeURIComponent(excludePostId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const data = await res.json().catch(() => null);

        if (!res.ok || ignore) {
          return;
        }

        setPosts(Array.isArray(data?.posts) ? data.posts : []);
      } catch {
        // Best-effort after-paint enhancement.
      } finally {
        if (!ignore) {
          setLoadingPosts(false);
        }
      }
    }

    void loadPosts();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [excludePostId, initialPosts]);

  return (
    <aside className="feed-right">
      <div className="card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <p
          style={{
            fontSize: 12.5,
            color: "#525050",
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Join the conversation. Share what you know.
        </p>

        <IntentPrefetchLink
          href={createPostHref}
          style={{
            width: "100%",
            background: "#ff4826",
            border: "none",
            borderRadius: 9,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 13,
            fontWeight: 700,
            padding: "9px",
            cursor: "pointer",
            letterSpacing: ".03em",
            transition: "opacity .15s",
            boxShadow: "0 3px 14px rgba(255,72,38,.28)",
            display: "block",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          + Create Post
        </IntentPrefetchLink>

      </div>

      <div className="card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <h3
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#807c76",
            marginBottom: 14,
            letterSpacing: "-.01em",
          }}
        >
          Trending In The Void
        </h3>

        {loadingPosts && posts.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`trending-skeleton-${i}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "9px 0",
                  borderTop: i === 0 ? "none" : "1px solid #1a1a1a",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#2a2929",
                    width: 18,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {i + 1}
                </span>

                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      height: 14,
                      width: `${84 - i * 5}%`,
                      borderRadius: 6,
                      background: "#211f1f",
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: `${48 - i * 4}%`,
                      borderRadius: 999,
                      background: "#1b1a1a",
                      marginTop: 8,
                    }}
                  />
                </div>
              </div>
            ))
          : posts.slice(0, 5).map((p, i) => (
              <IntentPrefetchLink
                key={p.id}
                href={`/p/${p.publicId}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "9px 0",
                  borderTop: i === 0 ? "none" : "1px solid #1a1a1a",
                  cursor: "pointer",
                  transition: "opacity .15s",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#2a2929",
                    width: 18,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {i + 1}
                </span>

                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#8a8682",
                      lineHeight: 1.42,
                    }}
                  >
                    {p.title.length > 58 ? p.title.slice(0, 58) + "…" : p.title}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 4,
                      alignItems: "center",
                    }}
                  >
                    <CommunityBadge
                      name={p.community}
                      displayName={p.communityDisplayName}
                      color={p.communityColor}
                      icon={p.communityIcon}
                    />

                    <span style={{ fontSize: 10.5, color: "#383635" }}>
                      score {fmt(p.votes)}
                    </span>
                  </div>
                </div>
              </IntentPrefetchLink>
            ))}
      </div>
    </aside>
  );
}

function CommentComposer({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [selectedGif, setSelectedGif] = useState<CommentGif | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { resolvedMentions } = useResolvedMentions(body);
  const mentionAutocomplete = useMentionAutocomplete({
    text: body,
    selection,
    inputRef: textareaRef,
    onInsert: (nextText, nextCursor) => {
      setBody(nextText);
      setSelection({ start: nextCursor, end: nextCursor });
      if (submitState) setSubmitState(null);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedBody = body.trim();

    if (!hasCommentContent(trimmedBody, selectedGif)) {
      setSubmitState({
        tone: "error",
        message: "Add text or a GIF before posting your comment.",
      });
      return;
    }

    setLoading(true);
    setSubmitState(null);

    try {
      const res = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          body: trimmedBody,
          gif: serializeCommentGif(selectedGif),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitState({
          tone: "error",
          message:
            res.status === 401
              ? "Sign in to post a comment."
              : data?.error || "Failed to post comment.",
        });
        return;
      }

      setBody("");
      setSelectedGif(null);
      setSubmitState({ tone: "success", message: "Comment posted." });
      router.refresh();
    } catch {
      setSubmitState({
        tone: "error",
        message: "Something went wrong while posting your comment.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: "#484644", marginBottom: 10 }}>
          Comment as <span style={{ color: "#6a6764", fontWeight: 600 }}>you</span>
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSelection({
                start: e.currentTarget.selectionStart,
                end: e.currentTarget.selectionEnd,
              });
              if (submitState) setSubmitState(null);
            }}
            onSelect={(e) => {
              setSelection({
                start: e.currentTarget.selectionStart,
                end: e.currentTarget.selectionEnd,
              });
            }}
            onClick={(e) => {
              setSelection({
                start: e.currentTarget.selectionStart,
                end: e.currentTarget.selectionEnd,
              });
            }}
            onKeyDown={mentionAutocomplete.handleKeyDown}
            onBlur={(e) => {
              mentionAutocomplete.closeMenu();
              e.currentTarget.style.borderColor = "#252424";
            }}
            placeholder="Share your thoughts..."
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 8,
              padding: "11px 14px",
              color: "#b8b4ac",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 13.5,
              lineHeight: 1.6,
              resize: "vertical",
              minHeight: 88,
              outline: "none",
              transition: "border-color .2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,72,38,.35)";
            }}
          />

          <MentionAutocompleteMenu
            loading={mentionAutocomplete.loading}
            query={mentionAutocomplete.activeQuery}
            suggestions={mentionAutocomplete.suggestions}
            highlightedIndex={mentionAutocomplete.highlightedIndex}
            onSelect={mentionAutocomplete.selectSuggestion}
          />

          <MentionDraftHint text={body} />

          {selectedGif ? (
            <CommentGifPreview
              gif={selectedGif}
              onRemove={() => setSelectedGif(null)}
            />
          ) : null}

          {submitState ? (
            <p
              aria-live="polite"
              style={{
                fontSize: 12,
                marginTop: 10,
                color:
                  submitState.tone === "success" ? "#8aa37f" : "#ff8b72",
              }}
            >
              {submitState.tone === "success" ? "✓ " : ""}
              {submitState.message}
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 10,
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              className="act"
              type="button"
              onClick={() => {
                setPickerOpen(true);
                if (submitState) setSubmitState(null);
              }}
              style={{ border: "1px solid #242323", borderRadius: 7 }}
            >
              {selectedGif ? "Change GIF" : "GIF"}
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#ff4826",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontFamily: "var(--font-outfit), sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "7px 18px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity .15s",
                letterSpacing: ".02em",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      </div>

      <GiphyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(gif) => {
          setSelectedGif(gif);
          if (submitState) setSubmitState(null);
        }}
      />
    </>
  );
}

function ReplyComposer({
  postId,
  parentId,
  onCancel,
}: {
  postId: string;
  parentId: string;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [selectedGif, setSelectedGif] = useState<CommentGif | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { resolvedMentions } = useResolvedMentions(body);
  const mentionAutocomplete = useMentionAutocomplete({
    text: body,
    selection,
    inputRef: textareaRef,
    onInsert: (nextText, nextCursor) => {
      setBody(nextText);
      setSelection({ start: nextCursor, end: nextCursor });
      if (submitState) setSubmitState(null);
    },
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      textareaRef.current?.focus({ preventScroll: true });
    }, 40);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedBody = body.trim();

    if (!hasCommentContent(trimmedBody, selectedGif)) {
      setSubmitState({
        tone: "error",
        message: "Add text or a GIF before posting your reply.",
      });
      return;
    }

    setLoading(true);
    setSubmitState(null);

    try {
      const res = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          parentId,
          body: trimmedBody,
          gif: serializeCommentGif(selectedGif),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSubmitState({
          tone: "error",
          message:
            res.status === 401
              ? "Sign in to post a reply."
              : data?.error || "Failed to post reply.",
        });
        return;
      }

      setBody("");
      setSelectedGif(null);
      setSubmitState(null);
      onCancel();
      router.refresh();
    } catch {
      setSubmitState({
        tone: "error",
        message: "Something went wrong while posting your reply.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <p style={{ fontSize: 11.5, color: "#484644", marginBottom: 8 }}>
        Reply as <span style={{ color: "#6a6764", fontWeight: 600 }}>you</span>
      </p>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSelection({
            start: e.currentTarget.selectionStart,
            end: e.currentTarget.selectionEnd,
          });
          if (submitState) setSubmitState(null);
        }}
        onSelect={(e) => {
          setSelection({
            start: e.currentTarget.selectionStart,
            end: e.currentTarget.selectionEnd,
          });
        }}
        onClick={(e) => {
          setSelection({
            start: e.currentTarget.selectionStart,
            end: e.currentTarget.selectionEnd,
          });
        }}
        onKeyDown={mentionAutocomplete.handleKeyDown}
        onBlur={(e) => {
          mentionAutocomplete.closeMenu();
          e.currentTarget.style.borderColor = "#252424";
        }}
        placeholder="Write a reply..."
        style={{
          width: "100%",
          background: "#111010",
          border: "1px solid #252424",
          borderRadius: 8,
          padding: "10px 12px",
          color: "#b8b4ac",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 12.5,
          lineHeight: 1.6,
          resize: "vertical",
          minHeight: 72,
          outline: "none",
          transition: "border-color .2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,72,38,.35)";
        }}
      />

      <MentionAutocompleteMenu
        loading={mentionAutocomplete.loading}
        query={mentionAutocomplete.activeQuery}
        suggestions={mentionAutocomplete.suggestions}
        highlightedIndex={mentionAutocomplete.highlightedIndex}
        onSelect={mentionAutocomplete.selectSuggestion}
      />

      <MentionDraftHint text={body} compact />

      {selectedGif ? (
        <CommentGifPreview
          gif={selectedGif}
          compact
          onRemove={() => setSelectedGif(null)}
        />
      ) : null}

      {submitState ? (
        <p
          aria-live="polite"
          style={{
            fontSize: 11.5,
            marginTop: 8,
            color: submitState.tone === "success" ? "#8aa37f" : "#ff8b72",
          }}
        >
          {submitState.tone === "success" ? "✓ " : ""}
          {submitState.message}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          className="act"
          type="button"
          onClick={() => {
            setPickerOpen(true);
            if (submitState) setSubmitState(null);
          }}
          style={{ border: "1px solid #242323", borderRadius: 7 }}
        >
          {selectedGif ? "Change GIF" : "GIF"}
        </button>

        <button
          className="act"
          type="button"
          onClick={onCancel}
          style={{ border: "1px solid #242323", borderRadius: 7 }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#ff4826",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "7px 16px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s",
            letterSpacing: ".02em",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Posting..." : "Reply"}
        </button>
      </div>
      <GiphyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(gif) => {
          setSelectedGif(gif);
          if (submitState) setSubmitState(null);
        }}
      />
    </form>
  );
}

const CommentNode = memo(function CommentNode({
  comment,
  postId,
  postPublicId,
  depth = 0,
  nowMs,
  initialNowMs,
  replyingTo,
  collapsedReplies,
  highlightedCommentId,
  canReport,
  onReply,
  onCancelReply,
  onToggleReplies,
  onActionNotice,
}: {
  comment: PostComment;
  postId: string;
  postPublicId: string;
  depth?: number;
  nowMs: number;
  initialNowMs: number;
  replyingTo: string | null;
  collapsedReplies: Record<string, boolean>;
  highlightedCommentId: string | null;
  canReport: boolean;
  onReply: (commentId: string) => void;
  onCancelReply: () => void;
  onToggleReplies: (commentId: string) => void;
  onActionNotice: (notice: ActionNoticeState) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editGif, setEditGif] = useState<CommentGif | null>(comment.gif);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editWindowExpired, setEditWindowExpired] = useState(
    () =>
      new Date(comment.createdAt).getTime() + 60_000 <= initialNowMs
  );
  const isReply = depth > 0;
  const isReplying = !comment.isDeleted && replyingTo === comment.id;
  const hasReplies = comment.replies.length > 0;
  const repliesCollapsed = collapsedReplies[comment.id] ?? false;
  const showReplyThread = isReplying || (!repliesCollapsed && hasReplies);
  const canEdit =
    comment.isOwner &&
    !comment.isHidden &&
    !comment.isDeleted &&
    !editWindowExpired &&
    isCommentEditable(comment.createdAt, nowMs);
  const replyToggleLabel = repliesCollapsed
    ? `show ${comment.replies.length} ${
        comment.replies.length === 1 ? "reply" : "replies"
      }`
    : "hide replies";
  const authorLabel = comment.isDeleted
    ? "deleted"
    : comment.author.displayName || comment.author.username;
  const isHighlighted = highlightedCommentId === comment.id;

  useEffect(() => {
    if (!comment.isOwner || comment.isDeleted || editWindowExpired) return;

    const remainingMs =
      new Date(comment.createdAt).getTime() + 60_000 - Date.now();

    if (remainingMs <= 0) {
      setEditWindowExpired(true);
      setIsEditing(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEditWindowExpired(true);
      setIsEditing(false);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [comment.createdAt, comment.isDeleted, comment.isOwner, editWindowExpired]);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleShare() {
    const url = `${window.location.origin}/p/${postPublicId}#${getCommentHashId(comment.id)}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  async function handleSave() {
    if (pending) return;

    const body = editBody.trim();

    if (!hasCommentContent(body, editGif)) {
      onActionNotice({
        tone: "error",
        message: "Add text or a GIF before saving your comment.",
      });
      return;
    }

    setPending(true);

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
          gif: serializeCommentGif(editGif),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onActionNotice({
          tone: "error",
          message: data?.error || "Failed to update comment",
        });
        return;
      }

      setPickerOpen(false);
      setIsEditing(false);
      onActionNotice({
        tone: "success",
        message: "Comment updated.",
      });
      router.refresh();
    } catch {
      onActionNotice({
        tone: "error",
        message: "Failed to update comment",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (pending || !window.confirm("Delete this comment?")) return;

    setPending(true);

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onActionNotice({
          tone: "error",
          message: data?.error || "Failed to delete comment",
        });
        return;
      }

      onCancelReply();
      setPickerOpen(false);
      setIsEditing(false);
      onActionNotice({
        tone: "success",
        message: "Comment deleted.",
      });
      router.refresh();
    } catch {
      onActionNotice({
        tone: "error",
        message: "Failed to delete comment",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      id={getCommentHashId(comment.id)}
      style={{
        scrollMarginTop: 96,
        borderRadius: 12,
        background: isHighlighted ? "rgba(255, 72, 38, 0.09)" : "transparent",
        boxShadow: isHighlighted
          ? "inset 0 0 0 1px rgba(255, 72, 38, 0.24)"
          : "none",
        animation: isHighlighted
          ? "comment-target-blink 0.55s ease-in-out 3"
          : "none",
        transition: "background .18s ease, box-shadow .18s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        {comment.isDeleted ? (
          <span
            style={{
              fontSize: isReply ? 12 : 12.5,
              fontWeight: 600,
              color: "#b0aba4",
            }}
          >
            {authorLabel}
          </span>
        ) : (
            <Link
              href={`/u/${encodeURIComponent(comment.author.username)}`}
              prefetch={false}
              style={{
                fontSize: isReply ? 12 : 12.5,
                fontWeight: 600,
              color: "#b0aba4",
              textDecoration: "none",
            }}
          >
            {authorLabel}
          </Link>
        )}
        <span
          style={{
            fontSize: isReply ? 10.5 : 11,
            color: "#383635",
          }}
        >
          {timeAgo(comment.createdAt, nowMs)}
        </span>
      </div>

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            style={{
              width: "100%",
              background: "#111010",
              border: "1px solid #252424",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#b8b4ac",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: isReply ? 12.5 : 13.5,
              lineHeight: 1.6,
              resize: "vertical",
              minHeight: isReply ? 72 : 88,
              outline: "none",
              transition: "border-color .2s",
              marginBottom: 8,
            }}
          />

          {editGif ? (
            <CommentGifPreview
              gif={editGif}
              compact={isReply}
              onRemove={() => setEditGif(null)}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              flexWrap: "wrap",
            }}
          >
            <button
              className="act"
              style={{ fontSize: 11.5 }}
              type="button"
              onClick={() => setPickerOpen(true)}
            >
              {editGif ? "Change GIF" : "GIF"}
            </button>
            <button
              className="act"
              style={{ fontSize: 11.5 }}
              type="button"
              onClick={() => {
                setEditBody(comment.body);
                setEditGif(comment.gif);
                setPickerOpen(false);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className="act"
              style={{ fontSize: 11.5 }}
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save"}
            </button>
            {hasReplies ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => onToggleReplies(comment.id)}
              >
                {replyToggleLabel}
              </button>
            ) : null}
          </div>

          <GiphyPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(gif) => setEditGif(gif)}
          />
        </form>
      ) : (
        <>
          {comment.isDeleted || comment.isHidden || comment.body ? (
            <p
              style={{
                fontSize: isReply ? 12.5 : 13.5,
                lineHeight: isReply ? 1.65 : 1.67,
                color: "#9c9892",
                marginBottom: comment.gif && !comment.isDeleted && !comment.isHidden ? 10 : 7,
                whiteSpace: "pre-wrap",
              }}
            >
              {comment.isDeleted ? (
                "[deleted]"
              ) : comment.isHidden ? (
                "[removed by moderators]"
              ) : (
                <MentionText text={comment.body} mentions={comment.mentions} />
              )}
            </p>
          ) : null}

          {!comment.isDeleted && !comment.isHidden && comment.gif ? (
            <div style={{ marginBottom: 8 }}>
              <CommentGifPreview gif={comment.gif} compact={isReply} />
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            {!comment.isDeleted && !comment.isHidden ? (
              <CommentVotes
                commentId={comment.id}
                n={comment.score}
                initialVote={comment.userVote}
                onError={(message) =>
                  onActionNotice({ tone: "error", message })
                }
              />
            ) : null}
            {!comment.isDeleted && !comment.isHidden ? (
              <button
                className="act"
                style={{ fontSize: 11.5, marginLeft: 4 }}
                type="button"
                onClick={() => onReply(comment.id)}
              >
                ↩ Reply
              </button>
            ) : null}
            {hasReplies ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => onToggleReplies(comment.id)}
              >
                {replyToggleLabel}
              </button>
            ) : null}
            {!comment.isDeleted && !comment.isHidden ? (
              <>
                <button
                  className="act"
                  style={{ fontSize: 11.5 }}
                  type="button"
                  onClick={() => void handleShare()}
                >
                  {copied ? "✓ Copied" : "Share"}
                </button>
                {canReport ? (
                  <ReportAction
                    targetType="COMMENT"
                    targetId={comment.id}
                    onNotice={onActionNotice}
                    style={{ fontSize: 11.5 }}
                  />
                ) : null}
              </>
            ) : null}
            {comment.isOwner && !comment.isDeleted && !comment.isHidden && canEdit ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => {
                  onCancelReply();
                  setEditBody(comment.body);
                  setEditGif(comment.gif);
                  setPickerOpen(false);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            ) : null}
            {comment.isOwner && !comment.isDeleted && !comment.isHidden ? (
              <button
                className="act"
                style={{ fontSize: 11.5 }}
                type="button"
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            ) : null}
          </div>
        </>
      )}

      {showReplyThread ? (
        <div
          style={{
            marginTop: 12,
            marginLeft: 16,
            paddingLeft: 16,
            borderLeft: "1px solid #1e1e1e",
          }}
        >
          {isReplying ? (
            <ReplyComposer
              postId={postId}
              parentId={comment.id}
              onCancel={onCancelReply}
            />
          ) : null}

          {comment.replies.map((reply, index) => (
            <div
              key={reply.id}
              style={{
                marginTop: isReplying || index > 0 ? 12 : 0,
              }}
            >
              <CommentNode
                comment={reply}
                postId={postId}
                postPublicId={postPublicId}
                depth={depth + 1}
                nowMs={nowMs}
                initialNowMs={initialNowMs}
                replyingTo={replyingTo}
                collapsedReplies={collapsedReplies}
                highlightedCommentId={highlightedCommentId}
                canReport={canReport}
                onReply={onReply}
                onCancelReply={onCancelReply}
                onToggleReplies={onToggleReplies}
                onActionNotice={onActionNotice}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

const PostCommentSection = memo(function PostCommentSection({
  postId,
  postPublicId,
  comments,
  commentCount,
  initialNowMs,
  canReport,
  onActionNotice,
}: {
  postId: string;
  postPublicId: string;
  comments: PostComment[];
  commentCount: number;
  initialNowMs: number;
  canReport: boolean;
  onActionNotice: (notice: ActionNoticeState) => void;
}) {
  const [commentSort, setCommentSort] = useState<CommentSort>("best");
  const [visibleCommentCount, setVisibleCommentCount] = useState(20);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<
    Record<string, boolean>
  >({});
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const [hashTargetCommentId, setHashTargetCommentId] = useState<
    string | null
  >(null);
  const nowMs = initialNowMs;
  const sortedComments = useMemo(
    () => sortComments(comments, commentSort),
    [comments, commentSort]
  );
  const visibleComments = sortedComments.slice(0, visibleCommentCount);
  const hasMoreComments = sortedComments.length > visibleCommentCount;
  const { parentMap: commentParentMap, rootMap: commentRootMap } = useMemo(
    () => buildCommentMaps(comments),
    [comments]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncHashTarget = () => {
      setHashTargetCommentId(parseCommentHash(window.location.hash));
    };

    syncHashTarget();
    window.addEventListener("hashchange", syncHashTarget);

    return () => window.removeEventListener("hashchange", syncHashTarget);
  }, []);

  useEffect(() => {
    if (!hashTargetCommentId) return;

    const rootCommentId = commentRootMap.get(hashTargetCommentId);

    if (!rootCommentId) return;

    const ancestorIds = getCommentAncestors(
      commentParentMap,
      hashTargetCommentId
    );
    const needsExpansion = ancestorIds.some((id) => collapsedReplies[id]);
    const rootIndex = sortedComments.findIndex(
      (comment) => comment.id === rootCommentId
    );
    const requiredVisibleCount =
      rootIndex >= 0 ? Math.max(20, rootIndex + 1) : 20;
    const needsMoreVisible = visibleCommentCount < requiredVisibleCount;

    if (needsExpansion) {
      setCollapsedReplies((current) => {
        const next = { ...current };

        for (const ancestorId of ancestorIds) {
          if (next[ancestorId]) {
            next[ancestorId] = false;
          }
        }

        return next;
      });
    }

    if (needsMoreVisible) {
      setVisibleCommentCount((current) =>
        Math.max(current, requiredVisibleCount)
      );
    }

    if (needsExpansion || needsMoreVisible) return;

    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(
        getCommentHashId(hashTargetCommentId)
      );

      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setHighlightedCommentId(hashTargetCommentId);
      setHashTargetCommentId(null);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [
    collapsedReplies,
    commentParentMap,
    commentRootMap,
    hashTargetCommentId,
    sortedComments,
    visibleCommentCount,
  ]);

  useEffect(() => {
    if (!highlightedCommentId) return;

    const timeoutId = window.setTimeout(() => {
      setHighlightedCommentId((current) =>
        current === highlightedCommentId ? null : current
      );
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedCommentId]);

  function handleReply(commentId: string) {
    setCollapsedReplies((current) =>
      current[commentId]
        ? { ...current, [commentId]: false }
        : current
    );
    setReplyingTo((current) => (current === commentId ? null : commentId));
  }

  function toggleReplies(commentId: string) {
    setCollapsedReplies((current) => ({
      ...current,
      [commentId]: !current[commentId],
    }));
  }

  return (
    <>
      <CommentComposer postId={postId} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 17,
            fontWeight: 500,
            color: "#807c76",
            letterSpacing: "-.01em",
            whiteSpace: "nowrap",
          }}
        >
          {commentCount.toLocaleString()} Comments
        </h3>

        <div
          style={{
            flex: 1,
            height: 1,
            background: "linear-gradient(to right, #222, transparent)",
          }}
        />

        <select
          value={commentSort}
          onChange={(e) => {
            setCommentSort(e.target.value as CommentSort);
            setVisibleCommentCount(20);
          }}
          style={{
            background: "#181717",
            border: "1px solid #252424",
            borderRadius: 6,
            color: "#6a6764",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "4px 10px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {[
            { value: "best", label: "Best" },
            { value: "new", label: "New" },
            { value: "old", label: "Old" },
          ].map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {comments.length > 0 ? (
        <div>
          {visibleComments.map((comment) => (
            <div
              key={comment.id}
              className="cmt-wrap"
              style={{ marginTop: 14 }}
            >
              <CommentNode
                comment={comment}
                postId={postId}
                postPublicId={postPublicId}
                nowMs={nowMs}
                initialNowMs={initialNowMs}
                replyingTo={replyingTo}
                collapsedReplies={collapsedReplies}
                highlightedCommentId={highlightedCommentId}
                canReport={canReport}
                onReply={handleReply}
                onCancelReply={() => setReplyingTo(null)}
                onToggleReplies={toggleReplies}
                onActionNotice={onActionNotice}
              />
            </div>
          ))}

          {hasMoreComments ? (
            <button
              className="act"
              type="button"
              onClick={() =>
                setVisibleCommentCount((count) => count + 20)
              }
              style={{ marginTop: 16 }}
            >
              Show more comments
            </button>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            color: "#343331",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>◎</div>
          <p style={{ fontSize: 14 }}>No comments yet — be first.</p>
        </div>
      )}
    </>
  );
});

export default function PostPageShell({
  post,
  communities,
  railPosts,
  backHref,
  renderedAt,
  notificationUnreadCount,
  currentUser,
}: {
  post: PostData;
  communities: CommunityItem[];
  railPosts: RailPost[];
  backHref: string;
  renderedAt: string;
  notificationUnreadCount: number;
  currentUser: {
    username: string;
    displayName: string | null;
  } | null;
}) {
  const router = useRouter();
  const initialNowMs = new Date(renderedAt).getTime();
  const nowMs = initialNowMs;
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNoticeState | null>(
    null
  );
  const [editingPost, setEditingPost] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postPending, setPostPending] = useState(false);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(post.url);
  const fallbackPostImageUrl = preferredPostImageUrl(post.imageUrl, post.url);

  useEffect(() => {
    if (!actionNotice) return;

    const timeoutId = window.setTimeout(() => {
      setActionNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  async function handlePostSave() {
    if (postPending) return;

    const update = postBody.trim();

    if (!update) {
      setActionNotice({
        tone: "error",
        message: "Update is required.",
      });
      return;
    }

    setPostPending(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          update,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setActionNotice({
          tone: "error",
          message: data?.error || "Failed to update post",
        });
        return;
      }

      setPostBody("");
      setEditingPost(false);
      setActionNotice({
        tone: "success",
        message: "Update added.",
      });
      router.refresh();
    } catch {
      setActionNotice({
        tone: "error",
        message: "Failed to update post",
      });
    } finally {
      setPostPending(false);
    }
  }

  async function handlePostDelete() {
    if (postPending || !window.confirm("Delete this post?")) return;

    setPostPending(true);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setActionNotice({
          tone: "error",
          message: data?.error || "Failed to delete post",
        });
        return;
      }

      router.push(backHref);
      router.refresh();
    } catch {
      setActionNotice({
        tone: "error",
        message: "Failed to delete post",
      });
    } finally {
      setPostPending(false);
    }
  }

  return (
    <div className="feed-shell">
      {actionNotice ? <ActionNotice {...actionNotice} /> : null}

      <FeedTopBar
        mode="post"
        currentUser={currentUser}
        notificationUnreadCount={notificationUnreadCount}
      />

      <div className="feed-container">
        <FeedSidebar
          mode="post"
          communities={communities}
          activeCommunity={post.community.name}
        />

        <main className="feed-main">
          <div style={{ animation: "rise .3s ease" }}>
            <BackToFeedButton fallbackHref={backHref} />

            <div
              className="card"
              style={{ padding: "26px 30px", marginBottom: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                <CommunityBadge
                  name={post.community.name}
                  displayName={post.community.displayName}
                  color={post.community.color}
                  icon={post.community.icon}
                  href={`/feed?community=${encodeURIComponent(post.community.name)}`}
                />

                <span style={{ fontSize: 12, color: "#464442" }}>
                  <IntentPrefetchLink
                    href={`/u/${encodeURIComponent(post.author.username)}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    u/{post.author.displayName || post.author.username}
                  </IntentPrefetchLink>{" "}
                  · {timeAgo(post.createdAt, nowMs)}
                </span>
              </div>

              {post.crosspostSource ? (
                <IntentPrefetchLink
                  href={`/p/${post.crosspostSource.publicId}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 14,
                    color: "#8a8682",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    textDecoration: "none",
                  }}
                >
                  <span>⇄</span>
                  <span>
                    Crossposted from {post.crosspostSource.communityDisplayName} by u/
                    {post.crosspostSource.authorName}
                  </span>
                </IntentPrefetchLink>
              ) : null}

              {editingPost ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handlePostSave();
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6a6764",
                      marginBottom: 10,
                    }}
                  >
                    Add an update to this post. The original post text will stay unchanged.
                  </p>

                  <textarea
                    value={postBody}
                    onChange={(e) => setPostBody(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#111010",
                      border: "1px solid #252424",
                      borderRadius: 8,
                      padding: "11px 14px",
                      color: "#b8b4ac",
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: 15,
                      lineHeight: 1.78,
                      resize: "vertical",
                      minHeight: 120,
                      outline: "none",
                      marginBottom: 12,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 22,
                    }}
                  >
                    <button
                      className="act"
                      type="button"
                      onClick={() => {
                        setPostBody("");
                        setEditingPost(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button className="act" type="submit" disabled={postPending}>
                      {postPending ? "Posting..." : "Post update"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                    <h1 className="detail-title">
                      <MentionText text={post.title} mentions={post.mentions} />
                    </h1>

                  {post.bodyHtml ? (
                    <div style={{ marginBottom: 22 }}>
                      <RichPostBody html={post.bodyHtml} mentions={post.mentions} />
                    </div>
                  ) : post.body ? (
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.78,
                        color: "#8a8682",
                        marginBottom: 22,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <MentionText text={post.body} mentions={post.mentions} />
                    </p>
                  ) : null}

                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="post-source-link"
                      style={{
                        marginBottom: 22,
                        fontSize: 13,
                      }}
                    >
                      <span>↗</span>
                      <span>View on {linkHost(post.url)}</span>
                    </a>
                  ) : null}

                  {youtubeEmbedUrl ? (
                    <div
                      style={{
                        marginBottom: 22,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid #1f1f1f",
                        background: "#111010",
                        aspectRatio: "16 / 9",
                      }}
                    >
                      <iframe
                        src={youtubeEmbedUrl}
                        title={post.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          display: "block",
                        }}
                      />
                    </div>
                  ) : fallbackPostImageUrl ? (
                    <a
                      href={fallbackPostImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        marginBottom: 22,
                      }}
                    >
                      <div
                        style={{
                          maxHeight: 640,
                          borderRadius: 16,
                          border: "1px solid #1f1f1f",
                          background: "#111010",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "min(70vh, 640px)",
                          }}
                        >
                          <ExternalAwareImage
                            src={fallbackPostImageUrl}
                            alt={post.title}
                            priority
                            sizes="(max-width: 900px) calc(100vw - 64px), 760px"
                            fit="scale-down"
                          />
                        </div>
                      </div>
                    </a>
                  ) : null}
                </>
              )}

              <div
                style={{
                  paddingTop: 18,
                  borderTop: "1px solid #1e1e1e",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Votes
                  postId={post.id}
                  n={post.score}
                  initialVote={post.userVote}
                  onError={(message) =>
                    setActionNotice({ tone: "error", message })
                  }
                />
                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "#252424",
                    margin: "0 4px",
                  }}
                />
                <button className="act" type="button">
                  ◎ {(post.commentCount ?? 0).toLocaleString()} comments
                </button>
<button
  className="act"
  type="button"
  onClick={async () => {
    const url = `${window.location.origin}/p/${post.publicId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }}
>
  {copied ? "✓ Copied" : "↗ Share"}
</button>
                {currentUser ? (
                  <ReportAction
                    targetType="POST"
                    targetId={post.id}
                    onNotice={setActionNotice}
                  />
                ) : null}
                {post.isOwner && !editingPost ? (
                  <button
                    className="act"
                    type="button"
                    onClick={() => {
                      setPostBody("");
                      setEditingPost(true);
                    }}
                  >
                    Add update
                  </button>
                ) : null}
                {post.isOwner && !editingPost ? (
                  <IntentPrefetchLink
                    href={`/submit?crosspost=${encodeURIComponent(post.id)}`}
                    className="act"
                    style={{ textDecoration: "none" }}
                  >
                    Crosspost
                  </IntentPrefetchLink>
                ) : null}
                {post.isOwner && !editingPost ? (
                  <button
                    className="act"
                    type="button"
                    onClick={() => void handlePostDelete()}
                  >
                    Delete
                  </button>
                ) : null}
                <SavePostButton
                  postId={post.id}
                  initialSaved={post.isSaved}
                  onNotice={setActionNotice}
                />
              </div>
            </div>

            <PostCommentSection
              postId={post.id}
              postPublicId={post.publicId}
              comments={post.comments}
              commentCount={post.commentCount ?? 0}
              initialNowMs={initialNowMs}
              canReport={Boolean(currentUser)}
              onActionNotice={setActionNotice}
            />
          </div>
        </main>

        <RightRail
          posts={railPosts}
          excludePostId={post.id}
          createPostHref={`/submit?community=${encodeURIComponent(post.community.name)}`}
        />
      </div>
    </div>
  );
}
