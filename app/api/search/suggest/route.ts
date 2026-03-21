import { NextRequest, NextResponse } from "next/server";
import { loadSearchSuggestions } from "@/lib/search";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({
        users: [],
        communities: [],
        posts: [],
      });
    }

    if (query.length > 80) {
      return NextResponse.json(
        { error: "Search query is too long." },
        { status: 422 }
      );
    }

    const suggestions = await loadSearchSuggestions(query);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("[GET /api/search/suggest]", error);

    return NextResponse.json(
      { error: "Failed to load search suggestions." },
      { status: 500 }
    );
  }
}
