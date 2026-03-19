// lib/auth.ts
// Syncs Clerk user into our own DB on first login

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // Check our DB first
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  // First time — sync from Clerk into our DB
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const username =
      clerkUser.username ??
      clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ??
      `user_${clerkId.slice(-6)}`;

    user = await prisma.user.create({
      data: {
        clerkId,
        username,
        displayName: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
          : username,
        avatarUrl: clerkUser.imageUrl,
      },
    });
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
