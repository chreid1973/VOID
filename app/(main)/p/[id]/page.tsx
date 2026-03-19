import { notFound } from "next/navigation";
import { getCurrentUser } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import PostPageShell from "../../../../components/PostPageShell";

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

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const [post, communities, railPosts] = await Promise.all([
    prisma.post.findUnique({
      where: { id: params.id },
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
        comments: {
          where: {
            isDeleted: false,
            parentId: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            author: {
              select: {
                username: true,
                displayName: true,
              },
            },
            replies: {
              where: {
                isDeleted: false,
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
            },
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

    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
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
    }),
  ]);

  if (!post) return notFound();
  const [postVote, commentVotes] = user
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
        post.comments.length > 0
          ? prisma.vote.findMany({
              where: {
                userId: user.id,
                commentId: { in: post.comments.map((comment) => comment.id) },
              },
              select: {
                commentId: true,
                value: true,
              },
            })
          : Promise.resolve([]),
      ])
    : [null, []];
  const commentVoteMap = new Map(
    commentVotes.map((vote) => [vote.commentId as string, vote.value])
  );

  const formattedPost = {
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    score: post.score,
    userVote: formatUserVote(postVote?.value),
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
    comments: post.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      score: comment.score,
      userVote: formatUserVote(commentVoteMap.get(comment.id)),
      createdAt: comment.createdAt.toISOString(),
      author: {
        username: comment.author.username,
        displayName: comment.author.displayName,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        createdAt: reply.createdAt.toISOString(),
        author: {
          username: reply.author.username,
          displayName: reply.author.displayName,
        },
      })),
    })),
  };

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community._count.members,
    postCount: community._count.posts,
  }));

  const formattedRailPosts = railPosts.map((item) => ({
    id: item.id,
    title: item.title,
    votes: item.score,
    community: item.community.name,
    communityDisplayName: item.community.displayName,
    communityColor: item.community.color,
    communityIcon: item.community.icon,
    time: timeAgo(item.createdAt),
  }));

  return (
    <PostPageShell
      post={formattedPost}
      communities={formattedCommunities}
      railPosts={formattedRailPosts}
    />
  );
}
