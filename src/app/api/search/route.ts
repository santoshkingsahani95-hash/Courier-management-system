import { NextResponse } from "next/server";
import { getParcels, getBatches, getSettlements, getPayments } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: { parcels: [], batches: [], settlements: [], customerProfiles: [] },
      });
    }

    const parcels = await getParcels();
    const batches = await getBatches();
    const settlements = await getSettlements();
    const payments = await getPayments();

    // 1. Mobile-Number-Based Tracking & Filtering
    // Pre-calculate count of orders per mobile number to allow multi-order tracking
    const orderCountByMobile = new Map<string, number>();
    for (const p of parcels) {
      if (p.mobile) {
        orderCountByMobile.set(p.mobile, (orderCountByMobile.get(p.mobile) || 0) + 1);
      }
    }

    // Filter parcels with mobile prioritization
    const matchingParcels = parcels.filter((p) => {
      const matchMobile = p.mobile && p.mobile.includes(query);
      const matchCustomer = p.customerName && p.customerName.toLowerCase().includes(query);
      const matchBatch = p.batchNumber && p.batchNumber.toLowerCase().includes(query);
      const matchSku = p.sku && p.sku.toLowerCase().includes(query);
      const matchLegacyTracking = p.trackingId && p.trackingId.toLowerCase().includes(query);
      return matchMobile || matchCustomer || matchBatch || matchSku || matchLegacyTracking;
    });

    // Sort: Exact mobile match first, partial mobile match second, then newest date
    matchingParcels.sort((a, b) => {
      const aExactMob = a.mobile === query ? 1 : a.mobile.startsWith(query) ? 2 : 3;
      const bExactMob = b.mobile === query ? 1 : b.mobile.startsWith(query) ? 2 : 3;
      if (aExactMob !== bExactMob) return aExactMob - bExactMob;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // 2. Search in batches
    const matchingBatches = batches.filter(
      (b) =>
        b.batchNumber.toLowerCase().includes(query) ||
        (b.courierName && b.courierName.toLowerCase().includes(query)) ||
        (b.notes && b.notes.toLowerCase().includes(query))
    );

    // 3. Search in settlements
    const matchingSettlements = settlements.filter(
      (s) =>
        s.settlementNumber.toLowerCase().includes(query) ||
        (s.courierName && s.courierName.toLowerCase().includes(query))
    );

    // 4. Enrich parcels with mobile tracking data and settlement history
    const enrichedParcels = matchingParcels.slice(0, 50).map((p) => {
      const settlement = settlements.find(
        (s) => s._id === p.settlementId || (s.parcelIds && s.parcelIds.includes(p._id))
      );
      const courierPayments = payments.filter((pay) => pay.courierId === p.courierId);

      return {
        ...p,
        totalOrdersForMobile: orderCountByMobile.get(p.mobile) || 1,
        settlement: settlement
          ? {
            settlementNumber: settlement.settlementNumber,
            paymentStatus: settlement.paymentStatus,
            totalReceivable: settlement.totalReceivable,
            remainingDue: settlement.remainingDue,
          }
          : null,
        recentCourierPayment: courierPayments[0] || null,
      };
    });

    return NextResponse.json({
      query,
      results: {
        parcels: enrichedParcels,
        batches: matchingBatches.slice(0, 20),
        settlements: matchingSettlements.slice(0, 20),
      },
      totalMatches: matchingParcels.length + matchingBatches.length + matchingSettlements.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
