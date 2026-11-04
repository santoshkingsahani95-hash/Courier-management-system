import { NextResponse } from "next/server";
import { getBatchById, getParcels, updateBatch, deleteBatch, addAuditLog } from "@/lib/store";
import { objectCache } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { checkEditOrDeletePermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check pre-warmed cache
    const preCrawled = objectCache.get<any>(`batch:detail:${params.id}`);
    if (preCrawled) {
      return NextResponse.json({ ...preCrawled, _fromCache: true });
    }

    const batch = await getBatchById(params.id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Try secondary index first
    let batchParcels = objectCache.getParcelsByBatch(batch._id);
    if (!batchParcels || batchParcels.length === 0) {
      const parcels = await getParcels();
      batchParcels = parcels.filter(
        (p) => p.batchId === batch._id || p.batchNumber === batch.batchNumber
      );
    }

    const returnedCount = batchParcels.filter((p) => p.status === "Returned").length;
    const deliveredCount = batchParcels.filter((p) => p.status !== "Returned" && p.status !== "Cancelled").length;
    const pendingCount = 0;
    const totalCOD = batchParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
    const settledCount = batchParcels.filter((p) => p.settlementStatus === "Settled").length;
    let settlementStatus: "Settled" | "Partially Settled" | "Unsettled" = "Unsettled";
    if (batchParcels.length > 0 && settledCount === batchParcels.length) {
      settlementStatus = "Settled";
    } else if (settledCount > 0) {
      settlementStatus = "Partially Settled";
    }

    const result = {
      batch: {
        ...batch,
        totalPackages: batchParcels.length > 0 ? batchParcels.length : (batch.totalPackages || 0),
        totalCOD: batchParcels.length > 0 ? totalCOD : (batch.totalCOD || 0),
        deliveredCount,
        returnedCount,
        pendingCount,
        settlementStatus,
      },
      parcels: batchParcels,
    };

    objectCache.set(`batch:detail:${batch._id}`, result, 5 * 60 * 1000, ["batches"]);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const body = await request.json();
    const updated = await updateBatch(params.id, body);

    if (!updated) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Manager",
      action: "UPDATE_BATCH",
      entityType: "Batch",
      entityId: params.id,
      newValue: body,
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const result = await deleteBatch(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed to delete batch" }, { status: 400 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Manager",
      action: "DELETE_BATCH",
      entityType: "Batch",
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: "Batch and associated records deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

