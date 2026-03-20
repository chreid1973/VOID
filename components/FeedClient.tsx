"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../app/(main)/feed/feed.css";
import { CommunityBadge, FeedSidebar, FeedTopBar } from "./FeedChrome";

type FeedPost = {
  id: string;
  community: string;
  title: string;
  body: string;
  url: string | null;
  imageUrl: string | null;
  author: string;
  votes: number;
  userVote: 1 | -1 | null;
  comments: number;
  time: string;
  flair?: string | null;
  flairColor?: string | null;
};

type FeedCommunity = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
};

type FeedClientProps = {
  initialPosts: FeedPost[];
  communities: FeedCommunity[];
  initialSelectedCommunity: string | null;
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
const INITIAL_VISIBLE_POSTS = 20;

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
}: {
  postId: string;
  n: number;
  initialVote: 1 | -1 | null;
  vertical?: boolean;
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
        alert(data?.error || "Vote failed");
        return;
      }

      setV(data?.userVote === 1 ? "up" : data?.userVote === -1 ? "dn" : null);
      setCount(typeof data?.score === "number" ? data.score : nextCount);
    } catch {
      setV(prevVote);
      setCount(prevCount);
      alert("Vote failed");
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
}: {
  p: FeedPost;
  idx: number;
  communities: FeedCommunity[];
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
          <Votes postId={p.id} n={p.votes} initialVote={p.userVote} vertical />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/p/${p.id}`}
            aria-label={`Open post: ${p.title}`}
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
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

              <span style={{ fontSize: 11.5, color: "#3d3c3a" }}>
                u/<span style={{ color: "#565451" }}>{p.author}</span>
              </span>

              <span style={{ fontSize: 11.5, color: "#2d2c2b" }}>·</span>

              <span style={{ fontSize: 11.5, color: "#3d3c3a" }}>
                {p.time} ago
              </span>
            </div>

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
                ) : null}
              </div>
            ) : null}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link
              href={`/p/${p.id}`}
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
                const url = `${window.location.origin}/p/${p.id}`;

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
            <button className="act">☆ Save</button>
            <button className="act">⋯</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightRail({
  posts,
  communities,
}: {
  posts: FeedPost[];
  communities: FeedCommunity[];
}) {
  const totalMembers = communities.reduce((sum, c) => sum + c.memberCount, 0);
  const totalPosts = communities.reduce((sum, c) => sum + c.postCount, 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments ?? 0), 0);

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

        <button
          style={{
            width: "100%",
            marginTop: 8,
            background: "none",
            border: "1px solid #242323",
            borderRadius: 9,
            color: "#6a6764",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: "8px",
            cursor: "pointer",
            transition: "all .15s",
            letterSpacing: ".02em",
          }}
        >
          + Create Community
        </button>
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
          Trending Today
        </h3>

        {posts.slice(0, 5).map((p, i) => (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
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
                <span style={{ fontSize: 10.5, color: "#383635" }}>{fmt(p.votes)} pts</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <h3
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: "#807c76",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: "linear-gradient(135deg, #ff4826, #ff8040)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
            }}
          >
            ◈
          </span>
          void · Stats
        </h3>

        {[
          { k: "Total Members", v: totalMembers.toLocaleString() },
          { k: "Communities", v: communities.length.toLocaleString() },
          { k: "Posts Loaded", v: totalPosts.toLocaleString() },
          { k: "Comments Loaded", v: totalComments.toLocaleString() },
        ].map((s, i) => (
          <div
            key={s.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 0",
              borderTop: i === 0 ? "none" : "1px solid #181818",
            }}
          >
            <span style={{ fontSize: 11.5, color: "#484644" }}>{s.k}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#706d69" }}>{s.v}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function FeedClient({
  initialPosts,
  communities,
  initialSelectedCommunity,
  currentUser,
}: FeedClientProps) {
  const [sel, setSel] = useState<string | null>(initialSelectedCommunity);
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_POSTS);

  const posts = initialPosts;

  const feed = posts.filter((p) => {
    const byCom =
      !sel ||
      sel === "__popular" ||
      sel === "__all" ||
      norm(p.community) === norm(sel);

    const byQ =
      !q ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.body.toLowerCase().includes(q.toLowerCase()) ||
      (p.url ?? "").toLowerCase().includes(q.toLowerCase()) ||
      p.author.toLowerCase().includes(q.toLowerCase());

    return byCom && byQ;
  });
  const visibleFeed = feed.slice(0, visibleCount);
  const hasMorePosts = feed.length > visibleCount;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_POSTS);
  }, [sel, q]);

  return (
    <div className="feed-shell">
      <FeedTopBar
        mode="feed"
        q={q}
        setQ={setQ}
        setSel={setSel}
        currentUser={currentUser}
      />

      <div className="feed-container">
        <FeedSidebar mode="feed" sel={sel} setSel={setSel} communities={communities} />

        <main className="feed-main">
          <div style={{ marginBottom: 20 }}>
            {sel && sel !== "__popular" && sel !== "__all" ? (
              (() => {
                const c = communities.find((x) => norm(x.name) === norm(sel));
                return c ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: c.color + "1e",
                        color: c.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {c.icon}
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
                        {c.displayName}
                      </h1>
                      <p style={{ fontSize: 11.5, color: "#484644", marginTop: 2 }}>
                        {c.memberCount.toLocaleString()} members ·{" "}
                        {c.postCount.toLocaleString()} posts
                      </p>
                    </div>
                  </div>
                ) : null;
              })()
            ) : (
              <h1 className="feed-title">Today's best conversations</h1>
            )}
          </div>

          {feed.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleFeed.map((p, i) => (
                <PostCard key={p.id} p={p} idx={i} communities={communities} />
              ))}

              {hasMorePosts ? (
                <button
                  className="act"
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + INITIAL_VISIBLE_POSTS)
                  }
                  style={{ alignSelf: "flex-start", marginTop: 6 }}
                >
                  Show more posts
                </button>
              ) : null}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#343331" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
              <p style={{ fontSize: 14 }}>Nothing here yet.</p>
              <p style={{ fontSize: 12, marginTop: 5, color: "#282726" }}>
                Try a different filter or community.
              </p>
            </div>
          )}
        </main>

        <RightRail posts={posts} communities={communities} />
      </div>
    </div>
  );
}
