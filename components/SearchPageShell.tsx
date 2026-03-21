"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CommunityBadge, FeedSidebar, FeedTopBar } from "./FeedChrome";
import type { SearchResults } from "../lib/search-types";

type SidebarCommunity = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
  isMember: boolean;
};

type SearchPageShellProps = {
  initialQuery: string;
  results: SearchResults;
  communities: SidebarCommunity[];
  notificationUnreadCount: number;
  currentUser: {
    username: string;
    displayName: string | null;
  } | null;
};

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

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

function snippet(value: string | null | undefined, max = 180) {
  if (!value) return null;

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) return null;
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max).trimEnd()}…`;
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 6,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#ede8e0",
          letterSpacing: "-.02em",
        }}
      >
        {title}
      </h2>

      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#6f6963",
        }}
      >
        {count} shown
      </span>
    </div>
  );
}

export default function SearchPageShell({
  initialQuery,
  results,
  communities,
  notificationUnreadCount,
  currentUser,
}: SearchPageShellProps) {
  const [q, setQ] = useState(initialQuery);
  const hasResults =
    results.users.length > 0 ||
    results.communities.length > 0 ||
    results.posts.length > 0;
  const currentSearchHref = initialQuery
    ? `/search?q=${encodeURIComponent(initialQuery)}`
    : "/search";

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  return (
    <div className="feed-shell">
      <FeedTopBar
        mode="search"
        q={q}
        onQueryChange={setQ}
        currentUser={currentUser}
        notificationUnreadCount={notificationUnreadCount}
      />

      <div className="feed-container">
        <FeedSidebar
          mode="post"
          activeCommunity=""
          communities={communities}
        />

        <main className="feed-main" style={{ paddingBottom: 34 }}>
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#6f6963",
                marginBottom: 8,
              }}
            >
              Search
            </p>

            <h1 className="detail-title" style={{ marginBottom: 10 }}>
              {initialQuery ? `Results for “${initialQuery}”` : "Search SocialVOID"}
            </h1>

            <p style={{ fontSize: 13, color: "#8b847c", lineHeight: 1.7 }}>
              {initialQuery
                ? "Users, communities, and posts across the network."
                : "Search people, communities, and conversations across SocialVOID."}
            </p>
          </div>

          {!initialQuery ? (
            <div className="card" style={{ padding: "24px 26px" }}>
              <p
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 24,
                  color: "#ede8e0",
                  marginBottom: 8,
                }}
              >
                Start with a name, topic, or phrase.
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "#9c948a" }}>
                The search bar above will suggest matching users, communities, and posts as
                you type. Press Enter for the full result view.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="card" style={{ padding: "24px 26px" }}>
              <p
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 24,
                  color: "#ede8e0",
                  marginBottom: 8,
                }}
              >
                Nothing matched “{initialQuery}”.
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "#9c948a" }}>
                Try a shorter phrase, a username, a community name, or a more specific post
                title.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {results.users.length > 0 ? (
                <section className="card" style={{ padding: "18px 20px" }}>
                  <SectionHeader title="Users" count={results.users.length} />

                  <div style={{ display: "grid", gap: 12 }}>
                    {results.users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/u/${encodeURIComponent(user.username)}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 0",
                          borderTop: "1px solid #201f1f",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName || user.username}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              background: "#1d1b1b",
                              color: "#ff4826",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 16,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(user.displayName || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#ede8e0",
                              marginBottom: 3,
                            }}
                          >
                            {user.displayName || user.username}
                          </p>
                          <p style={{ fontSize: 12, color: "#7f7871", marginBottom: 5 }}>
                            u/{user.username}
                          </p>
                          {snippet(user.bio, 120) ? (
                            <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#9c948a" }}>
                              {snippet(user.bio, 120)}
                            </p>
                          ) : null}
                        </div>

                        <div
                          style={{
                            flexShrink: 0,
                            textAlign: "right",
                            fontSize: 11.5,
                            color: "#6f6963",
                            lineHeight: 1.6,
                          }}
                        >
                          <div>{user.postCount} posts</div>
                          <div>{user.commentCount} comments</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {results.communities.length > 0 ? (
                <section className="card" style={{ padding: "18px 20px" }}>
                  <SectionHeader
                    title="Communities"
                    count={results.communities.length}
                  />

                  <div style={{ display: "grid", gap: 12 }}>
                    {results.communities.map((community) => (
                      <Link
                        key={community.id}
                        href={`/feed?community=${encodeURIComponent(community.name)}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 0",
                          borderTop: "1px solid #201f1f",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: `${community.color}1e`,
                            color: community.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                          }}
                        >
                          {community.icon}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#ede8e0",
                              marginBottom: 3,
                            }}
                          >
                            {community.displayName}
                          </p>
                          <p style={{ fontSize: 12, color: "#7f7871", marginBottom: 5 }}>
                            c/{community.name}
                          </p>
                          {snippet(community.description, 140) ? (
                            <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#9c948a" }}>
                              {snippet(community.description, 140)}
                            </p>
                          ) : null}
                        </div>

                        <div
                          style={{
                            flexShrink: 0,
                            textAlign: "right",
                            fontSize: 11.5,
                            color: "#6f6963",
                            lineHeight: 1.6,
                          }}
                        >
                          <div>{community.memberCount} members</div>
                          <div>{community.postCount} posts</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {results.posts.length > 0 ? (
                <section className="card" style={{ padding: "18px 20px" }}>
                  <SectionHeader title="Posts" count={results.posts.length} />

                  <div style={{ display: "grid", gap: 12 }}>
                    {results.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/p/${post.publicId}?from=${encodeURIComponent(currentSearchHref)}`}
                        style={{
                          display: "block",
                          padding: "12px 0",
                          borderTop: "1px solid #201f1f",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          <CommunityBadge
                            name={post.community.name}
                            displayName={post.community.displayName}
                            color={post.community.color}
                            icon={post.community.icon}
                          />

                          <span style={{ fontSize: 11.5, color: "#7f7871" }}>
                            u/{post.author.displayName || post.author.username}
                          </span>

                          <span style={{ fontSize: 11.5, color: "#4d4b49" }}>·</span>

                          <span style={{ fontSize: 11.5, color: "#7f7871" }}>
                            {timeAgo(post.createdAt)}
                          </span>
                        </div>

                        <h2
                          style={{
                            fontFamily: "var(--font-fraunces), Georgia, serif",
                            fontSize: 21,
                            fontWeight: 600,
                            color: "#ede8e0",
                            letterSpacing: "-.02em",
                            lineHeight: 1.18,
                            marginBottom: 8,
                          }}
                        >
                          {post.title}
                        </h2>

                        {snippet(post.body, 180) ? (
                          <p
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.72,
                              color: "#9c948a",
                              marginBottom: 10,
                            }}
                          >
                            {snippet(post.body, 180)}
                          </p>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 11.5,
                            color: "#6f6963",
                          }}
                        >
                          <span>{post.score} score</span>
                          <span>{post.commentCount} comments</span>
                          {post.url ? <span>↗ External link</span> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
