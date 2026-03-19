import FeedClient from "../../../components/FeedClient";
import { prisma } from "../../../lib/prisma";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

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

export default async function FeedPage() {
  const [posts, communities] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
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
      },
    }),
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
  ]);

  const formattedPosts = posts.map((post) => ({
    id: post.id,
    community: post.community.name,
    title: post.title,
    body: post.body ?? "",
    author: post.author.displayName || post.author.username,
    votes: post.score ?? 0,
    comments: post.commentCount ?? 0,
    time: timeAgo(post.createdAt),
    flair: post.flair,
    flairColor: post.flairColor,
  }));

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community._count.members,
    postCount: community._count.posts,
  }));

  return (
    <FeedClient
      initialPosts={formattedPosts}
      communities={formattedCommunities}
    />
  );
}