// seed.ts
// Run: npm run db:seed

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const communitySeeds = [
  {
    name: "void-announcements",
    displayName: "Void Announcements",
    icon: "📢",
    color: "#ff6d36",
    description:
      "Official SocialVOID updates, release notes, and platform announcements. Only admins can start threads here.",
  },
  {
    name: "design",
    displayName: "Design",
    icon: "✦",
    color: "#ee5b9a",
    description: "UI/UX, graphic design, typography, and visual culture.",
  },
  {
    name: "science",
    displayName: "Science",
    icon: "⬡",
    color: "#5beea3",
    description: "Research, discoveries, and the wonders of the natural world.",
  },
  {
    name: "gaming",
    displayName: "Gaming",
    icon: "◈",
    color: "#eea85b",
    description: "Video games, board games, and everything in between.",
  },
  {
    name: "space",
    displayName: "Space",
    icon: "◎",
    color: "#5beee8",
    description: "Astronomy, cosmology, space exploration, and the cosmos.",
  },
  {
    name: "philosophy",
    displayName: "Philosophy",
    icon: "∿",
    color: "#eedb5b",
    description: "Ethics, epistemology, metaphysics, and the examined life.",
  },
  {
    name: "movies-tv",
    displayName: "Movies/TV",
    icon: "🎬",
    color: "#8b6df0",
    description: "Film, television, streaming picks, and scene-by-scene debate.",
  },
  {
    name: "music",
    displayName: "Music",
    icon: "♫",
    color: "#f05b9a",
    description: "Albums, playlists, live shows, and songs worth replaying.",
  },
  {
    name: "sports",
    displayName: "Sports",
    icon: "🏅",
    color: "#4fbf7a",
    description: "Games, highlights, stats, and the rituals around fandom.",
  },
  {
    name: "news",
    displayName: "News",
    icon: "📰",
    color: "#5b93ee",
    description: "Breaking stories, media habits, and how people stay informed.",
  },
  {
    name: "memes",
    displayName: "Memes / Funny",
    icon: "😄",
    color: "#f08a3c",
    description: "Internet humor, harmless chaos, and the posts people actually share.",
  },
  {
    name: "ai",
    displayName: "AI",
    icon: "🤖",
    color: "#7f6bff",
    description: "AI tools, practical workflows, and where the hype meets reality.",
  },
  {
    name: "art",
    displayName: "Art",
    icon: "🎨",
    color: "#c56bff",
    description:
      "Painting, illustration, galleries, visual art, and the work people cannot stop looking at.",
  },
  {
    name: "photography",
    displayName: "Photography",
    icon: "📷",
    color: "#79b6ff",
    description:
      "Photography, cameras, visual storytelling, editing, and the shots worth slowing down for.",
  },
  {
    name: "books",
    displayName: "Books",
    icon: "📚",
    color: "#6fa8ff",
    description:
      "Books, authors, reading lists, literary debate, and what is worth your time.",
  },
  {
    name: "food",
    displayName: "Food",
    icon: "🍜",
    color: "#ff8a5b",
    description:
      "Recipes, restaurants, home cooking, food culture, and meals worth sharing.",
  },
  {
    name: "history",
    displayName: "History",
    icon: "🏛",
    color: "#d6b25e",
    description:
      "Historical events, people, timelines, revision debates, and the long memory of culture.",
  },
  {
    name: "programming",
    displayName: "Programming",
    icon: "⌘",
    color: "#5beea3",
    description:
      "Code, software, debugging, engineering culture, and building things that actually work.",
  },
  {
    name: "questions",
    displayName: "Questions",
    icon: "?",
    color: "#f0b35b",
    description:
      "Questions, prompts, curious hypotheticals, and the threads that get people talking.",
  },
  {
    name: "interesting",
    displayName: "Interesting",
    icon: "✹",
    color: "#f0c15b",
    description:
      "Curiosities, odd finds, surprising facts, and the things people cannot help clicking on.",
  },
  {
    name: "tech",
    displayName: "Technology",
    icon: "⚡",
    color: "#5b8dee",
    description:
      "Technology news, gadgets, platforms, and the systems shaping how people live online.",
  },
  {
    name: "travel",
    displayName: "Travel",
    icon: "✈",
    color: "#5bc7ee",
    description:
      "Trips, destinations, travel advice, itineraries, and stories from the road.",
  },
] as const;

const userSeeds = [
  {
    id: "seed-user-ava",
    clerkId: "seed_clerk_ava",
    username: "ava_seed",
    displayName: "Ava Chen",
  },
  {
    id: "seed-user-miles",
    clerkId: "seed_clerk_miles",
    username: "miles_seed",
    displayName: "Miles Carter",
  },
  {
    id: "seed-user-noor",
    clerkId: "seed_clerk_noor",
    username: "noor_seed",
    displayName: "Noor Patel",
  },
] as const;

