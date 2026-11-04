import { NextResponse } from "next/server";
import { getCompanySettings, saveCompanySettings, addAuditLog } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await getCompanySettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();

    const updated = await saveCompanySettings(body);

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Admin",
      action: "UPDATE_COMPANY_SETTINGS",
      entityType: "Settings",
      newValue: updated,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

