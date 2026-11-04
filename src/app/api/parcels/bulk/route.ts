import { NextResponse } from "next/server";
import { bulkSaveParcels, saveBatch, addAuditLog, getCourierById } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { courierId, batchDate, batchNumber, notes, parcels } = body;

    if (!courierId) {
      return NextResponse.json({ error: "Courier is required" }, { status: 400 });
    }

    if (!Array.isArray(parcels) || parcels.length === 0) {
      return NextResponse.json({ error: "At least one parcel is required" }, { status: 400 });
    }

    const courier = await getCourierById(courierId);
    const courierName = courier ? courier.name : "Courier";

    // 1. Calculate totals
    const totalPackages = parcels.length;
    const totalCOD = parcels.reduce((sum, p) => sum + (Number(p.codAmount) || 0), 0);

    // 2. Create the Batch
    const batch = await saveBatch({
      batchNumber: batchNumber || `BAT-${Date.now()}`,
      courierId,
      courierName,
      batchDate: batchDate || new Date().toISOString().split("T")[0],
      totalPackages,
      totalCOD,
      notes: notes || "",
      createdBy: currentUser?.name || "Staff",
    });

    // 3. Prepare parcels with batch reference
    const preparedParcels = parcels.map((p, idx) => ({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      courierId,
      courierName,
      customerName: p.customerName?.trim() || "Customer",
      mobile: p.mobile?.trim() || "",
      trackingId: p.trackingId?.trim() || `${batch.batchNumber}-${idx + 1}`,
      sku: p.sku?.trim() || "",
      codAmount: Number(p.codAmount) || 0,
      serviceArea: p.serviceArea || courier?.serviceArea || "Inside Valley",
      deliveryCharge:
        p.deliveryCharge !== undefined && p.deliveryCharge !== "" && !isNaN(Number(p.deliveryCharge))
          ? Number(p.deliveryCharge)
          : courier?.defaultDeliveryCharge ?? 0,
      returnCharge:
        p.returnCharge !== undefined && p.returnCharge !== "" && !isNaN(Number(p.returnCharge))
          ? Number(p.returnCharge)
          : courier?.defaultReturnCharge ?? 0,
      status: p.status || "Pending",
      remarks: p.remarks || "",
      createdBy: currentUser?.name || "Staff",
    }));

    // 4. Bulk insert
    const savedParcels = await bulkSaveParcels(preparedParcels);

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Staff",
      action: "BULK_PARCEL_ENTRY",
      entityType: "Batch",
      entityId: batch._id,
      newValue: {
        batchNumber: batch.batchNumber,
        totalPackages,
        totalCOD,
        courierName,
      },
    });

    return NextResponse.json({
      success: true,
      batch,
      count: savedParcels.length,
      parcels: savedParcels,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

