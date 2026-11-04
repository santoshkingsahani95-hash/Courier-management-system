import { NextResponse } from "next/server";
import { getParcels, getCouriers, getSettlements, getPayments, getCourierBalance } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "daily"; // "daily" | "courier" | "settlement" | "returns" | "customer"
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const courierId = searchParams.get("courierId");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let parcels = await getParcels();
    const couriers = await getCouriers();
    let settlements = await getSettlements();
    let payments = await getPayments();

    // Filters
    if (courierId && courierId !== "all") {
      parcels = parcels.filter((p) => p.courierId === courierId);
      settlements = settlements.filter((s) => s.courierId === courierId);
      payments = payments.filter((p) => p.courierId === courierId);
    }

    if (fromDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
      settlements = settlements.filter((s) => s.toDate >= fromDate);
    }

    if (toDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d <= toDate;
      });
      settlements = settlements.filter((s) => s.fromDate <= toDate);
    }

    if (reportType === "daily") {
      // Group parcels by date
      const dateMap = new Map<string, any>();

      for (const p of parcels) {
        const d = (p.createdAt || "").split("T")[0] || "Unknown";
        if (!dateMap.has(d)) {
          dateMap.set(d, {
            date: d,
            totalParcels: 0,
            delivered: 0,
            returned: 0,
            pending: 0,
            cancelled: 0,
            totalCOD: 0,
            deliveryCharges: 0,
            returnCharges: 0,
          });
        }
        const record = dateMap.get(d);
        record.totalParcels++;
        record.totalCOD += p.codAmount || 0;

        if (p.status === "Delivered") {
          record.delivered++;
          record.deliveryCharges += p.actualDeliveryCharge ?? p.deliveryCharge ?? 0;
        } else if (p.status === "Returned") {
          record.returned++;
          record.returnCharges = 0;
        } else if (p.status === "Pending") {
          record.pending++;
        } else if (p.status === "Cancelled") {
          record.cancelled++;
        }
      }

      const rows = Array.from(dateMap.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => ({
          ...r,
          totalCharges: r.deliveryCharges,
          netReceivable: r.totalCOD - r.deliveryCharges,
        }));

      return NextResponse.json({ reportType: "daily", data: rows });
    }

    if (reportType === "courier") {
      const courierStats = await Promise.all(
        couriers.map(async (c) => {
          const cParcels = parcels.filter((p) => p.courierId === c._id);
          const delivered = cParcels.filter((p) => p.status === "Delivered");
          const returned = cParcels.filter((p) => p.status === "Returned");
          const pending = cParcels.filter((p) => p.status === "Pending");

          const cod = cParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
          const delCharges = delivered.reduce(
            (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
            0
          );
          const retCharges = 0;
          const due = await getCourierBalance(c._id);
          const deliveryRate =
            cParcels.length > 0 ? ((delivered.length / cParcels.length) * 100).toFixed(1) : "0.0";
          const returnRate =
            cParcels.length > 0 ? ((returned.length / cParcels.length) * 100).toFixed(1) : "0.0";

          return {
            courierId: c._id,
            name: c.name,
            serviceArea: c.serviceArea,
            totalParcels: cParcels.length,
            deliveredCount: delivered.length,
            returnedCount: returned.length,
            pendingCount: pending.length,
            deliveryRate: `${deliveryRate}%`,
            returnRate: `${returnRate}%`,
            totalCOD: cod,
            deliveryCharges: delCharges,
            returnCharges: 0,
            totalCharges: delCharges,
            netReceivable: cod - delCharges,
            outstandingDue: due,
          };
        })
      );

      return NextResponse.json({ reportType: "courier", data: courierStats });
    }

    if (reportType === "settlement") {
      const totalReceivable = settlements.reduce((sum, s) => sum + (s.totalReceivable || 0), 0);
      const totalReceived = settlements.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
      const totalOutstanding = settlements.reduce((sum, s) => sum + (s.remainingDue || 0), 0);
      const totalPreviousDue = settlements.reduce((sum, s) => sum + (s.previousDue || 0), 0);
      const totalCurrentNet = settlements.reduce((sum, s) => sum + (s.currentNetReceivable || 0), 0);

      return NextResponse.json({
        reportType: "settlement",
        summary: {
          totalReceivable,
          totalReceived,
          totalOutstanding,
          totalPreviousDue,
          totalCurrentNet,
        },
        data: settlements,
      });
    }

    if (reportType === "returns") {
      const returnParcels = parcels.filter((p) => p.status === "Returned");
      const totalReturnCharges = 0;
      const totalLostCOD = returnParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

      return NextResponse.json({
        reportType: "returns",
        summary: {
          count: returnParcels.length,
          totalReturnCharges,
          totalLostCOD,
        },
        data: returnParcels,
      });
    }

    if (reportType === "customer") {
      let filtered = parcels;
      if (search) {
        filtered = parcels.filter(
          (p) =>
            p.customerName.toLowerCase().includes(search) ||
            p.mobile.includes(search) ||
            (p.trackingId && p.trackingId.toLowerCase().includes(search))
        );
      }
      return NextResponse.json({ reportType: "customer", data: filtered });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

