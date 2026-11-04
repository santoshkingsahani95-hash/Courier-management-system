import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isValidNepaliMobile } from "@/lib/utils";
import { bulkSaveParcels, saveBatch, getCourierById } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get("action"); // "preview" | "commit"

    if (action === "commit") {
      const currentUser = await getCurrentUser();
      const courierId = formData.get("courierId") as string;
      const batchDate = (formData.get("batchDate") as string) || new Date().toISOString().split("T")[0];
      const batchNumber = formData.get("batchNumber") as string;
      const parcelsJson = formData.get("parcels") as string;

      if (!courierId) {
        return NextResponse.json({ error: "Courier is required" }, { status: 400 });
      }

      const courier = await getCourierById(courierId);
      const parsedParcels = JSON.parse(parcelsJson || "[]");

      if (parsedParcels.length === 0) {
        return NextResponse.json({ error: "No parcels to import" }, { status: 400 });
      }

      const totalCOD = parsedParcels.reduce((sum: number, p: any) => sum + (Number(p.codAmount) || 0), 0);

      const batch = await saveBatch({
        batchNumber: batchNumber || `BAT-${Date.now()}`,
        courierId,
        courierName: courier?.name || "Courier",
        batchDate,
        totalPackages: parsedParcels.length,
        totalCOD,
        notes: "Imported via Excel spreadsheet",
        createdBy: currentUser?.name || "Staff",
      });

      const preparedParcels = parsedParcels.map((p: any, idx: number) => ({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        courierId,
        courierName: courier?.name || "Courier",
        customerName: p.customerName,
        mobile: p.mobile,
        trackingId: p.trackingId || `${batch.batchNumber}-${idx + 1}`,
        sku: p.sku || "",
        codAmount: Number(p.codAmount) || 0,
        serviceArea: courier?.serviceArea || "Inside Valley",
        deliveryCharge: courier?.defaultDeliveryCharge || 0,
        returnCharge: courier?.defaultReturnCharge || 0,
        status: "Pending",
        remarks: p.remarks || "Imported",
        createdBy: currentUser?.name || "Staff",
      }));

      const saved = await bulkSaveParcels(preparedParcels);

      return NextResponse.json({
        success: true,
        batch,
        importedCount: saved.length,
      });
    }

    // Default action: preview
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No Excel file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawRows.length < 2) {
      return NextResponse.json({ error: "Uploaded file contains no data rows" }, { status: 400 });
    }

    // Inspect headers
    const headerRow = rawRows[0].map((h: any) => String(h).trim().toLowerCase());

    const nameIdx = headerRow.findIndex((h: string) => h.includes("name") || h.includes("customer"));
    const mobileIdx = headerRow.findIndex((h: string) => h.includes("mobile") || h.includes("phone"));
    const codIdx = headerRow.findIndex((h: string) => h.includes("cod") || h.includes("amount"));
    const trackingIdx = headerRow.findIndex((h: string) => h.includes("track") || h.includes("id"));
    const skuIdx = headerRow.findIndex((h: string) => h.includes("sku") || h.includes("item"));
    const remarksIdx = headerRow.findIndex((h: string) => h.includes("remark") || h.includes("note"));

    const validatedRows = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || c === "")) {
        continue;
      }

      const customerName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
      const mobile = mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : "";
      const rawCod = codIdx !== -1 ? row[codIdx] : 0;
      const codAmount = Number(rawCod);
      const trackingId = trackingIdx !== -1 && row[trackingIdx] ? String(row[trackingIdx]).trim() : "";
      const sku = skuIdx !== -1 && row[skuIdx] ? String(row[skuIdx]).trim() : "";
      const remarks = remarksIdx !== -1 && row[remarksIdx] ? String(row[remarksIdx]).trim() : "";

      const errors: string[] = [];

      if (!customerName) {
        errors.push("Missing Customer Name");
      }

      if (!mobile) {
        errors.push("Missing Mobile Number");
      } else if (!isValidNepaliMobile(mobile)) {
        errors.push("Invalid Nepal Mobile (expected 10 digits starting 98/97/96)");
      }

      if (isNaN(codAmount) || codAmount < 0) {
        errors.push("Invalid COD amount (must be non-negative number)");
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else invalidCount++;

      validatedRows.push({
        rowNumber: i + 1,
        customerName,
        mobile,
        codAmount: isNaN(codAmount) ? 0 : codAmount,
        trackingId,
        sku,
        remarks,
        isValid,
        errors,
      });
    }

    return NextResponse.json({
      success: true,
      totalRows: validatedRows.length,
      validCount,
      invalidCount,
      rows: validatedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

