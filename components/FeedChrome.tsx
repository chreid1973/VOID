"use client";

import Link from "next/link";

type CommunityNavItem = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
};

type FeedSort = "hot" | "new" | "top" | "rising";

type CommunityBadgeProps = {
  name: string;
  displayName: string;
  color: string;
  icon: string;
  href?: string;
};

type TopBarCurrentUser = {
  username: string;
  displayName: string | null;
};

type FeedTopBarProps =
  | {
      mode: "feed";
      q: string;
      sort: FeedSort;
      onQueryChange: (value: string) => void;
      onSortChange: (sort: FeedSort) => void;
      onHomeClick: () => void;
      currentUser: TopBarCurrentUser | null;
    }
  | {
      mode: "post";
      currentUser: TopBarCurrentUser | null;
    };

type FeedSidebarProps =
  | {
      mode: "feed";
      sel: string | null;
      onSelect: (selection: string | null) => void;
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
  const sortOptions = [
    ["🔥", "hot", "Hot"],
    ["✦", "new", "New"],
    ["▲", "top", "Top"],
    ["↑", "rising", "Rising"],
  ] as const;

  return (
    <header className="feed-topbar">
      {props.mode === "feed" ? (
        <div
          onClick={props.onHomeClick}
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
            onChange={(e) => props.onQueryChange(e.target.value)}
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
          ? sortOptions.map(([ic, value, label]) => (
                <button
                  key={value}
                  className={`srt ${props.sort === value ? "on" : ""}`}
                  onClick={() => props.onSortChange(value)}
                  type="button"
                >
                  {props.sort === value ? `${ic} ${label}` : label}
                </button>
              ))
          : sortOptions.map(([, value, label], i) => (
              <Link
                key={value}
                href={`/feed?sort=${value}`}
                className={`srt ${i === 0 ? "on" : ""}`}
                style={{ textDecoration: "none" }}
              >
                {label.toUpperCase()}
              </Link>
            ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {props.currentUser ? (
          <Link
            href={`/u/${encodeURIComponent(props.currentUser.username)}`}
            style={{
              background: "none",
              border: "1px solid #252424",
              borderRadius: 8,
              color: "#d8d2ca",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "6px 14px",
              cursor: "pointer",
              transition: "all .15s",
              letterSpacing: ".02em",
              textDecoration: "none",
            }}
            title={
              props.currentUser.displayName
                ? `${props.currentUser.displayName} · u/${props.currentUser.username}`
                : `u/${props.currentUser.username}`
            }
          >
            u/{props.currentUser.username}
          </Link>
        ) : props.mode === "feed" ? (
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
          { id: "__following", icon: "◎", label: "Following" },
          { id: "__popular", icon: "🔥", label: "Popular" },
          { id: "__all", icon: "✦", label: "All Posts" },
        ].map((item) => (
          <div
            key={String(item.id)}
            className={`com-item ${props.sel === item.id ? "active" : ""}`}
            onClick={() => props.onSelect(item.id)}
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

          <Link
            href="/feed?scope=popular"
            className="com-item"
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 13 }}>🔥</span>
            Popular
          </Link>

          <Link
            href="/feed?scope=following"
            className="com-item"
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 13 }}>◎</span>
            Following
          </Link>

          <Link
            href="/feed?scope=all"
            className="com-item"
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 13 }}>✦</span>
            All Posts
          </Link>
        </>
      )}

      <div className="sect-label">Communities</div>

      {props.communities.map((c) =>
        props.mode === "feed" ? (
          <div
            key={c.id}
            className={`com-item ${norm(props.sel) === norm(c.name) ? "active" : ""}`}
            onClick={() => props.onSelect(c.name)}
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
            <span
              style={{
                fontSize: 10.5,
                color: "#625c55",
                fontWeight: 600,
                letterSpacing: ".01em",
              }}
            >
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
            <span
              style={{
                fontSize: 10.5,
                color: "#625c55",
                fontWeight: 600,
                letterSpacing: ".01em",
              }}
            >
              {c.postCount}p · {c.memberCount}m
            </span>
          </Link>
        )
      )}

      <div style={{ marginTop: 28, padding: "0 10px" }}>
        <p style={{ fontSize: 10, color: "#5f5a54", lineHeight: 1.7 }}>
          © 2026 Void — a better internet
          <br />
          Privacy · Terms · Help · Careers ·{" "}
          <Link
            href="/moderation-philosophy"
            style={{ color: "#7b746c", textDecoration: "none" }}
          >
            Moderation
          </Link>
        </p>
      </div>
    </aside>
  );
}
