import { NextResponse } from "next/server";
import { objectCache } from "@/lib/cache";

export async function GET() {
  try {
    const stats = objectCache.getStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

