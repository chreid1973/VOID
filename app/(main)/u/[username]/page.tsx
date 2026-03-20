import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "../../../../auth";
import ProfileEditor from "../../../../components/ProfileEditor";
import { prisma } from "../../../../lib/prisma";
import { resolveStoredImageUrl } from "../../../../r2";

const PAGE_SIZE = 10;

type ProfileTab = "posts" | "comments";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

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

function snippet(value: string, max = 140) {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

function parseTab(value?: string | string[]): ProfileTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === "comments" ? "comments" : "posts";
}

function parsePage(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildProfileHref(
  username: string,
  tab: ProfileTab,
  postsPage: number,
  commentsPage: number
) {
  const params = new URLSearchParams();

  if (tab !== "posts") {
    params.set("tab", tab);
  }

  if (postsPage > 1) {
    params.set("postsPage", String(postsPage));
  }

  if (commentsPage > 1) {
    params.set("commentsPage", String(commentsPage));
  }

  const query = params.toString();
  return query ? `/u/${encodeURIComponent(username)}?${query}` : `/u/${encodeURIComponent(username)}`;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams?: {
    tab?: string | string[];
    postsPage?: string | string[];
    commentsPage?: string | string[];
  };
}) {
  const activeTab = parseTab(searchParams?.tab);
  const postsPage = parsePage(searchParams?.postsPage);
  const commentsPage = parsePage(searchParams?.commentsPage);

  const [user, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!user) return notFound();

  const isOwner = currentUser?.id === user.id;
  const avatarUrl = user.avatarUrl
    ? resolveStoredImageUrl(user.avatarUrl)
    : null;
  const profileLabel = user.displayName || user.username;
  const [posts, comments, visibleCommentCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id },
      take: PAGE_SIZE,
      skip: (postsPage - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        score: true,
        commentCount: true,
        createdAt: true,
        community: {
          select: {
            displayName: true,
          },
        },
      },
    }),
    prisma.comment.findMany({
      where: {
        authorId: user.id,
        isDeleted: false,
      },
      take: PAGE_SIZE,
      skip: (commentsPage - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.comment.count({
      where: {
        authorId: user.id,
        isDeleted: false,
      },
    }),
  ]);
  const postsHasPreviousPage = postsPage > 1;
  const commentsHasPreviousPage = commentsPage > 1;
  const postsHasNextPage = user._count.posts > postsPage * PAGE_SIZE;
  const commentsHasNextPage = visibleCommentCount > commentsPage * PAGE_SIZE;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0e0e",
        padding: "36px 20px 56px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link
          href="/feed"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            color: "#6a6764",
            border: "1px solid #242323",
            borderRadius: 7,
            padding: "5px 13px",
            fontSize: 12.5,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          ← Back to feed
        </Link>

        <div
          style={{
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 18,
            padding: "24px",
            boxShadow: "0 8px 40px rgba(0,0,0,.38)",
            marginBottom: 18,
          }}
          >
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                overflow: "hidden",
                background: "#111010",
                border: "1px solid #242323",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6f6963",
                fontSize: 34,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profileLabel}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <span>{profileLabel.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#8b847c",
                  marginBottom: 10,
                }}
              >
                Profile
              </p>

              <h1
                style={{
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  fontSize: 38,
                  fontWeight: 600,
                  color: "#ede8e0",
                  letterSpacing: "-.03em",
                  lineHeight: 1.05,
                  marginBottom: 6,
                }}
              >
                {profileLabel}
              </h1>

              <p style={{ fontSize: 14, color: "#8b847c", lineHeight: 1.6 }}>
                u/{user.username} · joined {timeAgo(user.createdAt)}
              </p>

              {user.bio ? (
                <p
                  style={{
                    fontSize: 14,
                    color: "#c0bbb4",
                    lineHeight: 1.7,
                    marginTop: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {user.bio}
                </p>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                {[
                  { label: "Posts", value: user._count.posts },
                  { label: "Comments", value: visibleCommentCount },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#111010",
                      border: "1px solid #242323",
                      borderRadius: 12,
                      padding: "10px 14px",
                      minWidth: 110,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6f6963",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#ede8e0",
                        marginTop: 4,
                      }}
                    >
                      {item.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {isOwner ? (
                <ProfileEditor
                  initialDisplayName={user.displayName}
                  initialBio={user.bio}
                  initialAvatarValue={user.avatarUrl}
                  initialAvatarUrl={avatarUrl}
                />
              ) : null}
            </div>
          </div>
        </div>

        <section
          style={{
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 18,
            padding: "22px",
            boxShadow: "0 8px 40px rgba(0,0,0,.38)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 24,
                fontWeight: 500,
                color: "#ede8e0",
                letterSpacing: "-.02em",
              }}
            >
              {activeTab === "posts" ? "Authored Posts" : "Authored Comments"}
            </h2>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  key: "posts" as const,
                  label: "Posts",
                  count: user._count.posts,
                },
                {
                  key: "comments" as const,
                  label: "Comments",
                  count: visibleCommentCount,
                },
              ].map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <Link
                    key={tab.key}
                    href={buildProfileHref(
                      user.username,
                      tab.key,
                      postsPage,
                      commentsPage
                    )}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: active
                        ? "1px solid rgba(255,72,38,.32)"
                        : "1px solid #242323",
                      background: active ? "rgba(255,72,38,.12)" : "#111010",
                      color: active ? "#ff9b84" : "#8b847c",
                      fontSize: 12.5,
                      fontWeight: 700,
                      letterSpacing: ".02em",
                      textDecoration: "none",
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ color: active ? "#ffd0c5" : "#6f6963" }}>
                      {tab.count.toLocaleString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {activeTab === "posts" ? (
            posts.length > 0 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/p/${post.id}`}
                      style={{
                        display: "block",
                        textDecoration: "none",
                        background: "#111010",
                        border: "1px solid #242323",
                        borderRadius: 12,
                        padding: "14px 16px",
                      }}
                    >
                      <p style={{ fontSize: 11.5, color: "#6f6963", marginBottom: 6 }}>
                        {post.community.displayName} · {timeAgo(post.createdAt)}
                      </p>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#e6e1da",
                          lineHeight: 1.45,
                          marginBottom: 8,
                        }}
                      >
                        {post.title}
                      </h3>
                      <p style={{ fontSize: 12, color: "#8b847c" }}>
                        {post.score.toLocaleString()} points ·{" "}
                        {post.commentCount.toLocaleString()} comments
                      </p>
                    </Link>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  {postsHasPreviousPage ? (
                    <Link
                      href={buildProfileHref(
                        user.username,
                        "posts",
                        postsPage - 1,
                        commentsPage
                      )}
                      className="act"
                      style={{ textDecoration: "none" }}
                    >
                      ← Back
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, color: "#3f3c39" }}>← Back</span>
                  )}

                  <span style={{ fontSize: 12, color: "#6f6963" }}>
                    Page {postsPage}
                  </span>

                  {postsHasNextPage ? (
                    <Link
                      href={buildProfileHref(
                        user.username,
                        "posts",
                        postsPage + 1,
                        commentsPage
                      )}
                      className="act"
                      style={{ textDecoration: "none" }}
                    >
                      Next →
                    </Link>
                  ) : (
                    <span style={{ fontSize: 12, color: "#3f3c39" }}>Next →</span>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#8b847c" }}>No posts yet.</p>
            )
          ) : comments.length > 0 ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {comments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/p/${comment.post.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      background: "#111010",
                      border: "1px solid #242323",
                      borderRadius: 12,
                      padding: "14px 16px",
                    }}
                  >
                    <p style={{ fontSize: 11.5, color: "#6f6963", marginBottom: 6 }}>
                      On {comment.post.title} · {timeAgo(comment.createdAt)}
                    </p>
                    <p
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.65,
                        color: "#c0bbb4",
                      }}
                    >
                      {snippet(comment.body)}
                    </p>
                  </Link>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                {commentsHasPreviousPage ? (
                  <Link
                    href={buildProfileHref(
                      user.username,
                      "comments",
                      postsPage,
                      commentsPage - 1
                    )}
                    className="act"
                    style={{ textDecoration: "none" }}
                  >
                    ← Back
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, color: "#3f3c39" }}>← Back</span>
                )}

                <span style={{ fontSize: 12, color: "#6f6963" }}>
                  Page {commentsPage}
                </span>

                {commentsHasNextPage ? (
                  <Link
                    href={buildProfileHref(
                      user.username,
                      "comments",
                      postsPage,
                      commentsPage + 1
                    )}
                    className="act"
                    style={{ textDecoration: "none" }}
                  >
                    Next →
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, color: "#3f3c39" }}>Next →</span>
                )}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: "#8b847c" }}>No comments yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
