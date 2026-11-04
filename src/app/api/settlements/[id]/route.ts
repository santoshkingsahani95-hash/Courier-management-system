import { NextResponse } from "next/server";
import {
  getSettlementById,
  getCourierById,
  getCompanySettings,
  getParcels,
  getPayments,
} from "@/lib/store";

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


