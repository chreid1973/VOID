"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlobalSearchBox from "./GlobalSearchBox";
import IntentPrefetchLink from "./IntentPrefetchLink";

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
      sort: FeedSort;
      onSortChange: (sort: FeedSort) => void;
      onHomeClick: () => void;
      homeHref: string;
      getSortHref: (sort: FeedSort) => string;
      onPrefetchHref: (href: string) => void;
      currentUser: TopBarCurrentUser | null;
      notificationUnreadCount: number;
    }
  | {
      mode: "post";
      currentUser: TopBarCurrentUser | null;
      notificationUnreadCount: number;
    }
  | {
      mode: "search";
      searchInitialValue: string;
      currentUser: TopBarCurrentUser | null;
      notificationUnreadCount: number;
    };

type FeedSidebarProps =
  | {
      mode: "feed";
      sel: string | null;
      onSelect: (selection: string | null) => void;
      getSelectionHref: (selection: string | null) => string;
      onPrefetchHref: (href: string) => void;
      communities: CommunityNavItem[];
    }
  | {
      mode: "post";
      activeCommunity: string;
      communities: CommunityNavItem[];
    };

const COMMUNITY_GROUPS = [
  {
    label: "SocialVOID",
    communityNames: ["void-announcements"],
  },
  {
    label: "Entertainment",
    communityNames: ["memes", "movies-tv", "gaming", "music"],
  },
  {
    label: "Tech",
    communityNames: ["tech", "ai", "programming"],
  },
  {
    label: "Ideas",
    communityNames: ["questions", "interesting", "science", "space", "philosophy"],
  },
  {
    label: "World",
    communityNames: ["news", "history", "travel"],
  },
  {
    label: "Living",
    communityNames: ["sports", "food"],
  },
  {
    label: "Culture",
    communityNames: ["design", "art", "photography", "books"],
  },
] as const;

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function BrandWordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0,
        fontFamily: "var(--font-fraunces), Georgia, serif",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-.04em",
        lineHeight: 1,
      }}
    >
      <span style={{ color: "#ede8e0" }}>Social</span>
      <span style={{ color: "#ff6d36" }}>VOID</span>
    </span>
  );
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
    <IntentPrefetchLink href={href} style={{ textDecoration: "none" }}>
      {content}
    </IntentPrefetchLink>
  );
}

