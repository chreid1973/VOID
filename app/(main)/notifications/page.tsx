import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthState } from "../../../auth";
import { prisma } from "../../../lib/prisma";
import { NotificationType } from "@prisma/client";

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

function notificationCopy(
  type: NotificationType,
  actorName: string
) {
  if (type === "COMMENT_ON_POST") {
    return `${actorName} commented on your post`;
  }

  if (type === "REPLY_TO_COMMENT") {
    return `${actorName} replied to your comment`;
  }

  if (type === "MENTION_IN_POST") {
    return `${actorName} mentioned you in a post`;
  }

  return `${actorName} mentioned you in a comment`;
}

export default async function NotificationsPage() {
  const { userId, user } = await getAuthState();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!user) {
    redirect("/onboarding");
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      actor: {
        select: {
          username: true,
          displayName: true,
        },
      },
      post: {
        select: {
          publicId: true,
          title: true,
        },
      },
      comment: {
        select: {
          id: true,
          body: true,
        },
      },
    },
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0e0e",
        color: "#e2ddd6",
        fontFamily: "var(--font-outfit), sans-serif",
        padding: "36px 24px 60px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#8b847c",
                marginBottom: 8,
              }}
            >
              Notifications
            </p>
            <h1
              style={{
                fontFamily: "var(--font-fraunces), Georgia, serif",
                fontSize: 40,
                fontWeight: 600,
                color: "#f0e9df",
                letterSpacing: "-.03em",
                lineHeight: 1.05,
              }}
            >
              What’s new
            </h1>
          </div>

          <Link
            href="/feed"
            style={{
              background: "none",
              border: "1px solid #242323",
              borderRadius: 8,
              color: "#d8d2ca",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              textDecoration: "none",
            }}
          >
            ← Back to Feed
          </Link>
        </div>

        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderRadius: 18,
            border: "1px solid #242323",
            background: "rgba(20,19,19,.92)",
          }}
        >
          {notifications.length === 0 ? (
            <div style={{ padding: "36px 8px", color: "#6f6963" }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification, index) => {
              const actorName =
                notification.actor.displayName || notification.actor.username;
              const href = notification.comment
                ? `/p/${notification.post.publicId}#comment-${notification.comment.id}`
                : `/p/${notification.post.publicId}`;

              return (
                <Link
                  key={notification.id}
                  href={href}
                  style={{
                    display: "block",
                    padding: "14px 4px",
                    borderTop: index === 0 ? "none" : "1px solid #1a1a1a",
                    textDecoration: "none",
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#e2ddd6",
                      lineHeight: 1.5,
                      marginBottom: 4,
                    }}
                  >
                    {notificationCopy(notification.type, actorName)}
                  </p>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "#8a8682",
                      lineHeight: 1.55,
                      marginBottom: 6,
                    }}
                  >
                    {notification.post.title}
                  </p>
                  <p style={{ fontSize: 11.5, color: "#5f5b57" }}>
                    {timeAgo(notification.createdAt)}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
