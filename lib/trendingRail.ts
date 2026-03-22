import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { compareRankedPosts } from "./postRanking";

export type TrendingRailPost = {
  id: string;
  publicId: string;
  title: string;
  votes: number;
  community: string;
  communityDisplayName: string;
  communityColor: string;
  communityIcon: string;
  createdAt: string;
};

const TRENDING_LIMIT_BUFFER = 12;
const TRENDING_CANDIDATE_LIMIT = 250;

const loadCachedTrendingRailPosts = unstable_cache(
  async () => {
    const rankedPostsRaw = await prisma.post.findMany({
      where: {
        isHidden: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: TRENDING_CANDIDATE_LIMIT,
      select: {
        id: true,
        publicId: true,
        score: true,
        commentCount: true,
        createdAt: true,
      },
    });

    if (rankedPostsRaw.length === 0) {
      return [] satisfies TrendingRailPost[];
    }

    const rankedPosts = rankedPostsRaw.map((post) => ({
      id: post.id,
      score: post.score,
      commentCount: post.commentCount,
      replyCount: 0,
      createdAt: post.createdAt,
    }));

    const nowMs = Date.now();
    rankedPosts.sort((a, b) => compareRankedPosts(a, b, "hot", nowMs));

    const visiblePostIds = rankedPosts
      .slice(0, TRENDING_LIMIT_BUFFER)
      .map((post) => post.id);
    const visiblePostsRaw = await prisma.post.findMany({
      where: {
        id: {
          in: visiblePostIds,
        },
      },
      include: {
        community: {
          select: {
            name: true,
            displayName: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    const visiblePostMap = new Map(visiblePostsRaw.map((post) => [post.id, post]));

    return visiblePostIds
      .map((postId) => visiblePostMap.get(postId))
      .filter((post): post is (typeof visiblePostsRaw)[number] => Boolean(post))
      .map((post) => ({
        id: post.id,
        publicId: post.publicId,
        title: post.title,
      votes: post.score,
      community: post.community.name,
      communityDisplayName: post.community.displayName,
      communityColor: post.community.color,
      communityIcon: post.community.icon,
      createdAt: post.createdAt.toISOString(),
    }));
  },
  ["trending-rail-posts"],
  {
    revalidate: 60,
    tags: ["trending-rail-posts"],
  }
);

export async function loadTrendingRailPosts(limit = 5, excludePostId?: string) {
  const posts = await loadCachedTrendingRailPosts();

  return posts
    .filter((post) => post.id !== excludePostId)
    .slice(0, limit);
}
