import { NextResponse } from "next/server";
import { getCouriers, saveCourier, deleteCourier, getCourierBalance, addAuditLog, getParcels } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const couriers = await getCouriers();
    const parcels = await getParcels();

    // Attach dynamic financials and package counts to each courier
    const results = await Promise.all(
      couriers.map(async (c) => {
        const balance = await getCourierBalance(c._id);
        const courierParcels = parcels.filter((p) => p.courierId === c._id);
        const deliveredCount = courierParcels.filter((p) => p.status === "Delivered").length;
        const returnedCount = courierParcels.filter((p) => p.status === "Returned").length;
        const pendingCount = courierParcels.filter((p) => p.status === "Pending").length;
        const totalCOD = courierParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

        return {
          ...c,
          currentDue: balance,
          totalParcels: courierParcels.length,
          deliveredCount,
          returnedCount,
          pendingCount,
          totalCOD,
        };
      })
    );

    return NextResponse.json(
      { couriers: results },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Courier name is required" }, { status: 400 });
    }

    const saved = await saveCourier({
      name: body.name.trim(),
      serviceArea: body.serviceArea || "Inside Valley",
      contactPerson: body.contactPerson || "",
      phone: body.phone || "",
      defaultDeliveryCharge: Number(body.defaultDeliveryCharge) || 0,
      defaultReturnCharge: Number(body.defaultReturnCharge) || 0,
      status: body.status || "active",
      notes: body.notes || "",
    });

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "System",
      action: "CREATE_COURIER",
      entityType: "Courier",
      entityId: saved._id,
      newValue: saved,
    });

    return NextResponse.json({ success: true, courier: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

