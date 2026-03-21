import { prisma } from "./prisma";

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

export async function loadExistingMentionUsernames(
  texts: Array<string | null | undefined>
) {
  const usernames = Array.from(
    new Set(texts.flatMap((text) => extractMentionUsernames(text)))
  );

  if (usernames.length === 0) {
    return [] as string[];
  }

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

  return users.map((user) => user.username);
}
