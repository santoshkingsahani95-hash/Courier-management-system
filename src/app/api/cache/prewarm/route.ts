import { NextResponse } from "next/server";
import { cacheCrawler, objectCache } from "@/lib/cache";

export async function POST() {
  try {
    const startTime = Date.now();
    const result = await cacheCrawler.warmAll();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "Cache pre-warming and crawling completed successfully",
      durationMs,
      stats: objectCache.getStats(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

