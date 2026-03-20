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
