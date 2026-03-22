import type { Metadata } from "next";
import PolicyPageShell from "../../../components/PolicyPageShell";
import {
  communityRulesSections,
  sharedPolicyDate,
} from "../../../lib/policyContent";

export const metadata: Metadata = {
  title: "Community Rules | SocialVOID",
  description: "Community Rules for SocialVOID.",
};

export default function CommunityRulesPage() {
  return (
    <PolicyPageShell
      eyebrow="Policy"
      title="Community Rules"
      lastUpdated={sharedPolicyDate}
      currentPath="/community-rules"
      intro={[
        "SocialVOID is built for fast, public conversation. These are the platform-wide rules that keep that possible.",
        "They are meant to be readable, firm, and specific to how the product actually works.",
      ]}
      sections={communityRulesSections}
    />
  );
}
