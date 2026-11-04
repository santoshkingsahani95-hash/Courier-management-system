import { NextResponse } from "next/server";
import {
  getParcels,
  getCouriers,
  getPayments,
  getSettlements,
  getCourierBalance,
} from "@/lib/store";
import { objectCache } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Fast Path 1: Check Pre-warmed crawled presets
    if (!courierId || courierId === "all") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yesterdayStr = y.toISOString().split("T")[0];

      const p7 = new Date(now);
      p7.setDate(p7.getDate() - 6);
      const last7DaysStr = p7.toISOString().split("T")[0];

      const mFirst = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthStr = mFirst.toISOString().split("T")[0];

      let presetKey: string | null = null;
      if (!fromDate && !toDate) {
        presetKey = "dashboard:preset:all";
      } else if (fromDate === todayStr && toDate === todayStr) {
        presetKey = "dashboard:preset:today";
      } else if (fromDate === yesterdayStr && toDate === yesterdayStr) {
        presetKey = "dashboard:preset:yesterday";
      } else if (fromDate === last7DaysStr && toDate === todayStr) {
        presetKey = "dashboard:preset:last7days";
      } else if (fromDate === thisMonthStr && toDate === todayStr) {
        presetKey = "dashboard:preset:thismonth";
      }

      if (presetKey) {
        const cached = objectCache.get<any>(presetKey);
        if (cached) {
          return NextResponse.json({ ...cached, _fromCache: true, _presetKey: presetKey });
        }
      }
    }

    // Fast Path 2: Check custom query cache
    const queryCacheKey = `dashboard:query:${courierId || "all"}:${fromDate || "start"}:${toDate || "end"}`;
    const cachedQuery = objectCache.get<any>(queryCacheKey);
    if (cachedQuery) {
      return NextResponse.json({ ...cachedQuery, _fromCache: true });
    }

    let parcels = await getParcels();
    let payments = await getPayments();
    let settlements = await getSettlements();
    const couriers = await getCouriers();

    // Apply courier filter if specified
    if (courierId && courierId !== "all") {
      parcels = parcels.filter((p) => p.courierId === courierId);
      payments = payments.filter((pay) => pay.courierId === courierId);
      settlements = settlements.filter((s) => s.courierId === courierId);
    }

    // Apply date range filter
    if (fromDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
      payments = payments.filter((pay) => {
        const d = (pay.paymentDate || pay.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
      settlements = settlements.filter((s) => {
        const d = (s.toDate || s.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
    }

    if (toDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d <= toDate;
      });
      payments = payments.filter((pay) => {
        const d = (pay.paymentDate || pay.createdAt || "").split("T")[0];
        return d <= toDate;
      });
      settlements = settlements.filter((s) => {
        const d = (s.toDate || s.createdAt || "").split("T")[0];
        return d <= toDate;
      });
    }

    // Summary calculations
    const totalPackages = parcels.length;
    const totalCOD = parcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    const deliveredParcels = parcels.filter((p) => p.status === "Delivered");
    const returnedParcels = parcels.filter((p) => p.status === "Returned");
    const pendingParcels = parcels.filter((p) => p.status === "Pending");
    const cancelledParcels = parcels.filter((p) => p.status === "Cancelled");

    const deliveredCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    const totalDeliveryCharges = deliveredParcels.reduce(
      (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
      0
    );

    const totalReturnCharges = 0;
    const totalCharges = totalDeliveryCharges;
    const netReceivable = deliveredCOD - totalCharges;

    const amountReceived = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    // Outstanding due calculation across active couriers
    let outstandingDue = 0;
    const courierSummaries = await Promise.all(
      couriers.map(async (c) => {
        const cParcels = parcels.filter((p) => p.courierId === c._id);
        const cDelivered = cParcels.filter((p) => p.status === "Delivered");
        const cReturned = cParcels.filter((p) => p.status === "Returned");
        const cPending = cParcels.filter((p) => p.status === "Pending");

        const cCOD = cParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
        const cDeliveredCOD = cDelivered.reduce((sum, p) => sum + (p.codAmount || 0), 0);

        const cDelCharges = cDelivered.reduce(
          (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
          0
        );
        const cRetCharges = 0;
        const cTotalCharges = cDelCharges;

        const cPayments = payments.filter((pay) => pay.courierId === c._id);
        const cReceived = cPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

        // Overall real-time balance for this courier
        const cBalance = await getCourierBalance(c._id);
        outstandingDue += cBalance;

        return {
          id: c._id,
          name: c.name,
          serviceArea: c.serviceArea,
          status: c.status,
          parcelsCount: cParcels.length,
          deliveredCount: cDelivered.length,
          returnedCount: cReturned.length,
          pendingCount: cPending.length,
          totalCOD: cCOD,
          deliveredCOD: cDeliveredCOD,
          charges: cTotalCharges,
          deliveryCharges: cDelCharges,
          returnCharges: cRetCharges,
          received: cReceived,
          due: cBalance,
        };
      })
    );

    const responseData = {
      summary: {
        totalPackages,
        totalCOD,
        deliveredPackages: deliveredParcels.length,
        returnedPackages: returnedParcels.length,
        pendingPackages: pendingParcels.length,
        cancelledPackages: cancelledParcels.length,
        deliveredCOD,
        totalDeliveryCharges,
        totalReturnCharges,
        totalCharges,
        netReceivable,
        amountReceived,
        outstandingDue,
      },
      courierSummary: courierSummaries,
      recentParcels: parcels.slice(0, 10),
      recentSettlements: settlements.slice(0, 5),
    };

    objectCache.set(queryCacheKey, responseData, 60000, ["dashboard"]);
    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

