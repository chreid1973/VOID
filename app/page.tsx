import { redirect } from "next/navigation";
import { getAuthState } from "../auth";

export default async function Home() {
  const { userId, user } = await getAuthState();

  if (userId && !user) {
    redirect("/onboarding");
  }

  redirect("/feed");
}
