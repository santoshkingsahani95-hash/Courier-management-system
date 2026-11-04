import { NextResponse } from "next/server";
import { objectCache, cacheCrawler } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    let tag: string | null = null;
    try {
      const body = await request.json();
      tag = body.tag || null;
    } catch {}

    if (tag) {
      objectCache.invalidateTag(tag);
      return NextResponse.json({
        success: true,
        message: `Cache tag '${tag}' invalidated`,
        stats: objectCache.getStats(),
      });
    }

    objectCache.invalidateAll();
    // Re-warm immediately after full clear
    const prewarmResult = await cacheCrawler.warmAll();

    return NextResponse.json({
      success: true,
      message: "Cache cleared and pre-warmed successfully",
      stats: prewarmResult.stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

