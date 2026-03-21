"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import "../app/(main)/feed/feed.css";
import { ActionNotice, type ActionNoticeState } from "./ActionNotice";
import { CommunityBadge, FeedSidebar, FeedTopBar } from "./FeedChrome";
import ReportAction from "./ReportAction";
import SavePostButton from "./SavePostButton";

type FeedPost = {
  id: string;
  publicId: string;
  community: string;
  title: string;
  body: string;
  url: string | null;
  imageUrl: string | null;
  authorName: string;
  authorUsername: string;
  votes: number;
  userVote: 1 | -1 | null;
  comments: number;
  time: string;
  flair?: string | null;
  flairColor?: string | null;
  isSaved: boolean;
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
};

type FeedRailPost = {
  id: string;
  publicId: string;
  title: string;
  votes: number;
  community: string;
};

type FeedCommunity = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
};

type FeedScope = "home" | "following" | "popular" | "all";
type FeedSort = "hot" | "new" | "top" | "rising";

type FeedClientProps = {
  initialPosts: FeedPost[];
  communities: FeedCommunity[];
  initialSelectedCommunity: string | null;
  initialScope: FeedScope;
  initialSort: FeedSort;
  initialQuery: string;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isPersonalizedHome: boolean;
  followedAuthorCount: number;
  railPosts: FeedRailPost[];
  currentUser: {
    username: string;
    displayName: string | null;
  } | null;
};

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
};

const voteDirection = (value: 1 | -1 | null | undefined) =>
  value === 1 ? "up" : value === -1 ? "dn" : null;

const norm = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const linkHost = (value: string | null | undefined) => {
  if (!value) return null;

  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return value;
  }
};