const postSeeds = [
  {
    id: "seed-post-gaming-coop",
    publicId: "gcoop0001",
    communityName: "gaming",
    authorClerkId: "seed_clerk_ava",
    title: "What co-op game are you still playing weekly?",
    body: "Looking for games that have stayed fun for months, not just the launch weekend rush.",
  },
  {
    id: "seed-post-gaming-campaigns",
    publicId: "gcamp0002",
    communityName: "gaming",
    authorClerkId: "seed_clerk_miles",
    title: "Do shorter single-player campaigns make you more likely to finish a game?",
    body: "I keep bouncing off 60-hour games lately. Curious where people land on ideal length.",
  },
  {
    id: "seed-post-movies-pilot",
    publicId: "pilot0003",
    communityName: "movies-tv",
    authorClerkId: "seed_clerk_noor",
    title: "Which recent series had the strongest first episode?",
    body: "Not necessarily the best full season, just the best hook right out of the gate.",
  },
  {
    id: "seed-post-movies-rewatch",
    publicId: "rewat0004",
    communityName: "movies-tv",
    authorClerkId: "seed_clerk_ava",
    title: "What movie held up better on a rewatch than you expected?",
    body: "Sometimes a second watch makes the pacing or performances click in a bigger way.",
  },
  {
    id: "seed-post-music-opener",
    publicId: "music0005",
    communityName: "music",
    authorClerkId: "seed_clerk_miles",
    title: "What album opener grabs you immediately every time?",
    body: "Trying to build a playlist of first tracks that set the tone fast.",
  },
  {
    id: "seed-post-music-length",
    publicId: "music0006",
    communityName: "music",
    authorClerkId: "seed_clerk_noor",
    title: "Are shorter albums making you more likely to replay them?",
    body: "Feels like 30 to 40 minute records get more repeat listens from me lately.",
  },
  {
    id: "seed-post-sports-casual",
    publicId: "sport0007",
    communityName: "sports",
    authorClerkId: "seed_clerk_ava",
    title: "What sport is easiest to follow casually right now?",
    body: "Thinking about good entry points for someone who wants the fun without memorizing everything.",
  },
  {
    id: "seed-post-sports-stats",
    publicId: "sport0008",
    communityName: "sports",
    authorClerkId: "seed_clerk_miles",
    title: "How much do advanced stats change the way you watch a game?",
    body: "Do they make the experience richer for you, or do you mostly ignore them during the action?",
  },
  {
    id: "seed-post-news-burnout",
    publicId: "news00009",
    communityName: "news",
    authorClerkId: "seed_clerk_noor",
    title: "How do you keep up with breaking news without burning out?",
    body: "Looking for routines that stay informed without turning the entire day into doomscrolling.",
  },
  {
    id: "seed-post-news-trust",
    publicId: "news00010",
    communityName: "news",
    authorClerkId: "seed_clerk_ava",
    title: "What makes a source feel trustworthy to you?",
    body: "I usually look for clear sourcing and calm language first, but I am curious what others prioritize.",
  },
  {
    id: "seed-post-memes-format",
    publicId: "memes0011",
    communityName: "memes",
    authorClerkId: "seed_clerk_miles",
    title: "What internet joke format still makes you laugh every time?",
    body: "No need to post the meme itself. Just name the format that still works on you.",
  },
  {
    id: "seed-post-memes-groupchat",
    publicId: "memes0012",
    communityName: "memes",
    authorClerkId: "seed_clerk_noor",
    title: "What is the most harmlessly chaotic thing your group chat has turned into?",
    body: "Mine somehow became 60 percent weather updates and 40 percent blurry pet photos.",
  },
  {
    id: "seed-post-ai-utility",
    publicId: "aiutil0013",
    communityName: "ai",
    authorClerkId: "seed_clerk_ava",
    title: "What AI tool has been genuinely useful in your daily workflow?",
    body: "Not the flashiest demo. Just the thing that keeps saving you time week after week.",
  },
  {
    id: "seed-post-ai-overhyped",
    publicId: "aihype0014",
    communityName: "ai",
    authorClerkId: "seed_clerk_miles",
    title: "What AI use case still feels overhyped to you?",
    body: "Interested in practical skepticism, especially from people who use these tools regularly.",
  },
] as const;

const commentSeeds = [
  {
    id: "seed-comment-gaming-coop",
    postId: "seed-post-gaming-coop",
    authorClerkId: "seed_clerk_noor",
    body: "Co-op survival games still seem to do the best job of getting the group online consistently.",
    parentId: null,
  },
  {
    id: "seed-comment-ai-utility",
    postId: "seed-post-ai-utility",
    authorClerkId: "seed_clerk_miles",
    body: "Summaries and first-draft cleanup are the two that have stuck for me.",
    parentId: null,
  },
  {
    id: "seed-comment-ai-utility-reply",
    postId: "seed-post-ai-utility",
    authorClerkId: "seed_clerk_ava",
    body: "Same. The small repetitive tasks are where the value feels the most obvious.",
    parentId: "seed-comment-ai-utility",
  },
] as const;

