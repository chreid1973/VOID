import { redirect } from "next/navigation";
import { getAuthState } from "../../../auth";
import SearchPageShell from "../../../components/SearchPageShell";
import { loadCommunityNavigationItems } from "../../../lib/communityNav";
import { searchEverything } from "../../../lib/search";
import { resolveStoredImageUrl } from "../../../r2";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: {
    q?: string | string[];
  };
}) {
  const { userId, user } = await getAuthState();

  if (userId && !user) {
    redirect("/onboarding");
  }

  const initialQuery = firstParam(searchParams?.q)?.trim() || "";

  const [communities, results] = await Promise.all([
    loadCommunityNavigationItems(),
    searchEverything(initialQuery, {
      users: 10,
      communities: 8,
      posts: 18,
    }),
  ]);

  const formattedCommunities = communities.map((community) => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    color: community.color,
    icon: community.icon,
    memberCount: community.memberCount,
    postCount: community.postCount,
    isMember: false,
  }));

  const formattedResults = {
    ...results,
    users: results.users.map((userResult) => ({
      ...userResult,
      avatarUrl: userResult.avatarUrl
        ? resolveStoredImageUrl(userResult.avatarUrl)
        : null,
    })),
  };

  return (
    <SearchPageShell
      initialQuery={initialQuery}
      results={formattedResults}
      communities={formattedCommunities}
      notificationUnreadCount={0}
      currentUser={
        user
          ? {
              username: user.username,
              displayName: user.displayName,
            }
          : null
      }
    />
  );
}
