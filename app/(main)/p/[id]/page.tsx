import { notFound, permanentRedirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { loadTrendingRailPosts } from "../../../../lib/trendingRail";
import PostPageShell from "../../../../components/PostPageShell";
import { resolveStoredImageUrl } from "../../../../r2";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatUserVote(value: number | null | undefined): 1 | -1 | null {
  return value === 1 ? 1 : value === -1 ? -1 : null;
}

type LoadedComment = {
  id: string;
  parentId: string | null;
  body: string;
  score: number;
  userVote: 1 | -1 | null;
  isHidden: boolean;
  isDeleted: boolean;
  isOwner: boolean;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
  };
  replies: LoadedComment[];
};

function buildCommentTree(
  flatComments: Array<Omit<LoadedComment, "replies">>
): LoadedComment[] {
  const map = new Map<string, LoadedComment>();
  const roots: LoadedComment[] = [];

  for (const comment of flatComments) {
    map.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of flatComments) {
    const node = map.get(comment.id);

    if (!node) continue;

    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)?.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const renderedAt = new Date().toISOString();
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);
  const post = await prisma.post.findFirst({
    where: {
      OR: [{ publicId: params.id }, { id: params.id }],
    },
    include: {
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
    },
  });

  if (!post) return notFound();
  if (post.isHidden && !isAdmin) return notFound();
  if (params.id !== post.publicId) {
    permanentRedirect(`/p/${post.publicId}`);
  }
  const [comments, communities, railPosts] = await Promise.all([
    prisma.comment.findMany({
      where: {
        postId: post.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        author: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    }),

    prisma.community.findMany({
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
    }),

    loadTrendingRailPosts(5, post.id),
  ]);
  const [postVote, commentVotes, savedPost] = user
    ? await Promise.all([
        prisma.vote.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: post.id,
            },
          },
          select: {
            value: true,
          },
        }),
        comments.length > 0
          ? prisma.vote.findMany({
              where: {
                userId: user.id,
                commentId: { in: comments.map((comment) => comment.id) },
              },
              select: {
                commentId: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: post.id,
            },
          },
          select: {
            id: true,
          },
        }),
      ])
    : [null, [], null];
  const commentVoteMap = new Map(
    commentVotes.map((vote) => [vote.commentId as string, vote.value])
  );

  const formattedPost = {
    id: post.id,
    publicId: post.publicId,
    title: post.title,
    body: post.body,
    url: post.url,
    imageUrl: post.imageKey ? resolveStoredImageUrl(post.imageKey) : null,
    createdAt: post.createdAt.toISOString(),
    score: post.score,
    userVote: formatUserVote(postVote?.value),
    isSaved: Boolean(savedPost),
    isOwner: user?.id === post.authorId,
    commentCount: post.commentCount,
    author: {
      username: post.author.username,
      displayName: post.author.displayName,
    },
    community: {
      name: post.community.name,
      displayName: post.community.displayName,
      color: post.community.color,
      icon: post.community.icon,
    },
    crosspostSource: post.crosspostOf
      ? {
          id: post.crosspostOf.id,
          publicId: post.crosspostOf.publicId,
          authorName:
            post.crosspostOf.author.displayName || post.crosspostOf.author.username,
          authorUsername: post.crosspostOf.author.username,
          community: post.crosspostOf.community.name,
          communityDisplayName: post.crosspostOf.community.displayName,
          communityColor: post.crosspostOf.community.color,
          communityIcon: post.crosspostOf.community.icon,
        }
      : null,
    comments: buildCommentTree(
      comments.map((comment) => ({
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        score: comment.score,
        userVote: formatUserVote(commentVoteMap.get(comment.id)),
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        isOwner: user?.id === comment.authorId,
        createdAt: comment.createdAt.toISOString(),
        author: {
          username: comment.author.username,
          displayName: comment.author.displayName,
        },
      }))
    ),
  };

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community._count.members,
    postCount: community._count.posts,
    isMember: false,
  }));

  const formattedRailPosts = railPosts.map((item) => ({
    id: item.id,
    publicId: item.publicId,
    title: item.title,
    votes: item.votes,
    community: item.community,
    communityDisplayName: item.communityDisplayName,
    communityColor: item.communityColor,
    communityIcon: item.communityIcon,
    time: timeAgo(item.createdAt),
  }));

  return (
    <PostPageShell
      post={formattedPost}
      communities={formattedCommunities}
      railPosts={formattedRailPosts}
      renderedAt={renderedAt}
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
