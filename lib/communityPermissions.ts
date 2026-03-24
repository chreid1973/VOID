import { isAdminUser } from "../auth";

const ADMIN_ONLY_COMMUNITY_NAMES = new Set(["void-announcements"]);

export function isAdminOnlyCommunityName(name: string | null | undefined) {
  return ADMIN_ONLY_COMMUNITY_NAMES.has((name ?? "").trim().toLowerCase());
}

export function canUserPostToCommunity(
  community: { name: string } | null | undefined,
  user:
    | {
        username: string;
        isAdmin: boolean;
      }
    | null
    | undefined
) {
  if (!community) return false;
  if (!isAdminOnlyCommunityName(community.name)) return true;

  return isAdminUser(user);
}
