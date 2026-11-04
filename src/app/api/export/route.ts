import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  getParcels,
  getSettlements,
  getSettlementById,
  getLedgerEntries,
  getCouriers,
  getCourierById,
  getCompanySettings,
  getPayments,
  getBatchById,
} from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "parcels"; // "parcels" | "settlement-bill" | "settlement-parcels" | "settlements" | "ledger" | "batch"
    const courierId = searchParams.get("courierId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const id = searchParams.get("id");

    /* ==================== 1. VERTICAL SETTLEMENT BILL (EXCEL STATEMENT) ==================== */
    if (type === "settlement-bill") {
      let settlement = null;
      if (id) {
        settlement = await getSettlementById(id);
      } else {
        const all = await getSettlements();
        settlement = all[0] || null;
      }

      if (!settlement) {
        return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
      }

      const [courier, settings, payments] = await Promise.all([
        getCourierById(settlement.courierId),
        getCompanySettings(),
        getPayments(),
      ]);

      const settlementPayments = payments.filter(
        (p) =>
          p.settlementId === settlement!._id ||
          p.settlementNumber === settlement!.settlementNumber
      );

      const s = settlement;
      const worksheetData: any[][] = [
        [settings.companyName || "Courier Management System"],
        [settings.address || ""],
        [`Phone: ${settings.phone || ""}  |  Email: ${settings.email || ""}`],
        [settings.panVat ? `PAN/VAT Reg: ${settings.panVat}` : ""],
        [],
        ["COURIER SETTLEMENT STATEMENT"],
        [],
        ["Settlement No:", s.settlementNumber, "", "Settlement Date:", (s.createdAt || "").split("T")[0]],
        ["Courier Partner:", s.courierName || "", "", "Service Area:", courier?.serviceArea || "Inside Valley"],
        ["Settlement Period:", `${s.fromDate} to ${s.toDate}`, "", "Payment Status:", s.paymentStatus || "Unpaid"],
        [],
        ["PARCEL SUMMARY"],
        [
          "Delivered Parcels:",
          s.deliveredParcelsCount || 0,
          "Returned Parcels:",
          s.returnedParcelsCount || 0,
          "Total Processed:",
          (s.deliveredParcelsCount || 0) + (s.returnedParcelsCount || 0),
        ],
        [],
        ["SETTLEMENT FINANCIAL DETAILS"],
        ["Description", "Amount (Rs.)"],
        ["Gross COD Collection (Delivered Parcels)", s.grossCOD || 0],
        ["(-) Delivery Charges", -(s.deliveryCharges || 0)],
        ...(s.adjustments ? [["(+/-) Manual Adjustments", s.adjustments]] : []),
        ["Current Net Receivable", s.currentNetReceivable || 0],
        ["(+) Previous Outstanding Due (Brought Forward)", s.previousDue || 0],
        ["TOTAL RECEIVABLE FROM COURIER", s.totalReceivable || 0],
        ["(-) Payment Received / Deposited", -(s.totalPaid || 0)],
        ["REMAINING OUTSTANDING DUE (CARRIED FORWARD)", s.remainingDue || 0],
        [],
      ];

      if (settlementPayments.length > 0) {
        worksheetData.push(["PAYMENT BREAKDOWN"]);
        worksheetData.push(["Payment Date", "Method", "Reference No.", "Amount (Rs.)"]);
        for (const p of settlementPayments) {
          worksheetData.push([p.paymentDate, p.paymentMethod, p.referenceNumber || "-", p.amount]);
        }
        worksheetData.push([]);
      }

      if (s.notes) {
        worksheetData.push(["Remarks / Notes:", s.notes]);
        worksheetData.push([]);
      }

      worksheetData.push([
        `Prepared By: ${s.createdBy || "Accountant"}`,
        "",
        "Courier Rep: ____________________",
        "",
        `Authorized Signatory: ${settings.authorizedPerson || ""}`,
      ]);
      worksheetData.push([]);
      worksheetData.push(["Thank You"]);
      worksheetData.push([settings.footerMessage || ""]);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 42 },
        { wch: 22 },
        { wch: 28 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Settlement Bill");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Settlement_Bill_${s.settlementNumber}.xlsx"`,
        },
      });
    }

    /* ==================== 2. SETTLEMENT PARCEL BREAKDOWN (EXCEL) ==================== */
    if (type === "settlement-parcels") {
      let settlement = null;
      if (id) {
        settlement = await getSettlementById(id);
      }
      if (!settlement) {
        return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
      }

      const allParcels = await getParcels();
      const settlementParcelIds = new Set(settlement.parcelIds || []);
      const parcels = allParcels.filter(
        (p) => settlementParcelIds.has(p._id) || p.settlementId === settlement!._id
      );

      const headers = [
        "S.N.",
        "Customer Name",
        "Mobile Number (Tracking Ref)",
        "SKU",
        "Service Area",
        "COD Amount (Rs.)",
        "Delivery Charge (Rs.)",
        "Status",
        "Delivery Date",
        "Remarks",
      ];

      const dataRows = parcels.map((p, idx) => [
        idx + 1,
        p.customerName,
        p.mobile,
        p.sku || "-",
        p.serviceArea,
        p.codAmount || 0,
        p.actualDeliveryCharge ?? p.deliveryCharge ?? 0,
        p.status,
        p.deliveryDate || p.returnDate || "-",
        p.remarks || "-",
      ]);

      const worksheetData = [
        [`Settlement Parcel Breakdown: ${settlement.settlementNumber}`],
        [`Courier: ${settlement.courierName}  |  Period: ${settlement.fromDate} to ${settlement.toDate}`],
        [],
        headers,
        ...dataRows,
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 25 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Parcels");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Parcels_${settlement.settlementNumber}.xlsx"`,
        },
      });
    }

    /* ==================== 3. BATCH PARCELS EXPORT ==================== */
    if (type === "batch" && id) {
      const batch = await getBatchById(id);
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      const allParcels = await getParcels();
      const parcels = allParcels.filter(
        (p) => p.batchId === batch._id || p.batchNumber === batch.batchNumber
      );

      const headers = [
        "S.N.",
        "Customer Name",
        "Mobile Number (Tracking Ref)",
        "SKU",
        "Service Area",
        "COD Amount (Rs.)",
        "Delivery Charge (Rs.)",
        "Status",
        "Remarks",
      ];

      const dataRows = parcels.map((p, idx) => [
        idx + 1,
        p.customerName,
        p.mobile,
        p.sku || "-",
        p.serviceArea,
        p.codAmount || 0,
        p.actualDeliveryCharge ?? p.deliveryCharge ?? 0,
        p.status,
        p.remarks || "-",
      ]);

      const worksheetData = [
        [`Courier Handover Manifest: ${batch.batchNumber}`],
        [`Courier: ${batch.courierName}  |  Dispatch Date: ${batch.batchDate}  |  Total: ${batch.totalPackages} packages`],
        [],
        headers,
        ...dataRows,
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 25 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Batch Manifest");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Batch_${batch.batchNumber}.xlsx"`,
        },
      });
    }

    /* ==================== 4. PARCELS EXPORT ==================== */
    if (type === "parcels" || type === "daily") {
      let parcels = await getParcels();

      if (courierId && courierId !== "all") {
        parcels = parcels.filter((p) => p.courierId === courierId);
      }
      if (status && status !== "all") {
        parcels = parcels.filter((p) => p.status === status);
      }
      if (fromDate) {
        parcels = parcels.filter((p) => {
          const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
          return d >= fromDate;
        });
      }
      if (toDate) {
        parcels = parcels.filter((p) => {
          const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
          return d <= toDate;
        });
      }

      // Build rows for SheetJS
      const headers = [
        "S.N.",
        "Date",
        "Customer Name",
        "Mobile Number (Tracking Ref)",
        "SKU",
        "Courier Name",
        "Service Area",
        "COD Amount (Rs.)",
        "Delivery Charge (Rs.)",
        "Parcel Status",
        "Delivery Date",
        "Settlement Status",
        "Remarks",
      ];

      const dataRows = parcels.map((p, idx) => [
        idx + 1,
        (p.createdAt || "").split("T")[0],
        p.customerName,
        p.mobile,
        p.sku || "-",
        p.courierName,
        p.serviceArea,
        p.codAmount || 0,
        p.actualDeliveryCharge ?? p.deliveryCharge ?? 0,
        p.status,
        p.deliveryDate || "-",
        p.settlementStatus,
        p.remarks || "-",
      ]);

      const totalCOD = parcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
      const totalDelivery = parcels.reduce(
        (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
        0
      );
      const netAmount = totalCOD - totalDelivery;

      const totalRow = [
        "TOTALS",
        `Entries: ${parcels.length}`,
        "",
        "",
        "",
        "",
        "",
        "",
        totalCOD,
        totalDelivery,
        `Net: Rs. ${netAmount.toLocaleString()}`,
        "",
        "",
        "",
      ];

      const worksheetData = [headers, ...dataRows, [], totalRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 28 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 25 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Parcels Report");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Courier_Parcels_Export_${Date.now()}.xlsx"`,
        },
      });
    }

    /* ==================== 5. RAW SETTLEMENTS DATABASE EXPORT ==================== */
    if (type === "settlements") {
      let settlements = await getSettlements();
      if (courierId && courierId !== "all") {
        settlements = settlements.filter((s) => s.courierId === courierId);
      }

      const headers = [
        "S.N.",
        "Settlement Number",
        "Courier Name",
        "Period From",
        "Period To",
        "Delivered Parcels",
        "Returned Parcels",
        "Gross COD (Rs.)",
        "Delivery Charges (Rs.)",
        "Adjustments (Rs.)",
        "Current Net (Rs.)",
        "Previous Due (Rs.)",
        "Total Receivable (Rs.)",
        "Amount Received (Rs.)",
        "Remaining Due (Rs.)",
        "Payment Status",
        "Created Date",
      ];

      const dataRows = settlements.map((s, idx) => [
        idx + 1,
        s.settlementNumber,
        s.courierName,
        s.fromDate,
        s.toDate,
        s.deliveredParcelsCount,
        s.returnedParcelsCount,
        s.grossCOD,
        s.deliveryCharges,
        s.adjustments,
        s.currentNetReceivable,
        s.previousDue,
        s.totalReceivable,
        s.totalPaid,
        s.remainingDue,
        s.paymentStatus,
        (s.createdAt || "").split("T")[0],
      ]);

      const totalGrossCOD = settlements.reduce((sum, s) => sum + (s.grossCOD || 0), 0);
      const totalReceivable = settlements.reduce((sum, s) => sum + (s.totalReceivable || 0), 0);
      const totalPaid = settlements.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
      const totalDue = settlements.reduce((sum, s) => sum + (s.remainingDue || 0), 0);

      const totalRow = [
        "TOTALS",
        `Count: ${settlements.length}`,
        "",
        "",
        "",
        "",
        "",
        totalGrossCOD,
        "",
        "",
        "",
        "",
        "",
        totalReceivable,
        totalPaid,
        totalDue,
        "",
        "",
      ];

      const worksheetData = [headers, ...dataRows, [], totalRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Settlements Report");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Settlements_Export_${Date.now()}.xlsx"`,
        },
      });
    }

    /* ==================== 6. LEDGER EXPORT ==================== */
    if (type === "ledger") {
      let entries = await getLedgerEntries();
      if (courierId && courierId !== "all") {
        entries = entries.filter((e) => e.courierId === courierId);
      }
      entries.sort(
        (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
      );

      const headers = [
        "S.N.",
        "Date",
        "Courier Name",
        "Transaction Type",
        "Reference ID",
        "Description",
        "Debit (Rs.) [Courier Owes]",
        "Credit (Rs.) [We Received/Charges]",
        "Running Balance (Rs.)",
      ];

      const dataRows = entries.map((e, idx) => [
        idx + 1,
        e.transactionDate,
        e.courierName,
        e.transactionType,
        e.referenceId || "-",
        e.description,
        e.debit || 0,
        e.credit || 0,
        e.runningBalance,
      ]);

      const worksheetData = [headers, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 28 },
        { wch: 20 },
        { wch: 18 },
        { wch: 35 },
        { wch: 24 },
        { wch: 28 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Courier Ledger");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Courier_Ledger_Export_${Date.now()}.xlsx"`,
        },
      });
    }

    /* ==================== 7. RETURNS EXPORT ==================== */
    if (type === "returns") {
      let parcels = await getParcels();
      parcels = parcels.filter((p) => p.status === "Returned");

      if (courierId && courierId !== "all") {
        parcels = parcels.filter((p) => p.courierId === courierId);
      }
      if (fromDate) {
        parcels = parcels.filter((p) => {
          const d = (p.returnDate || p.updatedAt || p.createdAt || "").split("T")[0];
          return d >= fromDate;
        });
      }
      if (toDate) {
        parcels = parcels.filter((p) => {
          const d = (p.returnDate || p.updatedAt || p.createdAt || "").split("T")[0];
          return d <= toDate;
        });
      }

      const headers = [
        "S.N.",
        "Return Date",
        "Courier Name",
        "Customer Name",
        "Mobile Number (Tracking Ref)",
        "SKU",
        "Service Area",
        "Adjusted COD (Rs.)",
        "Return Reason / Remarks",
      ];

      const dataRows = parcels.map((p, idx) => [
        idx + 1,
        p.returnDate || (p.updatedAt || "").split("T")[0],
        p.courierName,
        p.customerName,
        p.mobile,
        p.sku || "-",
        p.serviceArea,
        p.codAmount || 0,
        p.remarks || "Returned",
      ]);

      const totalReturnedCOD = parcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

      const totalRow = [
        "TOTALS",
        `Returned Count: ${parcels.length}`,
        "",
        "",
        "",
        "",
        "",
        "",
        totalReturnedCOD,
        `Total Adjusted COD: Rs. ${totalReturnedCOD.toLocaleString()}`,
      ];

      const worksheetData = [headers, ...dataRows, [], totalRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 18 },
        { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Returned Parcels");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Returned_Parcels_Export_${Date.now()}.xlsx"`,
        },
      });
    }

    /* ==================== 8. PAYMENTS EXPORT ==================== */
    if (type === "payments") {
      let payments = await getPayments();

      if (courierId && courierId !== "all") {
        payments = payments.filter((p) => p.courierId === courierId);
      }
      if (fromDate) {
        payments = payments.filter((p) => (p.paymentDate || "").split("T")[0] >= fromDate);
      }
      if (toDate) {
        payments = payments.filter((p) => (p.paymentDate || "").split("T")[0] <= toDate);
      }

      const headers = [
        "S.N.",
        "Payment Date",
        "Courier Name",
        "Payment Method",
        "Amount Received (Rs.)",
        "Bank Ref / TRX No.",
        "Settlement Reference",
        "Remarks",
        "Recorded By",
      ];

      const dataRows = payments.map((p, idx) => [
        idx + 1,
        p.paymentDate,
        p.courierName,
        p.paymentMethod,
        p.amount || 0,
        p.referenceNumber || "-",
        p.settlementNumber || "General",
        p.remarks || "-",
        p.recordedBy || "Admin",
      ]);

      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalRow = [
        "TOTALS",
        `Count: ${payments.length}`,
        "",
        "",
        totalAmount,
        "",
        "",
        `Total: Rs. ${totalAmount.toLocaleString()}`,
        "",
      ];

      const worksheetData = [headers, ...dataRows, [], totalRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 28 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payment History");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Payment_History_Export_${Date.now()}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

