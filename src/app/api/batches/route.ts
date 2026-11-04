import { NextResponse } from "next/server";
import { getBatches, saveBatch, addAuditLog, getParcels } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const batches = await getBatches();
    const parcels = await getParcels();

    // Attach real counts from parcels to each batch
    const enriched = batches.map((b) => {
      const bParcels = parcels.filter((p) => p.batchId === b._id || p.batchNumber === b.batchNumber);
      const deliveredCount = bParcels.filter((p) => p.status === "Delivered").length;
      const returnedCount = bParcels.filter((p) => p.status === "Returned").length;
      const pendingCount = bParcels.filter((p) => p.status === "Pending").length;
      const totalCOD = bParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

      return {
        ...b,
        totalPackages: bParcels.length > 0 ? bParcels.length : b.totalPackages,
        totalCOD: bParcels.length > 0 ? totalCOD : b.totalCOD,
        deliveredCount,
        returnedCount,
        pendingCount,
      };
    });

    return NextResponse.json({ batches: enriched });
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

