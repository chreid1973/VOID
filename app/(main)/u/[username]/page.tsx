import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";

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

export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      username: true,
      displayName: true,
      createdAt: true,
      posts: {
        take: 10,
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
      },
      comments: {
        take: 10,
        where: { isDeleted: false },
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
      },
      _count: {
        select: {
          posts: true,
          comments: true,
        },
      },
    },
  });

  if (!user) return notFound();

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
            {user.displayName || user.username}
          </h1>

          <p style={{ fontSize: 14, color: "#8b847c", lineHeight: 1.6 }}>
            u/{user.username} · joined {timeAgo(user.createdAt)}
          </p>

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
              { label: "Comments", value: user._count.comments },
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
        </div>

        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <section
            style={{
              background: "#161515",
              border: "1px solid #2a2828",
              borderRadius: 18,
              padding: "22px",
              boxShadow: "0 8px 40px rgba(0,0,0,.38)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 24,
                fontWeight: 500,
                color: "#ede8e0",
                letterSpacing: "-.02em",
                marginBottom: 14,
              }}
            >
              Authored Posts
            </h2>

            {user.posts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {user.posts.map((post) => (
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
            ) : (
              <p style={{ fontSize: 14, color: "#8b847c" }}>No posts yet.</p>
            )}
          </section>

          <section
            style={{
              background: "#161515",
              border: "1px solid #2a2828",
              borderRadius: 18,
              padding: "22px",
              boxShadow: "0 8px 40px rgba(0,0,0,.38)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 24,
                fontWeight: 500,
                color: "#ede8e0",
                letterSpacing: "-.02em",
                marginBottom: 14,
              }}
            >
              Authored Comments
            </h2>

            {user.comments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {user.comments.map((comment) => (
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
            ) : (
              <p style={{ fontSize: 14, color: "#8b847c" }}>No comments yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
