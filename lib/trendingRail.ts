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
  createdAt: Date;
};

export async function loadTrendingRailPosts(limit = 5, excludePostId?: string) {
  const baseWhere = {
    isHidden: false,
    ...(excludePostId ? { id: { not: excludePostId } } : {}),
  };

  const rankedPostsRaw = await prisma.post.findMany({
    where: baseWhere,
    select: {
      id: true,
      publicId: true,
      score: true,
      createdAt: true,
    },
  });

  if (rankedPostsRaw.length === 0) {
    return [] satisfies TrendingRailPost[];
  }

  const rankedPostIds = rankedPostsRaw.map((post) => post.id);
  const [topLevelCommentCounts, replyCounts] = await Promise.all([
    prisma.comment.groupBy({
      by: ["postId"],
      where: {
        postId: {
          in: rankedPostIds,
        },
        isDeleted: false,
        isHidden: false,
        parentId: null,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.comment.groupBy({
      by: ["postId"],
      where: {
        postId: {
          in: rankedPostIds,
        },
        isDeleted: false,
        isHidden: false,
        parentId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const topLevelCommentCountMap = new Map(
    topLevelCommentCounts.map((entry) => [entry.postId, entry._count._all])
  );
  const replyCountMap = new Map(
    replyCounts.map((entry) => [entry.postId, entry._count._all])
  );
  const rankedPosts = rankedPostsRaw.map((post) => ({
    id: post.id,
    score: post.score,
    commentCount: topLevelCommentCountMap.get(post.id) ?? 0,
    replyCount: replyCountMap.get(post.id) ?? 0,
    createdAt: post.createdAt,
  }));

  const nowMs = Date.now();
  rankedPosts.sort((a, b) => compareRankedPosts(a, b, "hot", nowMs));

  const visiblePostIds = rankedPosts.slice(0, limit).map((post) => post.id);
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
      createdAt: post.createdAt,
    }));
}
