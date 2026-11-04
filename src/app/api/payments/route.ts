import { NextResponse } from "next/server";
import {
  getPayments,
  savePayment,
  addAuditLog,
  getCourierById,
  getCouriers,
  getCourierBalance,
  getSettlements,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

// In-memory idempotency cache to prevent duplicate payment submissions
const recentSubmissions = new Map<string, number>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");
    const settlementId = searchParams.get("settlementId");

    const [allPayments, couriers, settlements] = await Promise.all([
      getPayments(),
      getCouriers(),
      getSettlements(),
    ]);

    let payments = allPayments;

    if (courierId && courierId !== "all") {
      payments = payments.filter((p) => p.courierId === courierId);
    }

    if (settlementId) {
      payments = payments.filter((p) => p.settlementId === settlementId);
    }

    // Courier balances & dues
    const courierBalances: { [key: string]: number } = {};
    let totalOutstandingDue = 0;

    await Promise.all(
      couriers.map(async (c) => {
        const bal = await getCourierBalance(c._id);
        courierBalances[c._id] = bal;
        if (bal > 0) {
          totalOutstandingDue += bal;
        }
      })
    );

    const todayStr = new Date().toISOString().split("T")[0];
    const todayPayments = allPayments.filter(
      (p) => (p.paymentDate || p.createdAt || "").split("T")[0] === todayStr
    );
    const todayReceived = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmountReceived = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      payments,
      courierBalances,
      couriers,
      settlements,
      summary: {
        totalAmountReceived,
        todayReceived,
        totalOutstandingDue,
        totalCount: allPayments.length,
      },
    });
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
      settlementId,
      settlementNumber,
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      remarks,
    } = body;

    if (!courierId) {
      return NextResponse.json({ error: "Courier selection is mandatory" }, { status: 400 });
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method is mandatory" }, { status: 400 });
    }

    // Idempotency & duplicate submission guard (4 second window)
    const idempotencyKey = `${courierId}-${Number(amount)}-${(referenceNumber || "").trim()}-${(paymentDate || "").trim()}`;
    const lastSub = recentSubmissions.get(idempotencyKey);
    const nowMs = Date.now();
    if (lastSub && nowMs - lastSub < 4000) {
      return NextResponse.json(
        { error: "Duplicate payment submission detected. Please wait a moment." },
        { status: 429 }
      );
    }
    recentSubmissions.set(idempotencyKey, nowMs);

    // Clean up older idempotency records
    if (recentSubmissions.size > 200) {
      for (const [k, v] of recentSubmissions.entries()) {
        if (nowMs - v > 60000) recentSubmissions.delete(k);
      }
    }

    const courier = await getCourierById(courierId);
    const courierName = courier ? courier.name : "Courier";

    // Track previous outstanding balance before recording payment
    const previousOutstanding = await getCourierBalance(courierId);

    const payment = await savePayment({
      courierId,
      courierName,
      settlementId: settlementId || "",
      settlementNumber: settlementNumber || "",
      amount: Number(amount),
      paymentMethod: paymentMethod || "Bank Transfer",
      paymentDate: paymentDate || new Date().toISOString().split("T")[0],
      referenceNumber: referenceNumber || "",
      remarks: remarks || "",
      recordedBy: currentUser?.name || "Admin",
    });

    // Compute updated remaining outstanding balance directly from database
    const remainingOutstanding = await getCourierBalance(courierId);

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Admin",
      action: "RECORD_PAYMENT",
      entityType: "Payment",
      entityId: payment._id,
      newValue: {
        payment,
        previousOutstanding,
        remainingOutstanding,
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      previousOutstanding,
      paymentAmount: payment.amount,
      remainingOutstanding,
      allocatedSettlements: payment.allocations || [],
      unallocatedAmount: payment.unallocatedAmount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

