"use client";

import Link from "next/link";
import { useState } from "react";

type CommunityNavItem = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
};

type CommunityBadgeProps = {
  name: string;
  displayName: string;
  color: string;
  icon: string;
  href?: string;
};

type FeedTopBarProps =
  | {
      mode: "feed";
      q: string;
      setQ: React.Dispatch<React.SetStateAction<string>>;
      setSel: React.Dispatch<React.SetStateAction<string | null>>;
    }
  | {
      mode: "post";
    };

type FeedSidebarProps =
  | {
      mode: "feed";
      sel: string | null;
      setSel: React.Dispatch<React.SetStateAction<string | null>>;
      communities: CommunityNavItem[];
    }
  | {
      mode: "post";
      activeCommunity: string;
      communities: CommunityNavItem[];
    };

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function CommunityBadge({
  name,
  displayName,
  color,
  icon,
  href,
}: CommunityBadgeProps) {
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        fontWeight: 600,
        color,
        padding: "2px 8px 2px 5px",
        background: color + "18",
        borderRadius: 20,
      }}
    >
      <span style={{ fontSize: 9.5 }}>{icon}</span>
      {displayName}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function FeedTopBar(props: FeedTopBarProps) {
  const [sort, setSort] = useState("Hot");

  return (
    <header className="feed-topbar">
      {props.mode === "feed" ? (
        <div
          onClick={() => props.setSel(null)}
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
      ) : (
        <Link
          href="/feed"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            flexShrink: 0,
            userSelect: "none",
            textDecoration: "none",
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
        </Link>
      )}

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

        {props.mode === "feed" ? (
          <input
            className="si"
            type="text"
            placeholder="Search posts, communities, users…"
            value={props.q}
            onChange={(e) => props.setQ(e.target.value)}
          />
        ) : (
          <input
            className="si"
            type="text"
            placeholder="Search posts, communities, users…"
            readOnly
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {props.mode === "feed"
          ? [["🔥", "Hot"], ["✦", "New"], ["▲", "Top"], ["↑", "Rising"]].map(
              ([ic, s]) => (
                <button
                  key={s}
                  className={`srt ${sort === s ? "on" : ""}`}
                  onClick={() => setSort(s)}
                >
                  {sort === s ? `${ic} ${s}` : s}
                </button>
              )
            )
          : ["HOT", "NEW", "TOP", "RISING"].map((s, i) => (
              <button key={s} className={`srt ${i === 0 ? "on" : ""}`} type="button">
                {s}
              </button>
            ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {props.mode === "feed" ? (
          <>
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
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
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
                textDecoration: "none",
              }}
            >
              Log in
            </Link>

            <Link
              href="/sign-up"
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
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function FeedSidebar(props: FeedSidebarProps) {
  const activeCommunity = props.mode === "feed" ? props.sel : props.activeCommunity;

  return (
    <aside className="feed-sidebar">
      <div className="sect-label" style={{ marginTop: 8 }}>
        Navigate
      </div>

      {props.mode === "feed" ? (
        [
          { id: null, icon: "⌂", label: "Home Feed" },
          { id: "__popular", icon: "🔥", label: "Popular" },
          { id: "__all", icon: "✦", label: "All Posts" },
        ].map((item) => (
          <div
            key={String(item.id)}
            className={`com-item ${props.sel === item.id ? "active" : ""}`}
            onClick={() => props.setSel(item.id)}
            style={{ cursor: "pointer" }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </div>
        ))
      ) : (
        <>
          <Link
            href="/feed"
            className="com-item"
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 13 }}>⌂</span>
            Home Feed
          </Link>

          <div className="com-item">
            <span style={{ fontSize: 13 }}>🔥</span>
            Popular
          </div>

          <div className="com-item">
            <span style={{ fontSize: 13 }}>✦</span>
            All Posts
          </div>
        </>
      )}

      <div className="sect-label">Communities</div>

      {props.communities.map((c) =>
        props.mode === "feed" ? (
          <div
            key={c.id}
            className={`com-item ${norm(props.sel) === norm(c.name) ? "active" : ""}`}
            onClick={() => props.setSel(c.name)}
            style={
              norm(props.sel) === norm(c.name)
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
        ) : (
          <Link
            key={c.id}
            href={`/feed?community=${encodeURIComponent(c.name)}`}
            className={`com-item ${
              norm(activeCommunity) === norm(c.name) ? "active" : ""
            }`}
            style={
              norm(activeCommunity) === norm(c.name)
                ? {
                    color: c.color,
                    background: c.color + "12",
                    cursor: "pointer",
                    textDecoration: "none",
                  }
                : { cursor: "pointer", textDecoration: "none" }
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
          </Link>
        )
      )}

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
