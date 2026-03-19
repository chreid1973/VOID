"use client";

import Link from "next/link";
import { useState } from "react";
import "../app/(main)/feed/feed.css";

type FeedPost = {
  id: string;
  community: string;
  title: string;
  body: string;
  author: string;
  votes: number;
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
};

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
};

const norm = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        fontWeight: 600,
        color: c.color,
        padding: "2px 8px 2px 5px",
        background: c.color + "18",
        borderRadius: 20,
      }}
    >
      <span style={{ fontSize: 9.5 }}>{c.icon}</span>
      {c.displayName}
    </span>
  );
}

function Votes({ n, vertical = false }: { n: number; vertical?: boolean }) {
  const [v, setV] = useState<"up" | "dn" | null>(null);
  const base = Number.isFinite(n) ? n : 0;
  const count = base + (v === "up" ? 1 : v === "dn" ? -1 : 0);
  const col = v === "up" ? "#ff4826" : v === "dn" ? "#5b8dee" : "#7a7774";
  const dir = vertical ? "column" : "row";

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
        onClick={(e) => {
          e.stopPropagation();
          setV(v === "up" ? null : "up");
        }}
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
        onClick={(e) => {
          e.stopPropagation();
          setV(v === "dn" ? null : "dn");
        }}
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
          <Votes n={p.votes} vertical />
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

            <span style={{ fontSize: 11.5, color: "#3d3c3a" }}>
              u/<span style={{ color: "#565451" }}>{p.author}</span>
            </span>

            <span style={{ fontSize: 11.5, color: "#2d2c2b" }}>·</span>

            <span style={{ fontSize: 11.5, color: "#3d3c3a" }}>
              {p.time} ago
            </span>
          </div>

          <Link href={`/p/${p.id}`} style={{ textDecoration: "none" }}>
            <h2 className="post-title">{p.title}</h2>
          </Link>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "#4d4b49",
              marginBottom: 12,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.body}
          </p>

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

function Sidebar({
  sel,
  setSel,
  communities,
}: {
  sel: string | null;
  setSel: React.Dispatch<React.SetStateAction<string | null>>;
  communities: FeedCommunity[];
}) {
  return (
    <aside className="feed-sidebar">
      <div className="sect-label" style={{ marginTop: 8 }}>
        Navigate
      </div>

      {[
        { id: null, icon: "⌂", label: "Home Feed" },
        { id: "__popular", icon: "🔥", label: "Popular" },
        { id: "__all", icon: "✦", label: "All Posts" },
      ].map((item) => (
        <div
          key={String(item.id)}
          className={`com-item ${sel === item.id ? "active" : ""}`}
          onClick={() => setSel(item.id)}
          style={{ cursor: "pointer" }}
        >
          <span style={{ fontSize: 13 }}>{item.icon}</span>
          {item.label}
        </div>
      ))}

      <div className="sect-label">Communities</div>

      {communities.map((c) => (
        <div
          key={c.id}
          className={`com-item ${norm(sel) === norm(c.name) ? "active" : ""}`}
          onClick={() => setSel(c.name)}
          style={
            norm(sel) === norm(c.name)
              ? { color: c.color, background: c.color + "12", cursor: "pointer" }
              : { cursor: "pointer" }
          }
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: c.color + "1c",
              color: c.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {c.icon}
          </span>
          <span style={{ flex: 1 }}>{c.displayName}</span>
          <span style={{ fontSize: 10, color: "#2e2d2c" }}>
            {c.postCount}p · {c.memberCount}m
          </span>
        </div>
      ))}

      <div style={{ marginTop: 28, padding: "0 10px" }}>
        <p style={{ fontSize: 10, color: "#2c2b2a", lineHeight: 1.7 }}>
          © 2026 Void — a better internet
          <br />
          Privacy · Terms · Help · Careers
        </p>
      </div>
    </aside>
  );
}

function TopBar({
  q,
  setQ,
  setSel,
}: {
  q: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  setSel: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const [sort, setSort] = useState("Hot");

  return (
    <header className="feed-topbar">
      <div
        onClick={() => setSel(null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "linear-gradient(135deg, #ff4826 0%, #ff8040 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            boxShadow: "0 2px 10px rgba(255,72,38,.35)",
          }}
        >
          ◈
        </div>

        <span
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#ede8e0",
            letterSpacing: "-.04em",
            lineHeight: 1,
          }}
        >
          void
        </span>
      </div>

      <div style={{ width: 1, height: 22, background: "#1e1d1d", flexShrink: 0 }} />

      <div style={{ flex: 1, maxWidth: 460, position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#484644",
            fontSize: 15,
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>

        <input
          className="si"
          type="text"
          placeholder="Search posts, communities, users…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {[["🔥", "Hot"], ["✦", "New"], ["▲", "Top"], ["↑", "Rising"]].map(
          ([ic, s]) => (
            <button
              key={s}
              className={`srt ${sort === s ? "on" : ""}`}
              onClick={() => setSort(s)}
            >
              {sort === s ? `${ic} ${s}` : s}
            </button>
          )
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          style={{
            background: "none",
            border: "1px solid #252424",
            borderRadius: 8,
            color: "#6a6764",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 14px",
            cursor: "pointer",
            transition: "all .15s",
            letterSpacing: ".02em",
          }}
        >
          Log in
        </button>

        <button
          style={{
            background: "#ff4826",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "6px 16px",
            cursor: "pointer",
            transition: "opacity .15s, transform .1s",
            letterSpacing: ".03em",
            boxShadow: "0 2px 10px rgba(255,72,38,.3)",
          }}
        >
          Sign up
        </button>
      </div>
    </header>
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
}: FeedClientProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");

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
      p.author.toLowerCase().includes(q.toLowerCase());

    return byCom && byQ;
  });

  return (
    <div className="feed-shell">
      <TopBar q={q} setQ={setQ} setSel={setSel} />

      <div className="feed-container">
        <Sidebar sel={sel} setSel={setSel} communities={communities} />

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
              {feed.map((p, i) => (
                <PostCard key={p.id} p={p} idx={i} communities={communities} />
              ))}
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
