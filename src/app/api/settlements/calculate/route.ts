import { NextResponse } from "next/server";
import { getParcels, getCourierLedger, getSettlements, getCourierById } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courierId, fromDate, toDate, adjustments = 0 } = body;

    if (!courierId) {
      return NextResponse.json({ error: "Courier is required" }, { status: 400 });
    }

    const courier = await getCourierById(courierId);
    if (!courier) {
      return NextResponse.json({ error: "Courier not found" }, { status: 404 });
    }

    const allParcels = await getParcels();

    // Find unsettled parcels for this courier
    const eligibleParcels = allParcels.filter((p) => {
      if (p.courierId !== courierId) return false;
      if (p.settlementStatus === "Settled") return false;
      if (p.status === "Cancelled") return false;

      // Check date bounds if provided
      const dateToCheck = (p.deliveryDate || p.createdAt || "").split("T")[0];
      if (fromDate && dateToCheck < fromDate) return false;
      if (toDate && dateToCheck > toDate) return false;

      return true;
    });

    const deliveredParcels = eligibleParcels.filter((p) => p.status === "Delivered");
    const returnedParcels = eligibleParcels.filter((p) => p.status === "Returned");
    const pendingParcels = eligibleParcels.filter((p) => p.status === "Pending");

    const grossCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
    const deliveryCharges = deliveredParcels.reduce(
      (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
      0
    );
    // No charge for returns
    const returnCharges = 0;

    const adj = Number(adjustments) || 0;
    const currentNetReceivable = grossCOD - deliveryCharges + adj;

    // Previous Due from latest settlement or ledger
    const settlements = await getSettlements();
    const courierSettlements = settlements
      .filter((s) => s.courierId === courierId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let previousDue = 0;
    if (courierSettlements.length > 0) {
      previousDue = courierSettlements[0].remainingDue;
    } else {
      const ledger = await getCourierLedger(courierId);
      if (ledger.length > 0) {
        previousDue = ledger[ledger.length - 1].runningBalance;
      }
    }

    const totalReceivable = currentNetReceivable + previousDue;

    return NextResponse.json({
      courier,
      eligibleParcelsCount: eligibleParcels.length,
      deliveredCount: deliveredParcels.length,
      returnedCount: returnedParcels.length,
      pendingCount: pendingParcels.length,
      grossCOD,
      deliveryCharges,
      returnCharges: 0,
      totalCharges: deliveryCharges,
      adjustments: adj,
      currentNetReceivable,
      previousDue,
      totalReceivable,
      parcels: eligibleParcels,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

