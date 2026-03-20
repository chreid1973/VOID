import { NextRequest, NextResponse } from "next/server";
import { getObjectUrl } from "@/r2";

type Params = {
  params: {
    key?: string[];
  };
};

export async function GET(_req: NextRequest, { params }: Params) {
  const keyParts = params.key ?? [];

  if (
    keyParts.length === 0 ||
    keyParts.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Invalid media key." }, { status: 400 });
  }

  try {
    const key = keyParts.join("/");
    const signedUrl = await getObjectUrl(key);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (error) {
    console.error("[GET /api/media/[...key]]", error);
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
}
