import { notFound } from "next/navigation";
import { getCurrentUser, isAdminUser } from "../../../auth";
import ModerationQueue from "../../../components/ModerationQueue";
import { prisma } from "../../../lib/prisma";

function parseStatus(value?: string | string[]) {
  const status = Array.isArray(value) ? value[0] : value;
  return status === "RESOLVED" || status === "DISMISSED" ? status : "OPEN";
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams?: {
    status?: string | string[];
  };
}) {
  const user = await getCurrentUser();

  if (!user || !isAdminUser(user)) {
    return notFound();
  }

  const activeStatus = parseStatus(searchParams?.status);
  const reports = await prisma.report.findMany({
    where: {
      status: activeStatus,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      reporter: {
        select: {
          username: true,
          displayName: true,
        },
      },
      resolvedBy: {
        select: {
          username: true,
          displayName: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          isHidden: true,
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
      comment: {
        select: {
          id: true,
          body: true,
          isDeleted: true,
          isHidden: true,
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              isHidden: true,
            },
          },
        },
      },
    },
  });
  const targetUserIds = Array.from(
    new Set(
      reports
        .map((report) =>
          report.targetType === "POST"
            ? report.post?.author.id
            : report.comment?.author.id
        )
        .filter((value): value is string => Boolean(value))
    )
  );
  const moderationActions = targetUserIds.length
    ? await prisma.moderationAction.findMany({
        where: {
          userId: {
            in: targetUserIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          userId: true,
          type: true,
          note: true,
          createdAt: true,
          admin: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      })
    : [];
  const moderationHistoryByUser = new Map<
    string,
    {
      warningCount: number;
      noteCount: number;
      contentActionCount: number;
      entries: Array<{
        id: string;
        type: string;
        note: string | null;
        createdAt: string;
        admin: {
          username: string;
          displayName: string | null;
        };
      }>;
    }
  >();

  for (const action of moderationActions) {
    const current = moderationHistoryByUser.get(action.userId) ?? {
      warningCount: 0,
      noteCount: 0,
      contentActionCount: 0,
      entries: [],
    };

    if (action.type === "WARNING") {
      current.warningCount += 1;
    } else if (action.type === "NOTE") {
      current.noteCount += 1;
    } else {
      current.contentActionCount += 1;
    }

    if (current.entries.length < 5) {
      current.entries.push({
        id: action.id,
        type: action.type,
        note: action.note,
        createdAt: action.createdAt.toISOString(),
        admin: action.admin,
      });
    }

    moderationHistoryByUser.set(action.userId, current);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0e0e",
        padding: "40px 20px 60px",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 22 }}>
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
            Moderation
          </p>

          <h1
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 42,
              fontWeight: 600,
              color: "#ede8e0",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 8,
            }}
          >
            Review reports
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#8b847c",
              lineHeight: 1.6,
            }}
          >
            Open reports, moderation actions, and recent decisions all live here.
          </p>
        </div>

        <div
          style={{
            background: "#161515",
            border: "1px solid #2a2828",
            borderRadius: 18,
            padding: "22px",
            boxShadow: "0 8px 40px rgba(0,0,0,.38)",
          }}
        >
          <ModerationQueue
            reports={reports.map((report) => ({
              targetUser:
                report.targetType === "POST"
                  ? report.post?.author ?? null
                  : report.comment?.author ?? null,
              userHistory:
                moderationHistoryByUser.get(
                  report.targetType === "POST"
                    ? report.post?.author.id ?? ""
                    : report.comment?.author.id ?? ""
                ) ?? {
                  warningCount: 0,
                  noteCount: 0,
                  contentActionCount: 0,
                  entries: [],
                },
              id: report.id,
              targetType: report.targetType,
              reason: report.reason,
              note: report.note,
              status: report.status,
              createdAt: report.createdAt.toISOString(),
              resolvedAt: report.resolvedAt?.toISOString() ?? null,
              reporter: report.reporter,
              resolvedBy: report.resolvedBy,
              post: report.post,
              comment: report.comment
                ? {
                    ...report.comment,
                    post: report.comment.post,
                  }
                : null,
            }))}
            activeStatus={activeStatus}
          />
        </div>
      </div>
    </div>
  );
}
