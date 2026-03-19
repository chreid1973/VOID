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

type CommentNode = {
  id: string;
  author: string;
  body: string;
  votes: number;
  time: string;
  replies: CommentNode[];
};

type FeedClientProps = {
  initialPosts: FeedPost[];
  communities: FeedCommunity[];
};

const mockComments: Record<string, CommentNode[]> = {
  "4": [
    {
      id: "c1",
      author: "indieGameFan",
      body: "Seven years is insane commitment. What kept you going during the darkest moments? I've been working on my game for 2 years and I'm already questioning everything.",
      votes: 2847,
      time: "22h",
      replies: [
        {
          id: "c1-1",
          author: "solo_devloper",
          body: "Honestly? Stubbornness more than inspiration. There were months where I'd open the engine, stare at it, close it, and call that a 'work session.' But the game kept nagging at me like an unfinished sentence. I couldn't abandon it without knowing the ending.",
          votes: 1923,
          time: "21h",
          replies: [
            {
              id: "c1-1-1",
              author: "perpetualWIP",
              body: "\"Like an unfinished sentence\" that's going in my notes. That's the most accurate description of creative compulsion I've ever read. Screenshotted.",
              votes: 445,
              time: "20h",
              replies: [
                {
                  id: "c1-1-1-1",
                  author: "quietcoder99",
                  body: "Same. This whole thread is saved.",
                  votes: 112,
                  time: "19h",
                  replies: [],
                },
              ],
            },
            {
              id: "c1-1-2",
              author: "gamedev_veteran",
              body: "This is why shipping matters, even imperfect. The stubbornness loop is both a gift and a trap. Did you ever consider early access?",
              votes: 389,
              time: "20h",
              replies: [
                {
                  id: "c1-1-2-1",
                  author: "solo_devloper",
                  body: "Many times. Decided against it. My game is heavily story-driven. Spoilers would have killed the launch. Some genres suit early access, mine really didn't.",
                  votes: 521,
                  time: "19h",
                  replies: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const fmt = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
};

const norm = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const avatar = (name: string) => ({
  background: `hsl(${(name.charCodeAt(0) * 9) % 360}, 55%, 42%)`,
  label: name[0]?.toUpperCase() ?? "?",
});

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

function Comment({ c, depth = 0 }: { c: CommentNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const av = avatar(c.author);
  const hasReplies = c.replies?.length > 0;

  return (
    <div className="cmt-wrap" style={{ marginTop: depth === 0 ? 14 : 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: av.background,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10.5,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {av.label}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#b0aba4" }}>
          {c.author}
        </span>
        <span style={{ fontSize: 11, color: "#383635" }}>{c.time} ago</span>
        {hasReplies && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#404040",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: "var(--font-outfit), sans-serif",
              transition: "color .15s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "#ff4826";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "#404040";
            }}
          >
            {open
              ? "[−]"
              : `[+] ${c.replies.length} repl${
                  c.replies.length > 1 ? "ies" : "y"
                }`}
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.67,
          color: "#9c9892",
          paddingLeft: 31,
          marginBottom: 7,
        }}
      >
        {c.body}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          paddingLeft: 27,
        }}
      >
        <button className="vbtn up" style={{ fontSize: 12 }}>
          ▲
        </button>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "#545250",
            padding: "0 4px",
          }}
        >
          {fmt(c.votes)}
        </span>
        <button className="vbtn dn" style={{ fontSize: 12 }}>
          ▼
        </button>
        <button className="act" style={{ fontSize: 11.5, marginLeft: 4 }}>
          ↩ Reply
        </button>
        <button className="act" style={{ fontSize: 11.5 }}>
          Share
        </button>
      </div>

      {hasReplies && open && (
        <div className="cmt-thread">
          {c.replies.map((r) => (
            <Comment key={r.id} c={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  p,
  onClick,
  idx,
  communities,
}: {
  p: FeedPost;
  onClick: () => void;
  idx: number;
  communities: FeedCommunity[];
}) {
  return (
    <div
      className="card post-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        padding: "18px 22px",
        animationDelay: `${idx * 0.055}s`,
        cursor: "pointer",
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

          <Link href={`/post/${p.id}`} style={{ textDecoration: "none" }}>
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
            <button className="act">
              ◎ {(p.comments ?? 0).toLocaleString()} comments
            </button>
            <button className="act">↗ Share</button>
            <button className="act">☆ Save</button>
            <button className="act">⋯</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetail({
  p,
  onBack,
  communities,
}: {
  p: FeedPost;
  onBack: () => void;
  communities: FeedCommunity[];
}) {
  const cmts = mockComments[p.id] || [];

  return (
    <div style={{ animation: "rise .3s ease" }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "1px solid #242323",
          borderRadius: 7,
          color: "#6a6764",
          fontFamily: "var(--font-outfit), sans-serif",
          fontSize: 12.5,
          fontWeight: 500,
          padding: "5px 13px",
          cursor: "pointer",
          marginBottom: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          transition: "all .15s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = "#c8c4bc";
          e.currentTarget.style.borderColor = "#383636";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = "#6a6764";
          e.currentTarget.style.borderColor = "#242323";
        }}
      >
        ← Back to feed
      </button>

      <div className="card" style={{ padding: "26px 30px", marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
            marginBottom: 14,
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

          <span style={{ fontSize: 12, color: "#464442" }}>
            u/{p.author} · {p.time} ago
          </span>
        </div>

        <h1 className="detail-title">{p.title}</h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.78,
            color: "#8a8682",
            marginBottom: 22,
          }}
        >
          {p.body}
        </p>

        <div
          style={{
            paddingTop: 18,
            borderTop: "1px solid #1e1e1e",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Votes n={p.votes} />
          <div
            style={{ width: 1, height: 18, background: "#252424", margin: "0 4px" }}
          />
          <button className="act">
            ◎ {(p.comments ?? 0).toLocaleString()} comments
          </button>
          <button className="act">↗ Share</button>
          <button className="act">☆ Save</button>
          <button className="act">⋯ More</button>
        </div>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: "#484644", marginBottom: 10 }}>
          Comment as <span style={{ color: "#6a6764", fontWeight: 600 }}>you</span>
        </p>

        <textarea
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
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#252424";
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 10,
            gap: 8,
          }}
        >
          <button
            className="act"
            style={{ border: "1px solid #242323", borderRadius: 7 }}
          >
            Preview
          </button>

          <button
            style={{
              background: "#ff4826",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 18px",
              cursor: "pointer",
              transition: "opacity .15s",
              letterSpacing: ".02em",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = ".82";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Post Comment
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
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
          {(p.comments ?? 0).toLocaleString()} Comments
        </h3>

        <div
          style={{
            flex: 1,
            height: 1,
            background: "linear-gradient(to right, #222, transparent)",
          }}
        />

        <select
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
          {["Best", "Top", "New", "Controversial"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      {cmts.length > 0 ? (
        <div>
          {cmts.map((c) => (
            <Comment key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#343331" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>◎</div>
          <p style={{ fontSize: 14 }}>No comments yet — be first.</p>
        </div>
      )}
    </div>
  );
}

function Sidebar({
  sel,
  setSel,
  setView,
  communities,
}: {
  sel: string | null;
  setSel: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
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
          onClick={() => {
            setSel(item.id);
            setView("home");
          }}
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
          onClick={() => {
            setSel(c.name);
            setView("home");
          }}
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
  setView,
}: {
  q: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  setSel: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [sort, setSort] = useState("Hot");

  return (
    <header className="feed-topbar">
      <div
        onClick={() => {
          setSel(null);
          setView("home");
        }}
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
  onPostClick,
  posts,
  communities,
}: {
  onPostClick: (p: FeedPost) => void;
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
          <div
            key={p.id}
            onClick={() => onPostClick(p)}
            style={{
              display: "flex",
              gap: 10,
              padding: "9px 0",
              borderTop: i === 0 ? "none" : "1px solid #1a1a1a",
              cursor: "pointer",
              transition: "opacity .15s",
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
          </div>
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
  const [view, setView] = useState("home");
  const [post, setPost] = useState<FeedPost | null>(null);
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

  const go = (p: FeedPost) => {
    setPost(p);
    setView("post");
    window.scrollTo(0, 0);
  };

  return (
    <div className="feed-shell">
      <TopBar q={q} setQ={setQ} setSel={setSel} setView={setView} />

      <div className="feed-container">
        <Sidebar
          sel={sel}
          setSel={setSel}
          setView={setView}
          communities={communities}
        />

        <main className="feed-main">
          {view === "home" ? (
            <>
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
                    <PostCard
                      key={p.id}
                      p={p}
                      idx={i}
                      onClick={() => go(p)}
                      communities={communities}
                    />
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
            </>
          ) : (
            post && (
              <PostDetail
                p={post}
                onBack={() => setView("home")}
                communities={communities}
              />
            )
          )}
        </main>

        {view === "home" && (
          <RightRail onPostClick={go} posts={posts} communities={communities} />
        )}
      </div>
    </div>
  );
}