import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";

export default async function Home() {
  const [{ userId }, user] = await Promise.all([auth(), getCurrentUser()]);

  if (userId && !user) {
    redirect("/onboarding");
  }

  redirect("/feed");
}
