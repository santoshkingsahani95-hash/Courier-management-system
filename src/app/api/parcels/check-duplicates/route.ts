import { NextResponse } from "next/server";
import { checkDuplicates } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const { trackingDuplicates, suspiciousDuplicates } = await checkDuplicates(items);

    return NextResponse.json({
      hasDuplicates: trackingDuplicates.length > 0 || suspiciousDuplicates.length > 0,
      trackingDuplicates,
      suspiciousDuplicates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

