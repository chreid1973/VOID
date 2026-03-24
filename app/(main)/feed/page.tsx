import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import FeedClient from "../../../components/FeedClient";
import { getAuthState } from "../../../auth";
import { loadCommunityNavigationItems } from "../../../lib/communityNav";
import { extractMentionUsernames } from "../../../lib/mentions";
import { compareRankedPosts, type FeedSort } from "../../../lib/postRanking";
import { prisma } from "../../../lib/prisma";
import { resolveStoredImageUrl } from "../../../r2";

const PAGE_SIZE = 20;
const RANKING_CANDIDATE_LIMIT = 250;
const FEED_CONTENT_TAG = "feed-content";
const VIEWER_FEED_REVALIDATE_SECONDS = 15;

type FeedScope = "home" | "following" | "popular" | "all";

type FeedPageSearchParams = {
  community?: string | string[];
  scope?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type FeedWhereOptions = {
  selectedCommunity: string | null;
  scope: FeedScope;
  joinedCommunityIds?: string[];
  followedAuthorIds?: string[];
  isPersonalizedHome?: boolean;
};

type FeedPageBaseOptions = {
  selectedCommunity: string | null;
  scope: FeedScope;
  sort: FeedSort;
  currentPage: number;
  joinedCommunityIds?: string[];
  followedAuthorIds?: string[];
  isPersonalizedHome?: boolean;
};

type FeedBasePost = {
  id: string;
  publicId: string;
  community: string;
  title: string;
  body: string;
  url: string | null;
  imageUrl: string | null;
  authorName: string;
  authorUsername: string;
  votes: number;
  userVote: 1 | -1 | null;
  comments: number;
  mentions: string[];
  time: string;
  flair?: string | null;
  flairColor?: string | null;
  isSaved: boolean;
  crosspostSource: {
    id: string;
    publicId: string;
    authorName: string;
    authorUsername: string;
    community: string;
    communityDisplayName: string;
    communityColor: string;
    communityIcon: string;
  } | null;
};

type FeedPageBase = {
  posts: FeedBasePost[];
  hasNextPage: boolean;
};

const postInclude = {
  author: {
    select: {
      username: true,
      displayName: true,
    },
  },
  community: {
    select: {
      id: true,
      name: true,
      displayName: true,
      icon: true,
      color: true,
    },
  },
  crosspostOf: {
    select: {
      id: true,
      publicId: true,
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
      community: {
        select: {
          name: true,
          displayName: true,
          color: true,
          icon: true,
        },
      },
    },
  },
} satisfies Prisma.PostInclude;

type IncludedFeedPost = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;

function timeAgo(date: Date | string) {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(months / 12);
  return `${years}y`;
}

function formatUserVote(value: number | null | undefined): 1 | -1 | null {
  return value === 1 ? 1 : value === -1 ? -1 : null;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatFeedPreferenceScope(
  value: "HOME" | "FOLLOWING" | "POPULAR" | "ALL" | null | undefined
): FeedScope {
  return value ? (value.toLowerCase() as FeedScope) : "home";
}

function formatFeedPreferenceSort(
  value: "HOT" | "NEW" | "TOP" | "RISING" | null | undefined
): FeedSort {
  return value ? (value.toLowerCase() as FeedSort) : "hot";
}

function parseScope(value: string | undefined): FeedScope {
  return value === "popular" || value === "all" || value === "following"
    ? value
    : "home";
}

function parseSort(value: string | undefined): FeedSort {
  return value === "new" ||
    value === "top" ||
    value === "rising" ||
    value === "hot"
    ? value
    : "hot";
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildFeedWhere({
  selectedCommunity,
  scope,
  joinedCommunityIds = [],
  followedAuthorIds = [],
  isPersonalizedHome = false,
}: FeedWhereOptions) {
  const whereClauses: Prisma.PostWhereInput[] = [
    {
      isHidden: false,
    },
  ];

  if (selectedCommunity) {
    whereClauses.push({
      community: {
        name: {
          equals: selectedCommunity,
          mode: "insensitive",
        },
      },
    });
  } else if (scope === "following") {
    whereClauses.push({
      authorId: {
        in: followedAuthorIds,
      },
    });
  } else if (isPersonalizedHome) {
    whereClauses.push({
      communityId: {
        in: joinedCommunityIds,
      },
    });
  } else if (scope === "popular") {
    whereClauses.push({
      OR: [{ score: { gt: 0 } }, { commentCount: { gt: 0 } }],
    });
  }

  return {
    AND: whereClauses,
  } satisfies Prisma.PostWhereInput;
}

async function loadVisibleFeedPosts(
  where: Prisma.PostWhereInput,
  sort: FeedSort,
  currentPage: number
) {
  const pageOffset = (currentPage - 1) * PAGE_SIZE;
  let visiblePosts: IncludedFeedPost[] = [];
  let hasNextPage = false;

  if (sort === "new" || sort === "top") {
    const orderedPosts = await prisma.post.findMany({
      where,
      orderBy:
        sort === "new"
          ? [{ createdAt: "desc" }, { score: "desc" }]
          : [{ score: "desc" }, { createdAt: "desc" }],
      skip: pageOffset,
      take: PAGE_SIZE + 1,
      include: postInclude,
    });

    hasNextPage = orderedPosts.length > PAGE_SIZE;
    visiblePosts = orderedPosts.slice(0, PAGE_SIZE);
  } else {
    const rankingNowMs = Date.now();
    const rankedPostsRaw = await prisma.post.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: RANKING_CANDIDATE_LIMIT,
      select: {
        id: true,
        score: true,
        commentCount: true,
        createdAt: true,
      },
    });

    const rankedPosts = rankedPostsRaw.map((post) => ({
      id: post.id,
      score: post.score,
      commentCount: post.commentCount,
      replyCount: 0,
      createdAt: post.createdAt,
    }));

    rankedPosts.sort((a, b) => compareRankedPosts(a, b, sort, rankingNowMs));

    const visiblePostIds = rankedPosts
      .slice(pageOffset, pageOffset + PAGE_SIZE)
      .map((post) => post.id);
    hasNextPage = rankedPosts.length > pageOffset + PAGE_SIZE;

    const visiblePostsRaw =
      visiblePostIds.length > 0
        ? await prisma.post.findMany({
            where: {
              id: {
                in: visiblePostIds,
              },
            },
            include: postInclude,
          })
        : [];
    const visiblePostMap = new Map(
      visiblePostsRaw.map((post) => [post.id, post])
    );

    visiblePosts = visiblePostIds
      .map((postId) => visiblePostMap.get(postId))
      .filter((post): post is IncludedFeedPost => Boolean(post));
  }

  return {
    visiblePosts,
    hasNextPage,
  };
}

async function loadFeedPageBase({
  selectedCommunity,
  scope,
  sort,
  currentPage,
  joinedCommunityIds = [],
  followedAuthorIds = [],
  isPersonalizedHome = false,
}: FeedPageBaseOptions): Promise<FeedPageBase> {
  const where = buildFeedWhere({
    selectedCommunity,
    scope,
    joinedCommunityIds,
    followedAuthorIds,
    isPersonalizedHome,
  });
  const { visiblePosts, hasNextPage } = await loadVisibleFeedPosts(
    where,
    sort,
    currentPage
  );

  return {
    hasNextPage,
    posts: visiblePosts.map((post) => ({
      id: post.id,
      publicId: post.publicId,
      community: post.community.name,
      title: post.title,
      body: post.body ?? "",
      url: post.url,
      imageUrl: post.imageKey ? resolveStoredImageUrl(post.imageKey) : null,
      authorName: post.author.displayName || post.author.username,
      authorUsername: post.author.username,
      votes: post.score ?? 0,
      userVote: null,
      comments: post.commentCount ?? 0,
      mentions: extractMentionUsernames(
        [post.title, post.body].filter(Boolean).join("\n")
      ),
      time: timeAgo(post.createdAt),
      flair: post.flair,
      flairColor: post.flairColor,
      isSaved: false,
      crosspostSource: post.crosspostOf
        ? {
            id: post.crosspostOf.id,
            publicId: post.crosspostOf.publicId,
            authorName:
              post.crosspostOf.author.displayName ||
              post.crosspostOf.author.username,
            authorUsername: post.crosspostOf.author.username,
            community: post.crosspostOf.community.name,
            communityDisplayName: post.crosspostOf.community.displayName,
            communityColor: post.crosspostOf.community.color,
            communityIcon: post.crosspostOf.community.icon,
          }
        : null,
    })),
  };
}

const loadCachedPublicFeedPageBase = unstable_cache(
  async (
    selectedCommunity: string | null,
    scope: FeedScope,
    sort: FeedSort,
    currentPage: number
  ) =>
    loadFeedPageBase({
      selectedCommunity,
      scope,
      sort,
      currentPage,
    }),
  [FEED_CONTENT_TAG],
  {
    revalidate: 20,
    tags: [FEED_CONTENT_TAG],
  }
);

function deserializeIdList(value: string) {
  return value ? value.split(",").filter(Boolean) : [];
}

const loadCachedViewerFeedPageBase = unstable_cache(
  async (
    _viewerCacheKey: string,
    selectedCommunity: string | null,
    scope: FeedScope,
    sort: FeedSort,
    currentPage: number,
    joinedCommunityIdsKey: string,
    followedAuthorIdsKey: string,
    isPersonalizedHome: boolean
  ) =>
    loadFeedPageBase({
      selectedCommunity,
      scope,
      sort,
      currentPage,
      joinedCommunityIds: deserializeIdList(joinedCommunityIdsKey),
      followedAuthorIds: deserializeIdList(followedAuthorIdsKey),
      isPersonalizedHome,
    }),
  [FEED_CONTENT_TAG, "viewer"],
  {
    revalidate: VIEWER_FEED_REVALIDATE_SECONDS,
    tags: [FEED_CONTENT_TAG],
  }
);

function shouldUseCachedPublicFeedBase(
  selectedCommunity: string | null,
  scope: FeedScope,
  isPersonalizedHome: boolean
) {
  if (selectedCommunity) {
    return true;
  }

  if (scope === "following") {
    return false;
  }

  return !isPersonalizedHome;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: FeedPageSearchParams;
}) {
  const { userId, user } = await getAuthState();

  if (userId && !user) {
    redirect("/onboarding");
  }

  const rawSelectedCommunity = firstParam(searchParams?.community)?.trim() || null;
  const rawScope = firstParam(searchParams?.scope)?.trim();
  const rawSort = firstParam(searchParams?.sort)?.trim();
  const rawPage = firstParam(searchParams?.page)?.trim();

  if (!rawSelectedCommunity && !rawScope && !rawSort && !rawPage && user) {
    const preferredScope = formatFeedPreferenceScope(user.defaultFeedScope);
    const preferredSort = formatFeedPreferenceSort(user.defaultFeedSort);

    if (preferredScope !== "home" || preferredSort !== "hot") {
      const params = new URLSearchParams();

      if (preferredScope !== "home") {
        params.set("scope", preferredScope);
      }

      if (preferredSort !== "hot") {
        params.set("sort", preferredSort);
      }

      redirect(params.toString() ? `/feed?${params.toString()}` : "/feed");
    }
  }

  const initialSelectedCommunity = rawSelectedCommunity;
  const initialScope = parseScope(rawScope);
  const initialSort = parseSort(rawSort);
  const currentPage = parsePage(rawPage);
  const hasPreviousPage = currentPage > 1;
  const shouldLoadHomeMemberships =
    Boolean(user) && !initialSelectedCommunity && initialScope === "home";
  const shouldLoadSelectedCommunityMembership =
    Boolean(user) && Boolean(initialSelectedCommunity);
  const shouldLoadFollowingIds = Boolean(user) && initialScope === "following";

  const [memberships, follows] = await Promise.all([
    shouldLoadHomeMemberships
      ? prisma.communityMember.findMany({
          where: { userId: user!.id },
          select: {
            communityId: true,
          },
        })
      : shouldLoadSelectedCommunityMembership
        ? prisma.communityMember.findMany({
            where: {
              userId: user!.id,
              community: {
                name: {
                  equals: initialSelectedCommunity!,
                  mode: "insensitive",
                },
              },
            },
            select: {
              communityId: true,
            },
          })
      : Promise.resolve([]),
    shouldLoadFollowingIds
      ? prisma.userFollow.findMany({
          where: { followerId: user!.id },
          select: {
            followingId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const joinedCommunityIds = memberships.map((membership) => membership.communityId);
  const joinedCommunityIdSet = new Set(joinedCommunityIds);
  const followedAuthorIds = follows.map((follow) => follow.followingId);
  const joinedCommunityIdsKey = [...joinedCommunityIds].sort().join(",");
  const followedAuthorIdsKey = [...followedAuthorIds].sort().join(",");
  const isPersonalizedHome =
    !initialSelectedCommunity &&
    initialScope === "home" &&
    joinedCommunityIds.length > 0;

  const [feedBase, communities] =
    await Promise.all([
      shouldUseCachedPublicFeedBase(
        initialSelectedCommunity,
        initialScope,
        isPersonalizedHome
      )
        ? loadCachedPublicFeedPageBase(
            initialSelectedCommunity,
            initialScope,
            initialSort,
            currentPage
          )
        : user
          ? loadCachedViewerFeedPageBase(
              user.id,
              initialSelectedCommunity,
              initialScope,
              initialSort,
              currentPage,
              joinedCommunityIdsKey,
              followedAuthorIdsKey,
              isPersonalizedHome
            )
          : loadFeedPageBase({
              selectedCommunity: initialSelectedCommunity,
              scope: initialScope,
              sort: initialSort,
              currentPage,
              joinedCommunityIds,
            followedAuthorIds,
            isPersonalizedHome,
            }),
      loadCommunityNavigationItems(),
    ]);

  const [postVotes, savedPosts] =
    user && feedBase.posts.length > 0
      ? await Promise.all([
          prisma.vote.findMany({
            where: {
              userId: user.id,
              postId: { in: feedBase.posts.map((post) => post.id) },
            },
            select: {
              postId: true,
              value: true,
            },
          }),
          prisma.savedPost.findMany({
            where: {
              userId: user.id,
              postId: { in: feedBase.posts.map((post) => post.id) },
            },
            select: {
              postId: true,
            },
          }),
        ])
      : [[], []];
  const postVoteMap = new Map(
    postVotes.map((vote) => [vote.postId as string, vote.value])
  );
  const savedPostIdSet = new Set(savedPosts.map((savedPost) => savedPost.postId));

  const formattedPosts = feedBase.posts.map((post) => ({
    ...post,
    userVote: formatUserVote(postVoteMap.get(post.id)),
    isSaved: savedPostIdSet.has(post.id),
  }));
  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    description: community.description,
    color: community.color,
    icon: community.icon,
    memberCount: community.memberCount,
    postCount: community.postCount,
    isMember: joinedCommunityIdSet.has(community.id),
  }));

  return (
    <FeedClient
      initialPosts={formattedPosts}
      communities={formattedCommunities}
      initialSelectedCommunity={initialSelectedCommunity}
      initialScope={initialScope}
      initialSort={initialSort}
      currentPage={currentPage}
      hasNextPage={feedBase.hasNextPage}
      hasPreviousPage={hasPreviousPage}
      isPersonalizedHome={isPersonalizedHome}
      followedAuthorCount={followedAuthorIds.length}
      railPosts={[]}
      notificationUnreadCount={0}
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
