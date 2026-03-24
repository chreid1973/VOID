import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.notification.count({
    where: {
      userId: user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
