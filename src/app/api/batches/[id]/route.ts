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

    const deliveredCount = batchParcels.filter((p) => p.status === "Delivered").length;
    const returnedCount = batchParcels.filter((p) => p.status === "Returned").length;
    const pendingCount = batchParcels.filter((p) => p.status === "Pending").length;
    const totalCOD = batchParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    const result = {
      batch: {
        ...batch,
        totalPackages: batchParcels.length,
        totalCOD,
        deliveredCount,
        returnedCount,
        pendingCount,
      },
      parcels: batchParcels,
    };

    objectCache.set(`batch:detail:${batch._id}`, result, 5 * 60 * 1000, ["batches"]);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

