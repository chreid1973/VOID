// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Communities
  const communities = await Promise.all([
    prisma.community.upsert({
      where: { name: "technology" },
      update: {},
      create: { name: "technology", displayName: "Technology", icon: "⚡", color: "#5b8dee",
        description: "The latest in tech, gadgets, software, and the internet." },
    }),
    prisma.community.upsert({
      where: { name: "design" },
      update: {},
      create: { name: "design", displayName: "Design", icon: "✦", color: "#ee5b9a",
        description: "UI/UX, graphic design, typography, and visual culture." },
    }),
    prisma.community.upsert({
      where: { name: "science" },
      update: {},
      create: { name: "science", displayName: "Science", icon: "⬡", color: "#5beea3",
        description: "Research, discoveries, and the wonders of the natural world." },
    }),
    prisma.community.upsert({
      where: { name: "gaming" },
      update: {},
      create: { name: "gaming", displayName: "Gaming", icon: "◈", color: "#eea85b",
        description: "Video games, board games, and everything in between." },
    }),
    prisma.community.upsert({
      where: { name: "cinema" },
      update: {},
      create: { name: "cinema", displayName: "Cinema", icon: "◉", color: "#a45bee",
        description: "Film discussion, reviews, news and theory." },
    }),
    prisma.community.upsert({
      where: { name: "space" },
      update: {},
      create: { name: "space", displayName: "Space", icon: "◎", color: "#5beee8",
        description: "Astronomy, cosmology, space exploration, and the cosmos." },
    }),
    prisma.community.upsert({
      where: { name: "philosophy" },
      update: {},
      create: { name: "philosophy", displayName: "Philosophy", icon: "∿", color: "#eedb5b",
        description: "Ethics, epistemology, metaphysics, and the examined life." },
    }),
  ]);

  console.log(`✅ Created ${communities.length} communities`);
  console.log("✅ Seed complete. Create your first user through the app UI.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
