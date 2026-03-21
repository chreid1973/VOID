import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth) => {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/moderation(.*)",
    "/onboarding(.*)",
    "/submit(.*)",
  ],
};
