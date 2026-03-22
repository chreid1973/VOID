import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const MENTION_USERNAMES_TAG = "mention-usernames";

export function extractMentionUsernames(text: string | null | undefined) {
  if (!text) return [] as string[];

  const mentionRegex = /(^|[^a-z0-9_])@([a-z0-9_]{3,24})(?=$|[^a-z0-9_])/gi;
  const usernames = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.add(match[2].toLowerCase());
  }

  return Array.from(usernames);
}

export function filterMentionUsernames(
  text: string | null | undefined,
  validUsernames: Iterable<string>
) {
  const validSet = new Set(
    Array.from(validUsernames).map((username) => username.toLowerCase())
  );

  return extractMentionUsernames(text).filter((username) =>
    validSet.has(username)
  );
}

function normalizeMentionUsernames(usernames: string[]) {
  return Array.from(
    new Set(
      usernames
        .map((username) => username.trim().toLowerCase())
        .filter((username) => /^[a-z0-9_]{3,24}$/.test(username))
    )
  ).sort();
}

const loadCachedExistingMentionUsernames = unstable_cache(
  async (_cacheKey: string, usernames: string[]) => {
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: usernames,
        },
      },
      select: {
        username: true,
      },
    });

    return users.map((user) => user.username.toLowerCase());
  },
  [MENTION_USERNAMES_TAG],
  {
    revalidate: 300,
    tags: [MENTION_USERNAMES_TAG],
  }
);

export async function resolveExistingMentionUsernames(usernames: string[]) {
  const normalizedUsernames = normalizeMentionUsernames(usernames);

  if (normalizedUsernames.length === 0) {
    return [] as string[];
  }

  return loadCachedExistingMentionUsernames(
    normalizedUsernames.join(","),
    normalizedUsernames
  );
}

export async function loadExistingMentionUsernames(
  texts: Array<string | null | undefined>
) {
  return resolveExistingMentionUsernames(
    texts.flatMap((text) => extractMentionUsernames(text))
  );
}