export function FeedTopBar(props: FeedTopBarProps) {
  const [unreadCount, setUnreadCount] = useState(props.notificationUnreadCount);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortOptions = [
    ["🔥", "hot", "Hot"],
    ["✦", "new", "New"],
    ["▲", "top", "Top"],
    ["↑", "rising", "Rising"],
  ] as const;

  useEffect(() => {
    setUnreadCount(props.notificationUnreadCount);
  }, [props.notificationUnreadCount]);

  useEffect(() => {
    if (!props.currentUser) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    void fetch("/api/notifications/unread-count", {
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || typeof data?.count !== "number") return;
        setUnreadCount(data.count);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [props.currentUser?.username]);

  useEffect(() => {
    if (!searchOpen && !sortOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSearchOpen(false);
      setSortOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen, sortOpen]);

  const mobileProfileLabel = (props.currentUser?.displayName ??
    props.currentUser?.username ??
    "U")
    .charAt(0)
    .toUpperCase();

  return (
    <>
    <header className="feed-topbar">
      {props.mode === "feed" ? (
        <div
          onClick={props.onHomeClick}
          onMouseEnter={() => props.onPrefetchHref(props.homeHref)}
          onTouchStart={() => props.onPrefetchHref(props.homeHref)}
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

          <BrandWordmark />
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

          <BrandWordmark />
        </Link>
      )}

      <div
        className="feed-topbar-divider"
        style={{ width: 1, height: 22, background: "#1e1d1d", flexShrink: 0 }}
      />

      <div
        className="feed-topbar-desktop-search"
        style={{
          width: "min(460px, 100%)",
          flexShrink: 0,
          position: "relative",
        }}
      >
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

        <GlobalSearchBox
          initialValue={props.mode === "search" ? props.searchInitialValue : ""}
        />
      </div>

      <div
        className="feed-topbar-center"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 18px",
        }}
      >
        {props.mode === "feed" ? (
          <div style={{ display: "flex", gap: 4 }}>
            {sortOptions.map(([ic, value, label]) => (
              <button
                key={value}
                className={`srt ${props.sort === value ? "on" : ""}`}
                onClick={() => props.onSortChange(value)}
                onMouseEnter={() => props.onPrefetchHref(props.getSortHref(value))}
                onFocus={() => props.onPrefetchHref(props.getSortHref(value))}
                onTouchStart={() => props.onPrefetchHref(props.getSortHref(value))}
                type="button"
              >
                {props.sort === value ? `${ic} ${label}` : label}
              </button>
            ))}
          </div>
        ) : props.mode === "post" ? (
          <div style={{ display: "flex", gap: 4 }}>
            {sortOptions.map(([, value, label], i) => (
              <IntentPrefetchLink
                key={value}
                href={`/feed?sort=${value}`}
                className={`srt ${i === 0 ? "on" : ""}`}
                style={{ textDecoration: "none" }}
              >
                {label.toUpperCase()}
              </IntentPrefetchLink>
            ))}
          </div>
        ) : null}
      </div>

      <div className="feed-topbar-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {props.currentUser ? (
          <>
            <Link
              href="/notifications"
              style={{
                position: "relative",
                background: "none",
                border: "1px solid #252424",
                borderRadius: 8,
                color: "#d8d2ca",
                fontFamily: "var(--font-outfit), sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 12px",
                cursor: "pointer",
                transition: "all .15s",
                letterSpacing: ".02em",
                textDecoration: "none",
                minWidth: 42,
                textAlign: "center",
              }}
              title={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : "Notifications"
              }
            >
              🔔
              {unreadCount > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#ff4826",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "18px",
                    padding: "0 5px",
                    boxShadow: "0 2px 10px rgba(255,72,38,.28)",
                  }}
                >
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </Link>

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
          </>
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

      <div className="feed-topbar-mobile-actions">
        <button
          type="button"
          className="mobile-topbar-btn"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          ⌕
        </button>

        {props.mode === "feed" ? (
          <button
            type="button"
            className="mobile-topbar-btn"
            onClick={() => setSortOpen(true)}
            aria-label="Sort feed"
          >
            ⇅
          </button>
        ) : null}

        {props.currentUser ? (
          <>
            <Link
              href="/notifications"
              className="mobile-topbar-btn"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : "Notifications"
              }
              style={{ position: "relative" }}
            >
              🔔
              {unreadCount > 0 ? (
                <span className="mobile-topbar-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>

            <Link
              href={`/u/${encodeURIComponent(props.currentUser.username)}`}
              className="mobile-topbar-btn mobile-topbar-profile"
              aria-label={`Open profile for ${props.currentUser.username}`}
            >
              {mobileProfileLabel}
            </Link>
          </>
        ) : (
          <Link
            href="/sign-in"
            className="mobile-topbar-btn mobile-topbar-btn--auth"
          >
            Log in
          </Link>
        )}
      </div>
    </header>

    {searchOpen ? (
      <div
        className="feed-mobile-sheet-backdrop"
        onClick={() => setSearchOpen(false)}
      >
        <div
          className="feed-mobile-sheet"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="feed-mobile-sheet-header">
            <div>
              <p className="feed-mobile-sheet-kicker">Search</p>
              <h2 className="feed-mobile-sheet-title">
                Search posts, communities, and users
              </h2>
            </div>
            <button
              type="button"
              className="feed-mobile-sheet-close"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              ✕
            </button>
          </div>

          <GlobalSearchBox
            initialValue={props.mode === "search" ? props.searchInitialValue : ""}
          />
        </div>
      </div>
    ) : null}

    {props.mode === "feed" && sortOpen ? (
      <div
        className="feed-mobile-sheet-backdrop"
        onClick={() => setSortOpen(false)}
      >
        <div
          className="feed-mobile-sheet"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="feed-mobile-sheet-header">
            <div>
              <p className="feed-mobile-sheet-kicker">Sort</p>
              <h2 className="feed-mobile-sheet-title">Order this feed</h2>
            </div>
            <button
              type="button"
              className="feed-mobile-sheet-close"
              onClick={() => setSortOpen(false)}
              aria-label="Close sort options"
            >
              ✕
            </button>
          </div>

          <div className="feed-mobile-sort-grid">
            {sortOptions.map(([icon, value, label]) => (
              <button
                key={value}
                type="button"
                className={`feed-mobile-sort-btn ${
                  props.sort === value ? "on" : ""
                }`}
                onClick={() => {
                  props.onSortChange(value);
                  setSortOpen(false);
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

export function FeedSidebar(props: FeedSidebarProps) {
  const activeCommunity = props.mode === "feed" ? props.sel : props.activeCommunity;
  const footerLinks = [
    { href: "/privacy-policy", label: "Privacy" },
    { href: "/terms-of-service", label: "Terms" },
    { href: "/community-rules", label: "Rules" },
    { href: "/moderation-philosophy", label: "Moderation" },
  ] as const;
  const communityMap = new Map(
    props.communities.map((community) => [norm(community.name), community])
  );
  const groupedCommunityNames = new Set(
    COMMUNITY_GROUPS.flatMap((group) => group.communityNames.map(norm))
  );
  const communityGroups = COMMUNITY_GROUPS.map((group) => ({
    label: group.label,
    communities: group.communityNames
      .map((name) => communityMap.get(norm(name)))
      .filter((community): community is CommunityNavItem => Boolean(community)),
  })).filter((group) => group.communities.length > 0);
  const otherCommunities = props.communities
    .filter((community) => !groupedCommunityNames.has(norm(community.name)))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const allCommunityGroups =
    otherCommunities.length > 0
      ? [...communityGroups, { label: "Other", communities: otherCommunities }]
      : communityGroups;

  function renderCommunityItem(c: CommunityNavItem) {
    if (props.mode === "feed") {
      return (
        <div
          key={c.id}
          className={`com-item ${norm(props.sel) === norm(c.name) ? "active" : ""}`}
          onClick={() => props.onSelect(c.name)}
          onMouseEnter={() => props.onPrefetchHref(props.getSelectionHref(c.name))}
          onTouchStart={() => props.onPrefetchHref(props.getSelectionHref(c.name))}
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
      );
    }

    return (
      <IntentPrefetchLink
        key={c.id}
        href={`/feed?community=${encodeURIComponent(c.name)}`}
        className={`com-item ${norm(activeCommunity) === norm(c.name) ? "active" : ""}`}
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
      </IntentPrefetchLink>
    );
  }

  function renderSidebarContent() {
    return (
      <>
        <div className="sect-label" style={{ marginTop: 8 }}>
          Feeds
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
              onMouseEnter={() => props.onPrefetchHref(props.getSelectionHref(item.id))}
              onTouchStart={() => props.onPrefetchHref(props.getSelectionHref(item.id))}
              style={{ cursor: "pointer" }}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </div>
          ))
        ) : (
          <>
            <IntentPrefetchLink
              href="/feed"
              className="com-item"
              style={{ textDecoration: "none" }}
            >
              <span style={{ fontSize: 13 }}>⌂</span>
              Home Feed
            </IntentPrefetchLink>

            <IntentPrefetchLink
              href="/feed?scope=popular"
              className="com-item"
              style={{ textDecoration: "none" }}
            >
              <span style={{ fontSize: 13 }}>🔥</span>
              Popular
            </IntentPrefetchLink>

            <IntentPrefetchLink
              href="/feed?scope=following"
              className="com-item"
              style={{ textDecoration: "none" }}
            >
              <span style={{ fontSize: 13 }}>◎</span>
              Following
            </IntentPrefetchLink>

            <IntentPrefetchLink
              href="/feed?scope=all"
              className="com-item"
              style={{ textDecoration: "none" }}
            >
              <span style={{ fontSize: 13 }}>✦</span>
              All Posts
            </IntentPrefetchLink>
          </>
        )}

        {allCommunityGroups.map((group, index) => (
          <div key={group.label} style={{ marginTop: index === 0 ? 14 : 16 }}>
            <div className="sect-label" style={{ marginBottom: 6 }}>
              {group.label}
            </div>
            {group.communities.map((community) => renderCommunityItem(community))}
          </div>
        ))}

        <div style={{ marginTop: 28, padding: "0 10px" }}>
          <p style={{ fontSize: 10, color: "#5f5a54", lineHeight: 1.7 }}>
            © 2026 SocialVOID - a better internet
            <br />
            {footerLinks.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : null}
                <IntentPrefetchLink
                  href={link.href}
                  style={{ color: "#7b746c", textDecoration: "none" }}
                >
                  {link.label}
                </IntentPrefetchLink>
              </span>
            ))}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <details className="feed-mobile-nav">
        <summary className="feed-mobile-nav-summary">Browse feeds and communities</summary>
        <div className="feed-mobile-nav-panel">{renderSidebarContent()}</div>
      </details>

      <aside className="feed-sidebar">{renderSidebarContent()}</aside>
    </>
  );
}
