import { NextResponse } from "next/server";
import {
  getSettlementById,
  getCourierById,
  getCompanySettings,
  getParcels,
  getPayments,
  deleteSettlement,
  addAuditLog,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { checkEditOrDeletePermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const settlement = await getSettlementById(params.id);
    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    const [courier, settings, parcels, payments] = await Promise.all([
      getCourierById(settlement.courierId),
      getCompanySettings(),
      getParcels(),
      getPayments(),
    ]);

    const settlementParcelIds = new Set(settlement.parcelIds || []);
    const settlementParcels = parcels.filter(
      (p) => p.settlementId === settlement._id || settlementParcelIds.has(p._id)
    );

    const settlementPayments = payments.filter(
      (p) => p.settlementId === settlement._id || p.settlementNumber === settlement.settlementNumber
    );

    return NextResponse.json({
      settlement,
      courier,
      settings,
      parcels: settlementParcels,
      payments: settlementPayments,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete / Cancel Settlement - Authorized for Admin and Manager only
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

    const result = await deleteSettlement(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed to delete settlement" }, { status: 400 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Manager",
      action: "DELETE_SETTLEMENT",
      entityType: "Settlement",
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: "Settlement cancelled and parcels reverted to unsettled" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


