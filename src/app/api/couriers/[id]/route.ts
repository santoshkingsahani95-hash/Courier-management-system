import { NextResponse } from "next/server";
import {
  getCourierById,
  saveCourier,
  deleteCourier,
  getParcels,
  getBatches,
  getSettlements,
  getPayments,
  getCourierLedger,
  getCourierBalance,
  addAuditLog,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { checkEditOrDeletePermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const courier = await getCourierById(params.id);
    if (!courier) {
      return NextResponse.json({ error: "Courier not found" }, { status: 404 });
    }

    const parcels = await getParcels();
    const courierParcels = parcels.filter((p) => p.courierId === courier._id);

    const batches = await getBatches();
    const courierBatches = batches.filter((b) => b.courierId === courier._id);

    const settlements = await getSettlements();
    const courierSettlements = settlements.filter((s) => s.courierId === courier._id);

    const payments = await getPayments();
    const courierPayments = payments.filter((p) => p.courierId === courier._id);

    const ledger = await getCourierLedger(courier._id);
    const balance = await getCourierBalance(courier._id);

    // Calculate financials
    const deliveredParcels = courierParcels.filter((p) => p.status === "Delivered");
    const returnedParcels = courierParcels.filter((p) => p.status === "Returned");
    const pendingParcels = courierParcels.filter((p) => p.status === "Pending");

    const grossCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
    const totalDeliveryCharges = deliveredParcels.reduce(
      (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
      0
    );
    const totalReturnCharges = 0;
    const totalReceived = courierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      courier,
      summary: {
        totalPackages: courierParcels.length,
        delivered: deliveredParcels.length,
        returned: returnedParcels.length,
        pending: pendingParcels.length,
        grossCOD,
        deliveryCharges: totalDeliveryCharges,
        returnCharges: totalReturnCharges,
        totalReceived,
        outstandingDue: balance,
      },
      parcels: courierParcels,
      batches: courierBatches,
      settlements: courierSettlements,
      payments: courierPayments,
      ledger,
    });
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
    const existing = await getCourierById(params.id);

    if (!existing) {
      return NextResponse.json({ error: "Courier not found" }, { status: 404 });
    }

    const updated = await saveCourier({
      _id: params.id,
      ...body,
    });

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "System",
      action: "UPDATE_COURIER",
      entityType: "Courier",
      entityId: params.id,
      oldValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, courier: updated });
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

    const result = await deleteCourier(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "System",
      action: "DELETE_COURIER",
      entityType: "Courier",
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: "Courier deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

