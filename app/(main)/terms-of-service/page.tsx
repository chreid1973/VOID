import type { Metadata } from "next";
import PolicyPageShell from "../../../components/PolicyPageShell";
import { sharedPolicyDate, termsSections } from "../../../lib/policyContent";

export const metadata: Metadata = {
  title: "Terms of Service | SocialVOID",
  description: "Terms of Service for SocialVOID.",
};

export default function TermsOfServicePage() {
  return (
    <PolicyPageShell
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={sharedPolicyDate}
      currentPath="/terms-of-service"
      intro={[
        "These terms govern access to SocialVOID and set the baseline rules for using the platform.",
        "They are written to match the current product, public discussion model, and moderation approach.",
      ]}
      sections={termsSections}
    />
  );
}
