import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();
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