function Badge({
  cid,
  communities,
}: {
  cid: string;
  communities: FeedCommunity[];
}) {
  const c = communities.find((x) => norm(x.name) === norm(cid));
  if (!c) return null;

  return (
    <CommunityBadge
      name={c.name}
      displayName={c.displayName}
      color={c.color}
      icon={c.icon}
    />
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

  async function handleVote(
    nextDirection: "up" | "dn",
    e?: React.MouseEvent<HTMLButtonElement>
  ) {
    e?.stopPropagation();
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
        onClick={(e) => void handleVote("up", e)}
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
        onClick={(e) => void handleVote("dn", e)}
        type="button"
      >
        ▼
      </button>
    </div>
  );
}

function PostCard({
  p,
  idx,
  communities,
  canReport,
  onVoteError,
  onActionNotice,
}: {
  p: FeedPost;
  idx: number;
  communities: FeedCommunity[];
  canReport: boolean;
  onVoteError: (message: string) => void;
  onActionNotice: (notice: ActionNoticeState) => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="card post-card"
      style={{
        padding: "18px 22px",
        animationDelay: `${idx * 0.055}s`,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ paddingTop: 2, flexShrink: 0 }}>
          <Votes
            postId={p.id}
            n={p.votes}
            initialVote={p.userVote}
            vertical
            onError={onVoteError}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <Badge cid={p.community} communities={communities} />

            {p.flair && (
              <span
                className="tag"
                style={{
                  background: (p.flairColor ?? "#ff4826") + "1e",
                  color: p.flairColor ?? "#ff4826",
                }}
              >
                {p.flair}
              </span>
            )}

            <Link
              href={`/u/${encodeURIComponent(p.authorUsername)}`}
              style={{ fontSize: 11.5, color: "#3d3c3a", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              u/<span style={{ color: "#565451" }}>{p.authorName}</span>
            </Link>

            <span style={{ fontSize: 11.5, color: "#2d2c2b" }}>·</span>

            <span style={{ fontSize: 11.5, color: "#3d3c3a" }}>
              {p.time} ago
            </span>
          </div>

          {p.crosspostSource ? (
            <Link
              href={`/p/${p.crosspostSource.publicId}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
                color: "#8a8682",
                fontSize: 12.5,
                lineHeight: 1.5,
                textDecoration: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span>⇄</span>
              <span>
                Crossposted from {p.crosspostSource.communityDisplayName} by u/
                {p.crosspostSource.authorName}
              </span>
            </Link>
          ) : null}

          <Link
            href={`/p/${p.publicId}`}
            aria-label={`Open post: ${p.title}`}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >

            <h2 className="post-title">{p.title}</h2>

            {p.url ? (
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#7a726a",
                  marginBottom: p.body || p.imageUrl ? 10 : 12,
                }}
              >
                ↗ {linkHost(p.url)}
              </p>
            ) : null}

            {p.body || p.imageUrl ? (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {p.body ? (
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#4d4b49",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.body}
                  </p>
                ) : null}

                {p.imageUrl ? (
                  <a
                    href={p.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        maxHeight: 320,
                        objectFit: "cover",
                        display: "block",
                        borderRadius: 12,
                        border: "1px solid #1f1f1f",
                        background: "#111010",
                      }}
                    />
                  </a>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link
              href={`/p/${p.publicId}`}
              className="act"
              style={{ textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              ◎ {(p.comments ?? 0).toLocaleString()} comments
            </Link>
            <button
              className="act"
              onClick={async (e) => {
                e.stopPropagation();
                const url = `${window.location.origin}/p/${p.publicId}`;

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
            {canReport ? (
              <ReportAction
                targetType="POST"
                targetId={p.id}
                onNotice={onActionNotice}
              />
            ) : null}
            <SavePostButton
              postId={p.id}
              initialSaved={p.isSaved}
              onNotice={onActionNotice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RightRail({
  posts,
  trendingPosts,
  communities,
}: {
  posts: FeedPost[];
  trendingPosts: FeedRailPost[];
  communities: FeedCommunity[];
}) {
  return (
    <aside className="feed-right">
      <div className="card" style={{ padding: "16px 18px", marginBottom: 14 }}>
        <p style={{ fontSize: 12.5, color: "#525050", marginBottom: 12, lineHeight: 1.5 }}>
          Join the conversation. Share what you know.
        </p>

        <Link
          href="/submit"
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
        </Link>

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

        {trendingPosts.map((p, i) => (
          <Link
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
              <p style={{ fontSize: 12, fontWeight: 500, color: "#8a8682", lineHeight: 1.42 }}>
                {p.title.length > 58 ? p.title.slice(0, 58) + "…" : p.title}
              </p>

              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                <Badge cid={p.community} communities={communities} />
                <span style={{ fontSize: 10.5, color: "#383635" }}>
                  score {fmt(p.votes)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function CommunityMembershipButton({
  community,
  onNotice,
}: {
  community: FeedCommunity;
  onNotice: (notice: ActionNoticeState) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;

    setPending(true);

    try {
      const res = await fetch(`/api/communities/${community.id}/membership`, {
        method: community.isMember ? "DELETE" : "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        onNotice({
          tone: "error",
          message: data?.error || "Failed to update community membership.",
        });
        return;
      }

      onNotice({
        tone: "success",
        message: community.isMember
          ? `Left ${community.displayName}.`
          : `Joined ${community.displayName}.`,
      });
      router.refresh();
    } catch {
      onNotice({
        tone: "error",
        message: "Failed to update community membership.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      style={{
        background: community.isMember ? "none" : "#ff4826",
        border: community.isMember ? "1px solid #252424" : "none",
        borderRadius: 9,
        color: community.isMember ? "#d8d2ca" : "#fff",
        fontFamily: "var(--font-outfit), sans-serif",
        fontSize: 12.5,
        fontWeight: 700,
        padding: "8px 14px",
        cursor: pending ? "not-allowed" : "pointer",
        transition: "opacity .15s, transform .1s",
        letterSpacing: ".03em",
        boxShadow: community.isMember
          ? "none"
          : "0 3px 14px rgba(255,72,38,.28)",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending
        ? community.isMember
          ? "Leaving..."
          : "Joining..."
        : community.isMember
          ? "Leave"
          : "Join"}
    </button>
  );
}

export default function FeedClient({
  initialPosts,
  communities,
  initialSelectedCommunity,
  initialScope,
  initialSort,
  initialQuery,
  currentPage,
  hasNextPage,
  hasPreviousPage,
  isPersonalizedHome,
  followedAuthorCount,
  railPosts,
  currentUser,
}: FeedClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [actionNotice, setActionNotice] = useState<ActionNoticeState | null>(
    null
  );
  const sel =
    initialSelectedCommunity ??
    (initialScope === "following"
      ? "__following"
      : initialScope === "popular"
        ? "__popular"
        : initialScope === "all"
          ? "__all"
          : null);
  const selectedCommunity = initialSelectedCommunity
    ? communities.find(
        (community) => norm(community.name) === norm(initialSelectedCommunity)
      ) ?? null
    : null;

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!actionNotice) return;

    const timeoutId = window.setTimeout(() => {
      setActionNotice(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalizedQuery = q.trim();
      const currentQuery = initialQuery.trim();

      if (normalizedQuery === currentQuery) return;

      const params = new URLSearchParams(searchParams.toString());

      if (normalizedQuery) {
        params.set("q", normalizedQuery);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [initialQuery, pathname, q, router, searchParams]);

  function updateFeedParams(
    updates: Record<string, string | null | undefined>,
    replace = false
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;

    if (replace) {
      router.replace(nextUrl, { scroll: false });
      return;
    }

    router.push(nextUrl, { scroll: false });
  }

  function handleSelect(selection: string | null) {
    if (selection === null) {
      updateFeedParams({ community: null, scope: null, page: null });
      return;
    }

    if (selection === "__popular") {
      updateFeedParams({ community: null, scope: "popular", page: null });
      return;
    }

    if (selection === "__following") {
      updateFeedParams({ community: null, scope: "following", page: null });
      return;
    }

    if (selection === "__all") {
      updateFeedParams({ community: null, scope: "all", page: null });
      return;
    }

    updateFeedParams({ community: selection, scope: null, page: null });
  }

  function handleSortChange(sort: FeedSort) {
    updateFeedParams({ sort, page: null });
  }

  function handlePageChange(nextPage: number) {
    updateFeedParams({ page: nextPage > 1 ? String(nextPage) : null });
  }

  return (
    <div className="feed-shell">
      {actionNotice ? <ActionNotice {...actionNotice} /> : null}

      <FeedTopBar
        mode="feed"
        q={q}
        sort={initialSort}
        onQueryChange={setQ}
        onSortChange={handleSortChange}
        onHomeClick={() => handleSelect(null)}
        currentUser={currentUser}
      />

      <div className="feed-container">
        <FeedSidebar
          mode="feed"
          sel={sel}
          onSelect={handleSelect}
          communities={communities}
        />

        <main className="feed-main">
          <div style={{ marginBottom: 20 }}>
            {selectedCommunity ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: selectedCommunity.color + "1e",
                      color: selectedCommunity.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    {selectedCommunity.icon}
                  </div>

                  <div>
                    <h1
                      style={{
                        fontFamily: "var(--font-fraunces), Georgia, serif",
                        fontSize: 21,
                        fontWeight: 600,
                        color: "#e8e3db",
                        letterSpacing: "-.02em",
                      }}
                    >
                      {selectedCommunity.displayName}
                    </h1>
                    <p style={{ fontSize: 11.5, color: "#484644", marginTop: 2 }}>
                      {selectedCommunity.memberCount.toLocaleString()} members ·{" "}
                      {selectedCommunity.postCount.toLocaleString()} posts
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <CommunityMembershipButton
                    community={selectedCommunity}
                    onNotice={setActionNotice}
                  />
                ) : null}
              </div>
            ) : initialScope === "popular" ? (
              <div>
                <h1 className="feed-title">Popular Posts</h1>
                <p style={{ fontSize: 12, color: "#55514d", marginTop: 4 }}>
                  Posts with activity across all communities.
                </p>
              </div>
            ) : initialScope === "following" ? (
              <div>
                <h1 className="feed-title">Following</h1>
                <p style={{ fontSize: 12, color: "#55514d", marginTop: 4 }}>
                  {currentUser
                    ? followedAuthorCount > 0
                      ? "Posts from the people you follow."
                      : "Follow posters you like to build this feed."
                    : "Sign in to follow users and build a personalized feed."}
                </p>
              </div>
            ) : initialScope === "all" ? (
              <div>
                <h1 className="feed-title">All Posts</h1>
                <p style={{ fontSize: 12, color: "#55514d", marginTop: 4 }}>
                  Every community, ordered by the sort you choose.
                </p>
              </div>
            ) : (
              <div>
                <h1 className="feed-title">Home Feed</h1>
                <p style={{ fontSize: 12, color: "#55514d", marginTop: 4 }}>
                  {isPersonalizedHome
                    ? "Posts from the communities you joined."
                    : "Latest posts across the network. Join communities to personalize this feed."}
                </p>
              </div>
            )}
          </div>

          {initialPosts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {initialPosts.map((p, i) => (
                <PostCard
                  key={p.id}
                  p={p}
                  idx={i}
                  communities={communities}
                  canReport={Boolean(currentUser)}
                  onVoteError={(message) =>
                    setActionNotice({ tone: "error", message })
                  }
                  onActionNotice={setActionNotice}
                />
              ))}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <button
                  className="act"
                  type="button"
                  disabled={!hasPreviousPage}
                  onClick={() => handlePageChange(currentPage - 1)}
                  style={{
                    border: "1px solid #242323",
                    borderRadius: 7,
                    opacity: hasPreviousPage ? 1 : 0.45,
                    cursor: hasPreviousPage ? "pointer" : "not-allowed",
                  }}
                >
                  ← Previous
                </button>

                <span style={{ fontSize: 12, color: "#5f5b57" }}>
                  Page {currentPage}
                </span>

                <button
                  className="act"
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                  style={{
                    border: "1px solid #242323",
                    borderRadius: 7,
                    opacity: hasNextPage ? 1 : 0.45,
                    cursor: hasNextPage ? "pointer" : "not-allowed",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#343331" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
              <p style={{ fontSize: 14 }}>Nothing here yet.</p>
              <p style={{ fontSize: 12, marginTop: 5, color: "#282726" }}>
                {initialScope === "following"
                  ? currentUser
                    ? followedAuthorCount > 0
                      ? "Try a different sort or check back later."
                      : "Follow a few posters and their posts will show up here."
                    : "Sign in to follow users and build this feed."
                  : "Try a different filter or community."}
              </p>
            </div>
          )}
        </main>

        <RightRail
          posts={initialPosts}
          trendingPosts={railPosts}
          communities={communities}
        />
      </div>
    </div>
  );
}
