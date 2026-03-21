import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { prisma } from "./prisma";

const getClerkAuth = cache(async () => auth());

export const getAuthState = cache(async () => {
  const { userId } = await getClerkAuth();

  if (!userId) {
    return {
      userId: null,
      user: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return {
    userId,
    user,
  };
});

export async function getCurrentUser() {
  const { user } = await getAuthState();
  return user;
}

export async function getCurrentClerkUserId() {
  const { userId } = await getAuthState();
  return userId;
}

export async function getCurrentUserByClerkId(clerkId: string | null | undefined) {
  if (!clerkId) return null;

  return prisma.user.findUnique({
    where: { clerkId },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function isAdminUser(
  user: {
    username: string;
    isAdmin: boolean;
  } | null | undefined
) {
  if (!user) return false;
  if (user.isAdmin) return true;

  const configuredAdmins =
    process.env.ADMIN_USERNAMES?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return configuredAdmins.includes(user.username.toLowerCase());
}

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminUser(user)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
