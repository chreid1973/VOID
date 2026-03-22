import type { Metadata } from "next";
import PolicyPageShell from "../../../components/PolicyPageShell";
import { privacySections, sharedPolicyDate } from "../../../lib/policyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | SocialVOID",
  description: "Privacy Policy for SocialVOID.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={sharedPolicyDate}
      currentPath="/privacy-policy"
      intro={[
        "This policy describes what SocialVOID collects, what stays public, and how information is used to run and protect the platform.",
        "It is written for the current product and public discussion model, not as a generic placeholder policy.",
      ]}
      sections={privacySections}
    />
  );
}
