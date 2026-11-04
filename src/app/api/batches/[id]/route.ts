import { NextResponse } from "next/server";
import { getBatchById, getParcels } from "@/lib/store";
import { objectCache } from "@/lib/cache";

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

