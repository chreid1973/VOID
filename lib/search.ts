import { prisma } from "./prisma";
import type {
  SearchCommunityResult,
  SearchPostResult,
  SearchResults,
  SearchSuggestionResponse,
  SearchUserResult,
} from "./search-types";

type SearchLimits = {
  users?: number;
  communities?: number;
  posts?: number;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function textRank(
  query: string,
  value: string | null | undefined,
  exact: number,
  startsWith: number,
  includes: number
) {
  if (!value) return Number.POSITIVE_INFINITY;

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) return Number.POSITIVE_INFINITY;
  if (normalizedValue === query) return exact;
  if (normalizedValue.startsWith(query)) return startsWith;
  if (normalizedValue.includes(query)) return includes;

  return Number.POSITIVE_INFINITY;
}

function minRank(...ranks: number[]) {
  return ranks.reduce((best, rank) => (rank < best ? rank : best), Number.POSITIVE_INFINITY);
}

function rankUser(query: string, user: SearchUserResult) {
  return minRank(
    textRank(query, user.username, 0, 2, 4),
    textRank(query, user.displayName, 1, 3, 5),
    textRank(query, user.bio, 6, 6, 7)
  );
}

function rankCommunity(query: string, community: SearchCommunityResult) {
  return minRank(
    textRank(query, community.name, 0, 2, 4),
    textRank(query, community.displayName, 1, 3, 5),
    textRank(query, community.description, 6, 6, 7)
  );
}

function rankPost(query: string, post: SearchPostResult) {
  return minRank(
    textRank(query, post.title, 0, 1, 2),
    textRank(query, post.author.username, 3, 4, 5),
    textRank(query, post.author.displayName, 4, 5, 6),
    textRank(query, post.community.name, 4, 5, 6),
    textRank(query, post.community.displayName, 4, 5, 6),
    textRank(query, post.body, 7, 7, 8),
    textRank(query, post.url, 8, 8, 9)
  );
}

export async function searchEverything(
  rawQuery: string,
  limits: SearchLimits = {}
): Promise<SearchResults> {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return {
      users: [],
      communities: [],
      posts: [],
    };
  }

  const userLimit = limits.users ?? 8;
  const communityLimit = limits.communities ?? 8;
  const postLimit = limits.posts ?? 16;

  const [usersRaw, communitiesRaw, postsRaw] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            bio: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
      take: Math.max(userLimit * 3, 18),
    }),
    prisma.community.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        icon: true,
        color: true,
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
      take: Math.max(communityLimit * 3, 18),
    }),
    prisma.post.findMany({
      where: {
        isHidden: false,
        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            body: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            url: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            author: {
              username: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            author: {
              displayName: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            community: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            community: {
              displayName: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      select: {
        id: true,
        publicId: true,
        title: true,
        body: true,
        url: true,
        score: true,
        commentCount: true,
        createdAt: true,
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
            icon: true,
            color: true,
          },
        },
      },
      take: Math.max(postLimit * 3, 30),
    }),
  ]);

  const users: SearchUserResult[] = usersRaw
    .map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      postCount: user._count.posts,
      commentCount: user._count.comments,
    }))
    .sort((a, b) => {
      return (
        rankUser(query, a) - rankUser(query, b) ||
        b.postCount - a.postCount ||
        a.username.localeCompare(b.username)
      );
    })
    .slice(0, userLimit);

  const communities: SearchCommunityResult[] = communitiesRaw
    .map((community) => ({
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      description: community.description,
      icon: community.icon,
      color: community.color,
      memberCount: community._count.members,
      postCount: community._count.posts,
    }))
    .sort((a, b) => {
      return (
        rankCommunity(query, a) - rankCommunity(query, b) ||
        b.memberCount - a.memberCount ||
        a.displayName.localeCompare(b.displayName)
      );
    })
    .slice(0, communityLimit);

  const posts: SearchPostResult[] = postsRaw
    .map((post) => ({
      id: post.id,
      publicId: post.publicId,
      title: post.title,
      body: post.body,
      url: post.url,
      score: post.score,
      commentCount: post.commentCount,
      createdAt: post.createdAt.toISOString(),
      author: {
        username: post.author.username,
        displayName: post.author.displayName,
      },
      community: {
        name: post.community.name,
        displayName: post.community.displayName,
        icon: post.community.icon,
        color: post.community.color,
      },
    }))
    .sort((a, b) => {
      return (
        rankPost(query, a) - rankPost(query, b) ||
        b.score - a.score ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    })
    .slice(0, postLimit);

  return {
    users,
    communities,
    posts,
  };
}

export async function loadSearchSuggestions(
  rawQuery: string
): Promise<SearchSuggestionResponse> {
  const results = await searchEverything(rawQuery, {
    users: 4,
    communities: 4,
    posts: 5,
  });

  return {
    users: results.users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    })),
    communities: results.communities.map((community) => ({
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      icon: community.icon,
      color: community.color,
    })),
    posts: results.posts.map((post) => ({
      id: post.id,
      publicId: post.publicId,
      title: post.title,
      author: {
        username: post.author.username,
        displayName: post.author.displayName,
      },
      community: {
        name: post.community.name,
        displayName: post.community.displayName,
        icon: post.community.icon,
        color: post.community.color,
      },
    })),
  };
}
