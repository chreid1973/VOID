import { permanentRedirect } from "next/navigation";

export default async function LegacyPostPage({
  params,
}: {
  params: { id: string };
}) {
  permanentRedirect(`/p/${params.id}`);
}
