import { NextResponse } from "next/server";
import { getSettlements, createSettlement, addAuditLog, getCourierById } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");
    const paymentStatus = searchParams.get("paymentStatus");

    let settlements = await getSettlements();

    if (courierId && courierId !== "all") {
      settlements = settlements.filter((s) => s.courierId === courierId);
    }

    if (paymentStatus && paymentStatus !== "all") {
      settlements = settlements.filter((s) => s.paymentStatus === paymentStatus);
    }

    return NextResponse.json({ settlements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const {
      courierId,
      fromDate,
      toDate,
      adjustments,
      adjustmentNotes,
      initialPayment,
      initialPaymentMethod,
      initialPaymentRef,
      notes,
    } = body;

    if (!courierId) {
      return NextResponse.json({ error: "Courier is required" }, { status: 400 });
    }

    const courier = await getCourierById(courierId);
    if (!courier) {
      return NextResponse.json({ error: "Courier not found" }, { status: 404 });
    }

    const settlement = await createSettlement({
      courierId,
      courierName: courier.name,
      fromDate: fromDate || new Date().toISOString().split("T")[0],
      toDate: toDate || new Date().toISOString().split("T")[0],
      adjustments: Number(adjustments) || 0,
      adjustmentNotes,
      initialPayment: Number(initialPayment) || 0,
      initialPaymentMethod,
      initialPaymentRef,
      notes,
      createdBy: currentUser?.name || "Admin",
    });

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Admin",
      action: "FINALIZE_SETTLEMENT",
      entityType: "Settlement",
      entityId: settlement._id,
      newValue: {
        settlementNumber: settlement.settlementNumber,
        courierName: courier.name,
        grossCOD: settlement.grossCOD,
        totalReceivable: settlement.totalReceivable,
        remainingDue: settlement.remainingDue,
        totalPaid: settlement.totalPaid,
      },
    });

    return NextResponse.json({ success: true, settlement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

