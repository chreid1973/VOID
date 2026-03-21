import { redirect } from "next/navigation";
import { getAuthState } from "../../auth";
import { loadCommunityNavigationItems } from "../../lib/communityNav";
import { prisma } from "../../lib/prisma";
import { resolveStoredImageUrl } from "../../r2";
import SubmitForm from "./submit-form";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams?: {
    crosspost?: string | string[];
  };
}) {
  const { userId, user } = await getAuthState();

  if (userId && !user) {
    redirect("/onboarding");
  }

  const crosspostId = Array.isArray(searchParams?.crosspost)
    ? searchParams?.crosspost[0]
    : searchParams?.crosspost;

  const [communities, crosspostSource] = await Promise.all([
    loadCommunityNavigationItems(),
    crosspostId && user
      ? prisma.post.findUnique({
          where: { id: crosspostId },
          select: {
            id: true,
            title: true,
            body: true,
            url: true,
            imageKey: true,
            authorId: true,
            communityId: true,
            community: {
              select: {
                name: true,
                displayName: true,
                color: true,
                icon: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (crosspostId) {
    if (!user || !crosspostSource || crosspostSource.authorId !== user.id) {
      redirect("/feed");
    }
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
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 22 }}>
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
            {crosspostSource ? "Crosspost Post" : "Create Post"}
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#8b847c",
              lineHeight: 1.6,
            }}
          >
            {crosspostSource
              ? "Share your post to another community. The original stays linked."
              : "Start a new thread in one of your communities."}
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
          <SubmitForm
            communities={communities.map((community) => ({
              id: community.id,
              name: community.name,
              displayName: community.displayName,
            }))}
            crosspostSource={
              crosspostSource
                ? {
                    id: crosspostSource.id,
                    title: crosspostSource.title,
                    body: crosspostSource.body,
                    url: crosspostSource.url,
                    imageUrl: crosspostSource.imageKey
                      ? resolveStoredImageUrl(crosspostSource.imageKey)
                      : null,
                    communityId: crosspostSource.communityId,
                    community: crosspostSource.community,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
