export type FeedSort = "hot" | "new" | "top" | "rising";

export type RankedPost = {
  id: string;
  score: number;
  commentCount: number;
  replyCount: number;
  createdAt: Date;
};

const HOT_RANKING = {
  voteWeight: 1,
  commentWeight: 2,
  replyWeight: 1,
  ageOffsetHours: 2,
  agePower: 1.3,
} as const;

const RISING_RANKING = {
  voteWeight: 0.5,
  commentWeight: 2,
  replyWeight: 1,
  ageOffsetHours: 2,
  agePower: 1.2,
} as const;

function ageHours(createdAt: Date, nowMs: number) {
  return Math.max((nowMs - createdAt.getTime()) / 3_600_000, 0);
}

function discussionScore(
  post: RankedPost,
  commentWeight: number,
  replyWeight: number
) {
  const topLevelCommentCount = Math.max(post.commentCount, 0);
  const replyCount = Math.max(post.replyCount, 0);

  if (replyCount > 0) {
    return topLevelCommentCount * commentWeight + replyCount * replyWeight;
  }

  const averageWeight = (commentWeight + replyWeight) / 2;
  return topLevelCommentCount * averageWeight;
}

export function hotScore(post: RankedPost, nowMs: number) {
  const netVotes = post.score;
  const hours = ageHours(post.createdAt, nowMs);
  const hotBase =
    netVotes * HOT_RANKING.voteWeight +
    discussionScore(post, HOT_RANKING.commentWeight, HOT_RANKING.replyWeight);

  return hotBase / Math.pow(hours + HOT_RANKING.ageOffsetHours, HOT_RANKING.agePower);
}

export function risingScore(post: RankedPost, nowMs: number) {
  const netVotes = post.score;
  const hours = ageHours(post.createdAt, nowMs);
  const risingBase =
    netVotes * RISING_RANKING.voteWeight +
    discussionScore(
      post,
      RISING_RANKING.commentWeight,
      RISING_RANKING.replyWeight
    );

  return risingBase / Math.pow(
    hours + RISING_RANKING.ageOffsetHours,
    RISING_RANKING.agePower
  );
}

export function compareRankedPosts(
  a: RankedPost,
  b: RankedPost,
  sort: FeedSort,
  nowMs: number
) {
  const createdAtDelta = b.createdAt.getTime() - a.createdAt.getTime();
  const scoreDelta = b.score - a.score;
  const commentDelta = b.commentCount - a.commentCount;
  const replyDelta = b.replyCount - a.replyCount;

  if (sort === "new") {
    return createdAtDelta || scoreDelta || commentDelta || replyDelta || a.id.localeCompare(b.id);
  }

  if (sort === "top") {
    return scoreDelta || createdAtDelta || commentDelta || replyDelta || a.id.localeCompare(b.id);
  }

  const rankDelta =
    sort === "rising"
      ? risingScore(b, nowMs) - risingScore(a, nowMs)
      : hotScore(b, nowMs) - hotScore(a, nowMs);

  if (Math.abs(rankDelta) > 0.000001) {
    return rankDelta;
  }

  return scoreDelta || commentDelta || replyDelta || createdAtDelta || a.id.localeCompare(b.id);
}
