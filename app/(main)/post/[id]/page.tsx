import { notFound } from "next/navigation";
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

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
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

  const formattedPost = {
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    score: post.score,
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
      createdAt: comment.createdAt.toISOString(),
      author: {
        username: comment.author.username,
        displayName: comment.author.displayName,
      },
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