async function deleteEmptyCommunityByName(name: string) {
  const community = await prisma.community.findUnique({
    where: { name },
    select: {
      id: true,
      _count: {
        select: {
          posts: true,
          members: true,
        },
      },
    },
  });

  if (!community) return;
  if (community._count.posts > 0 || community._count.members > 0) return;

  await prisma.community.delete({ where: { id: community.id } });
  console.log(`Deleted empty community: ${name}`);
}

async function main() {
  console.log("Seeding database...");

  const communities = await Promise.all(
    communitySeeds.map((community) =>
      prisma.community.upsert({
        where: { name: community.name },
        update: {
          displayName: community.displayName,
          icon: community.icon,
          color: community.color,
          description: community.description,
        },
        create: community,
      })
    )
  );

  const users = await Promise.all(
    userSeeds.map((user) =>
      prisma.user.upsert({
        where: { clerkId: user.clerkId },
        update: {
          username: user.username,
          displayName: user.displayName,
        },
        create: {
          id: user.id,
          clerkId: user.clerkId,
          username: user.username,
          displayName: user.displayName,
        },
      })
    )
  );

  const communityByName = new Map(communities.map((community) => [community.name, community]));
  const userByClerkId = new Map(users.map((user) => [user.clerkId, user]));

  const posts = await Promise.all(
    postSeeds.map((post) => {
      const community = communityByName.get(post.communityName);
      const user = userByClerkId.get(post.authorClerkId);

      if (!community || !user) {
        throw new Error(`Missing seed relation for post ${post.id}`);
      }

      return prisma.post.upsert({
        where: { id: post.id },
        update: {
          publicId: post.publicId,
          title: post.title,
          body: post.body,
          communityId: community.id,
          authorId: user.id,
          score: 1,
          type: "TEXT",
        },
        create: {
          id: post.id,
          publicId: post.publicId,
          title: post.title,
          body: post.body,
          communityId: community.id,
          authorId: user.id,
          score: 1,
          type: "TEXT",
        } satisfies Prisma.PostUncheckedCreateInput,
      });
    })
  );

  await Promise.all(
    posts.map((post) => {
      const seededPost = postSeeds.find((item) => item.id === post.id);
      const user = seededPost
        ? userByClerkId.get(seededPost.authorClerkId)
        : null;

      if (!user) {
        throw new Error(`Missing seed author for post vote ${post.id}`);
      }

      return prisma.vote.upsert({
        where: {
          userId_postId: {
            userId: user.id,
            postId: post.id,
          },
        },
        update: { value: 1 },
        create: {
          userId: user.id,
          postId: post.id,
          value: 1,
        },
      });
    })
  );

  const comments = [];

  for (const comment of commentSeeds) {
    const user = userByClerkId.get(comment.authorClerkId);

    if (!user) {
      throw new Error(`Missing seed author for comment ${comment.id}`);
    }

    comments.push(
      await prisma.comment.upsert({
        where: { id: comment.id },
        update: {
          postId: comment.postId,
          parentId: comment.parentId,
          authorId: user.id,
          body: comment.body,
          score: 1,
          isDeleted: false,
        },
        create: {
          id: comment.id,
          postId: comment.postId,
          parentId: comment.parentId,
          authorId: user.id,
          body: comment.body,
          score: 1,
        },
      })
    );
  }

  await Promise.all(
    comments.map((comment) => {
      const seededComment = commentSeeds.find((item) => item.id === comment.id);
      const user = seededComment
        ? userByClerkId.get(seededComment.authorClerkId)
        : null;

      if (!user) {
        throw new Error(`Missing seed author for comment vote ${comment.id}`);
      }

      return prisma.vote.upsert({
        where: {
          userId_commentId: {
            userId: user.id,
            commentId: comment.id,
          },
        },
        update: { value: 1 },
        create: {
          userId: user.id,
          commentId: comment.id,
          value: 1,
        },
      });
    })
  );

  await Promise.all(
    postSeeds.map(async (post) => {
      const commentCount = await prisma.comment.count({
        where: { postId: post.id },
      });

      await prisma.post.update({
        where: { id: post.id },
        data: { commentCount },
      });
    })
  );

  await deleteEmptyCommunityByName("technology");
  await deleteEmptyCommunityByName("cinema");

  const seededCommunities = [
    "gaming",
    "movies-tv",
    "music",
    "sports",
    "news",
    "memes",
    "ai",
  ];

  console.log(`Created or updated ${communities.length} communities`);
  console.log(`Created or updated ${users.length} seed users`);
  console.log(`Created or updated ${posts.length} seed posts`);
  console.log(`Created or updated ${comments.length} seed comments`);

  for (const communityName of seededCommunities) {
    const count = postSeeds.filter((post) => post.communityName === communityName).length;
    console.log(`${communityName}: ${count} seed posts`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
