import { NotificationType, Prisma } from "@prisma/client";
import { extractMentionUsernames } from "./mentions";

type TransactionClient = Prisma.TransactionClient;

export async function createPostMentionNotifications(
  tx: TransactionClient,
  {
    actorUserId,
    postId,
    title,
    body,
  }: {
    actorUserId: string;
    postId: string;
    title: string;
    body: string | null;
  }
) {
  const mentionedUsernames = Array.from(
    new Set(extractMentionUsernames([title, body].filter(Boolean).join("\n")))
  );

  if (mentionedUsernames.length === 0) {
    return;
  }

  const mentionedUsers = await tx.user.findMany({
    where: {
      username: {
        in: mentionedUsernames,
      },
      id: {
        not: actorUserId,
      },
    },
    select: {
      id: true,
    },
  });

  if (mentionedUsers.length === 0) {
    return;
  }

  await tx.notification.createMany({
    data: mentionedUsers.map((user) => ({
      userId: user.id,
      actorId: actorUserId,
      postId,
      type: NotificationType.MENTION_IN_POST,
    })),
  });
}

export async function createCommentNotifications(
  tx: TransactionClient,
  {
    actorUserId,
    postId,
    commentId,
    body,
    postAuthorId,
    parentAuthorId,
  }: {
    actorUserId: string;
    postId: string;
    commentId: string;
    body: string;
    postAuthorId: string;
    parentAuthorId: string | null;
  }
) {
  const notifications: Array<{
    userId: string;
    actorId: string;
    postId: string;
    commentId: string;
    type: NotificationType;
  }> = [];
  const alreadyNotified = new Set<string>();

  if (parentAuthorId && parentAuthorId !== actorUserId) {
    notifications.push({
      userId: parentAuthorId,
      actorId: actorUserId,
      postId,
      commentId,
      type: NotificationType.REPLY_TO_COMMENT,
    });
    alreadyNotified.add(parentAuthorId);
  }

  if (postAuthorId !== actorUserId && !alreadyNotified.has(postAuthorId)) {
    notifications.push({
      userId: postAuthorId,
      actorId: actorUserId,
      postId,
      commentId,
      type: NotificationType.COMMENT_ON_POST,
    });
    alreadyNotified.add(postAuthorId);
  }

  const mentionedUsernames = extractMentionUsernames(body);

  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await tx.user.findMany({
      where: {
        username: {
          in: mentionedUsernames,
        },
        id: {
          not: actorUserId,
        },
      },
      select: {
        id: true,
      },
    });

    for (const user of mentionedUsers) {
      if (alreadyNotified.has(user.id)) continue;

      notifications.push({
        userId: user.id,
        actorId: actorUserId,
        postId,
        commentId,
        type: NotificationType.MENTION_IN_COMMENT,
      });
      alreadyNotified.add(user.id);
    }
  }

  if (notifications.length === 0) {
    return;
  }

  await tx.notification.createMany({
    data: notifications,
  });
}
