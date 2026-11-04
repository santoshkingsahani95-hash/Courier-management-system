import { NextResponse } from "next/server";
import { getBatches, saveBatch, addAuditLog, getParcels } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const batches = await getBatches();
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();

    if (!body.courierId) {
      return NextResponse.json({ error: "Courier is required" }, { status: 400 });
    }

    const batch = await saveBatch({
      batchNumber: body.batchNumber,
      courierId: body.courierId,
      courierName: body.courierName,
      batchDate: body.batchDate,
      totalPackages: body.totalPackages || 0,
      totalCOD: body.totalCOD || 0,
      notes: body.notes || "",
      createdBy: currentUser?.name || "Staff",
    });

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Staff",
      action: "CREATE_BATCH",
      entityType: "Batch",
      entityId: batch._id,
      newValue: batch,
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

