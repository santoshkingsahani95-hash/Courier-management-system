import { NextResponse } from "next/server";
import {
  getParcels,
  getCouriers,
  updateParcel,
  bulkUpdateParcels,
  saveParcel,
  addAuditLog,
  getCourierById,
  saveReturnRecord,
  getReturnRecords,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const allParcels = await getParcels();
    const couriers = await getCouriers();

    // 1. Filter returned parcels
    let returnedParcels = allParcels.filter((p) => p.status === "Returned");

    if (courierId && courierId !== "all") {
      returnedParcels = returnedParcels.filter((p) => p.courierId === courierId);
    }

    if (fromDate) {
      returnedParcels = returnedParcels.filter((p) => {
        const d = (p.returnDate || p.updatedAt || p.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
    }

    if (toDate) {
      returnedParcels = returnedParcels.filter((p) => {
        const d = (p.returnDate || p.updatedAt || p.createdAt || "").split("T")[0];
        return d <= toDate;
      });
    }

    if (search) {
      returnedParcels = returnedParcels.filter(
        (p) =>
          p.customerName.toLowerCase().includes(search) ||
          p.mobile.includes(search) ||
          (p.trackingId && p.trackingId.toLowerCase().includes(search)) ||
          (p.sku && p.sku.toLowerCase().includes(search)) ||
          (p.remarks && p.remarks.toLowerCase().includes(search))
      );
    }

    // Sort newest return first
    returnedParcels.sort((a, b) => {
      const dateA = a.returnDate || a.updatedAt || a.createdAt;
      const dateB = b.returnDate || b.updatedAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // 2. If a specific courier is selected, also provide pending/dispatched parcels for that courier
    let courierPendingParcels: any[] = [];
    if (courierId && courierId !== "all") {
      courierPendingParcels = allParcels
        .filter(
          (p) =>
            p.courierId === courierId &&
            p.status !== "Returned" &&
            p.status !== "Cancelled" &&
            p.settlementStatus !== "Settled"
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // 3. Summaries
    const todayStr = new Date().toISOString().split("T")[0];
    const todayReturns = returnedParcels.filter(
      (p) => (p.returnDate || "").split("T")[0] === todayStr
    );

    const totalReturnedCount = returnedParcels.length;
    const totalReturnedCOD = returnedParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
    const todayReturnsCount = todayReturns.length;
    const todayReturnedCOD = todayReturns.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    return NextResponse.json({
      returns: returnedParcels,
      pendingParcels: courierPendingParcels,
      summary: {
        totalReturnedCount,
        totalReturnedCOD,
        todayReturnsCount,
        todayReturnedCOD,
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
    const todayStr = new Date().toISOString().split("T")[0];

    const {
      courierId,
      parcelIds,
      returnReason = "Customer Refused",
      customReason = "",
      returnDate = todayStr,
      remarks,
      // For manual new entry
      customerName,
      mobile,
      trackingId,
      sku,
      codAmount,
    } = body;

    const finalReason =
      returnReason === "Other" && customReason.trim() ? customReason.trim() : returnReason;

    // CASE 1: Processing existing parcel(s)
    if (Array.isArray(parcelIds) && parcelIds.length > 0) {
      const allParcels = await getParcels();
      const parcelsToReturn = allParcels.filter((p) => parcelIds.includes(p._id));

      if (parcelsToReturn.length === 0) {
        return NextResponse.json({ error: "Selected parcels not found" }, { status: 404 });
      }

      // Check: Prevent duplicate return
      const eligibleToReturn = parcelsToReturn.filter((p) => p.status !== "Returned");
      if (eligibleToReturn.length === 0) {
        return NextResponse.json(
          { error: "Selected parcel(s) are already marked as Returned" },
          { status: 400 }
        );
      }

      for (const p of eligibleToReturn) {
        const retRecord = await saveReturnRecord({
          parcelId: p._id,
          batchId: p.batchId || "",
          batchNumber: p.batchNumber || "",
          courierId: p.courierId,
          courierName: p.courierName,
          customerName: p.customerName,
          mobile: p.mobile,
          trackingId: p.trackingId,
          sku: p.sku,
          codAmount: p.codAmount,
          returnDate: returnDate || todayStr,
          returnReason: finalReason,
          customReason: customReason || "",
          returnStatus: "Returned",
          recordedBy: currentUser?.name || "Staff",
        });

        await updateParcel(p._id, {
          status: "Returned" as const,
          returnDate: returnDate || todayStr,
          returnReason: finalReason,
          customReason: customReason || "",
          returnedBy: currentUser?.name || "Staff",
          returnRecordId: retRecord._id,
          remarks: remarks
            ? `${finalReason} - ${remarks}`
            : p.remarks
            ? `${p.remarks} [Return: ${finalReason}]`
            : finalReason,
          actualDeliveryCharge: 0,
          actualReturnCharge: 0,
        });
      }

      const adjustedCOD = eligibleToReturn.reduce((sum, p) => sum + (p.codAmount || 0), 0);

      await addAuditLog({
        userId: currentUser?._id,
        userName: currentUser?.name || "Staff",
        action: "PROCESS_RETURNS",
        entityType: "Parcel",
        entityId: `${eligibleToReturn.length} parcels`,
        newValue: {
          courierId,
          count: eligibleToReturn.length,
          adjustedCOD,
          returnReason: finalReason,
          returnDate,
        },
      });

      return NextResponse.json({
        success: true,
        count: eligibleToReturn.length,
        adjustedCOD,
        message: `Successfully received ${eligibleToReturn.length} returned package(s). Rs. ${adjustedCOD.toLocaleString()} COD automatically deducted from courier receivable.`,
      });
    }

    // CASE 2: Single quick lookup by tracking ID or Mobile
    if (body.lookupQuery && courierId) {
      const query = body.lookupQuery.trim().toLowerCase();
      const allParcels = await getParcels();

      const matched = allParcels.find(
        (p) =>
          (p.courierId === courierId || courierId === "all") &&
          p.status !== "Returned" &&
          (p.mobile === query ||
            (p.trackingId && p.trackingId.toLowerCase() === query) ||
            (p.sku && p.sku.toLowerCase() === query))
      );

      if (!matched) {
        return NextResponse.json(
          { error: `No dispatched parcel found matching '${body.lookupQuery}' for this courier.` },
          { status: 404 }
        );
      }

      const retRecord = await saveReturnRecord({
        parcelId: matched._id,
        batchId: matched.batchId || "",
        batchNumber: matched.batchNumber || "",
        courierId: matched.courierId,
        courierName: matched.courierName,
        customerName: matched.customerName,
        mobile: matched.mobile,
        trackingId: matched.trackingId,
        sku: matched.sku,
        codAmount: matched.codAmount,
        returnDate: returnDate || todayStr,
        returnReason: finalReason,
        customReason: customReason || "",
        returnStatus: "Returned",
        recordedBy: currentUser?.name || "Staff",
      });

      const updates = {
        status: "Returned" as const,
        returnDate: returnDate || todayStr,
        returnReason: finalReason,
        customReason: customReason || "",
        returnedBy: currentUser?.name || "Staff",
        returnRecordId: retRecord._id,
        remarks: remarks
          ? `${finalReason} - ${remarks}`
          : matched.remarks
          ? `${matched.remarks} [Return: ${finalReason}]`
          : finalReason,
        actualDeliveryCharge: 0,
        actualReturnCharge: 0,
      };

      await updateParcel(matched._id, updates);

      await addAuditLog({
        userId: currentUser?._id,
        userName: currentUser?.name || "Staff",
        action: "PROCESS_RETURN_SINGLE",
        entityType: "Parcel",
        entityId: matched._id,
        newValue: { trackingId: matched.trackingId, codAmount: matched.codAmount, returnReason: finalReason },
      });

      return NextResponse.json({
        success: true,
        count: 1,
        adjustedCOD: matched.codAmount,
        parcel: { ...matched, ...updates },
        message: `Package ${matched.trackingId || matched.mobile} (${matched.customerName}) marked as Returned. Rs. ${matched.codAmount.toLocaleString()} adjusted.`,
      });
    }

    // CASE 3: Multiple / Bulk Manual Return Entries
    if (Array.isArray(body.entries) && body.entries.length > 0) {
      const createdParcels = [];
      let totalAdjusted = 0;

      for (let i = 0; i < body.entries.length; i++) {
        const item = body.entries[i];
        if (!item.customerName?.trim()) continue;
        const cId = item.courierId || courierId;
        const courier = await getCourierById(cId);

        const newP = await saveParcel({
          courierId: cId,
          courierName: courier?.name || "Courier",
          customerName: item.customerName.trim(),
          mobile: item.mobile ? item.mobile.trim() : "",
          trackingId: item.trackingId ? item.trackingId.trim() : `RET-${Date.now()}-${i}`,
          sku: item.sku ? item.sku.trim() : "",
          codAmount: Number(item.codAmount) || 0,
          serviceArea: courier?.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley",
          deliveryCharge: 0,
          returnCharge: 0,
          status: "Returned",
          returnDate: item.returnDate || returnDate || todayStr,
          remarks: item.remarks
            ? `${item.returnReason || returnReason || "Customer Refused"} - ${item.remarks}`
            : item.returnReason || returnReason || "Customer Refused",
          createdBy: currentUser?.name || "Staff",
        });

        createdParcels.push(newP);
        totalAdjusted += newP.codAmount;
      }

      await addAuditLog({
        userId: currentUser?._id,
        userName: currentUser?.name || "Staff",
        action: "ADD_RETURN_ENTRIES",
        entityType: "Parcel",
        entityId: `${createdParcels.length} return entries`,
        newValue: { count: createdParcels.length, totalAdjusted, courierId },
      });

      return NextResponse.json({
        success: true,
        count: createdParcels.length,
        adjustedCOD: totalAdjusted,
        parcels: createdParcels,
        message: `Successfully added ${createdParcels.length} return entries. Rs. ${totalAdjusted.toLocaleString()} COD adjusted.`,
      });
    }

    // CASE 4: Single Manual Return Inward Entry
    if (courierId && customerName) {
      const courier = await getCourierById(courierId);
      const newParcel = await saveParcel({
        courierId,
        courierName: courier?.name || "Courier",
        customerName: customerName.trim(),
        mobile: mobile ? mobile.trim() : "",
        trackingId: trackingId ? trackingId.trim() : `RET-${Date.now()}`,
        sku: sku ? sku.trim() : "",
        codAmount: Number(codAmount) || 0,
        serviceArea:
          courier?.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley",
        deliveryCharge: 0,
        returnCharge: 0,
        status: "Returned",
        returnDate: returnDate || todayStr,
        remarks: remarks ? `${returnReason} - ${remarks}` : returnReason,
        createdBy: currentUser?.name || "Staff",
      });

      return NextResponse.json({
        success: true,
        count: 1,
        adjustedCOD: newParcel.codAmount,
        parcel: newParcel,
        message: `Manual return recorded for ${newParcel.customerName}. Rs. ${newParcel.codAmount.toLocaleString()} COD adjusted.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid return request payload. Provide parcelIds, lookupQuery, or parcel details." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Revert return status if marked by mistake
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { parcelId, newStatus = "Delivered" } = body;

    if (!parcelId) {
      return NextResponse.json({ error: "Parcel ID is required" }, { status: 400 });
    }

    const updates: any = {
      status: newStatus,
      returnDate: "",
      returnReason: "",
      customReason: "",
      returnedBy: "",
      remarks: `Reverted from Return to ${newStatus}`,
    };

    const updated = await updateParcel(parcelId, updates);

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Staff",
      action: "REVERT_RETURN",
      entityType: "Parcel",
      entityId: parcelId,
      newValue: { newStatus },
    });

    return NextResponse.json({
      success: true,
      parcel: updated,
      message: `Parcel status reverted to ${newStatus}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
