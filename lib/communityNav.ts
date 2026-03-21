import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export type CommunityNavigationItem = {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  memberCount: number;
  postCount: number;
};

const loadCachedCommunityNavigationItems = unstable_cache(
  async (): Promise<CommunityNavigationItem[]> => {
    const communities = await prisma.community.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        color: true,
        icon: true,
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    });

    return communities.map((community) => ({
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      color: community.color,
      icon: community.icon,
      memberCount: community._count.members,
      postCount: community._count.posts,
    }));
  },
  ["community-navigation"],
  {
    revalidate: 60,
    tags: ["community-navigation"],
  }
);

export async function loadCommunityNavigationItems() {
  return loadCachedCommunityNavigationItems();
}
