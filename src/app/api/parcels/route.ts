import { NextResponse } from "next/server";
import {
  getParcels,
  updateParcel,
  bulkUpdateParcels,
  deleteParcel,
  addAuditLog,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { checkEditOrDeletePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search")?.toLowerCase().trim();
    const settlementStatus = searchParams.get("settlementStatus");

    let parcels = await getParcels();

    if (courierId && courierId !== "all") {
      parcels = parcels.filter((p) => p.courierId === courierId);
    }

    if (status && status !== "all") {
      parcels = parcels.filter((p) => p.status === status);
    }

    if (settlementStatus && settlementStatus !== "all") {
      parcels = parcels.filter((p) => p.settlementStatus === settlementStatus);
    }

    if (fromDate) {
      parcels = parcels.filter((p) => {
        const pDate = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return pDate >= fromDate;
      });
    }

    if (toDate) {
      parcels = parcels.filter((p) => {
        const pDate = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return pDate <= toDate;
      });
    }

    if (search) {
      parcels = parcels.filter(
        (p) =>
          p.customerName.toLowerCase().includes(search) ||
          p.mobile.includes(search) ||
          (p.trackingId && p.trackingId.toLowerCase().includes(search)) ||
          (p.sku && p.sku.toLowerCase().includes(search)) ||
          (p.batchNumber && p.batchNumber.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ parcels, total: parcels.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const body = await request.json();

    // Check if bulk update
    if (Array.isArray(body.parcelIds) && body.parcelIds.length > 0) {
      const { parcelIds, updates } = body;
      const count = await bulkUpdateParcels(parcelIds, updates);

      await addAuditLog({
        userId: currentUser?._id,
        userName: currentUser?.name || "Staff",
        action: "BULK_UPDATE_PARCELS",
        entityType: "Parcel",
        entityId: `${count} parcels`,
        newValue: updates,
      });

      return NextResponse.json({ success: true, count });
    }

    // Single parcel update
    if (body._id) {
      const updated = await updateParcel(body._id, body);
      if (!updated) {
        return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
      }

      await addAuditLog({
        userId: currentUser?._id,
        userName: currentUser?.name || "Staff",
        action: "UPDATE_PARCEL",
        entityType: "Parcel",
        entityId: body._id,
        newValue: body,
      });

      return NextResponse.json({ success: true, parcel: updated });
    }

    return NextResponse.json({ error: "Missing parcel id or parcelIds" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parcel id is required" }, { status: 400 });
    }

    await deleteParcel(id);

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Staff",
      action: "DELETE_PARCEL",
      entityType: "Parcel",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

