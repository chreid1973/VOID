"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function ProfileSignOutButton() {
  return (
    <SignOutButton redirectUrl="/">
      <button className="act" type="button">
        Log out
      </button>
    </SignOutButton>
  );
}
