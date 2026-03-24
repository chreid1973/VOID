import { NextResponse } from "next/server";
import { loadTrendingRailPosts } from "../../../lib/trendingRail";

function timeAgo(date: Date | string) {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "5", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 10) : 5;
  const excludePostId = searchParams.get("excludePostId")?.trim() || undefined;
  const posts = await loadTrendingRailPosts(limit, excludePostId);

  return NextResponse.json({
    posts: posts.map((post) => ({
      id: post.id,
      publicId: post.publicId,
      title: post.title,
      votes: post.votes,
      community: post.community,
      communityDisplayName: post.communityDisplayName,
      communityColor: post.communityColor,
      communityIcon: post.communityIcon,
      time: timeAgo(post.createdAt),
    })),
  });
}
