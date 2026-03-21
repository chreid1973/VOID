import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../auth";
import SearchPageShell from "../../../components/SearchPageShell";
import { searchEverything } from "../../../lib/search";
import { prisma } from "../../../lib/prisma";
import { resolveStoredImageUrl } from "../../../r2";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: {
    q?: string | string[];
  };
}) {
  const [{ userId }, user] = await Promise.all([auth(), getCurrentUser()]);

  if (userId && !user) {
    redirect("/onboarding");
  }

  const initialQuery = firstParam(searchParams?.q)?.trim() || "";

  const [memberships, communities, notificationUnreadCount, results] =
    await Promise.all([
      user
        ? prisma.communityMember.findMany({
            where: { userId: user.id },
            select: {
              communityId: true,
            },
          })
        : Promise.resolve([]),
      prisma.community.findMany({
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          icon: true,
          color: true,
          _count: {
            select: {
              posts: true,
              members: true,
            },
          },
        },
      }),
      user
        ? prisma.notification.count({
            where: {
              userId: user.id,
              readAt: null,
            },
          })
        : Promise.resolve(0),
      searchEverything(initialQuery, {
        users: 10,
        communities: 8,
        posts: 18,
      }),
    ]);

  const joinedCommunityIdSet = new Set(
    memberships.map((membership) => membership.communityId)
  );

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: joinedCommunityIdSet.has(community.id),
  }));

  const formattedResults = {
    ...results,
    users: results.users.map((userResult) => ({
      ...userResult,
      avatarUrl: userResult.avatarUrl
        ? resolveStoredImageUrl(userResult.avatarUrl)
        : null,
    })),
  };

  return (
    <SearchPageShell
      initialQuery={initialQuery}
      results={formattedResults}
      communities={formattedCommunities}
      notificationUnreadCount={notificationUnreadCount}
      currentUser={
        user
          ? {
              username: user.username,
              displayName: user.displayName,
            }
          : null
      }
    />
  );
}
