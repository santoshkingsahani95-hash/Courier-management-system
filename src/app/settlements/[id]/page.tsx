"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  Package,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";

export default function SettlementBillPage() {
  const { user, role, isAdminOrManager, isStaff } = useUserRole();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    settlement: any;
    courier: any;
    settings: any;
    parcels: any[];
    payments: any[];
  } | null>(null);

  const [showParcelModal, setShowParcelModal] = useState(false);
  const [parcelFilter, setParcelFilter] = useState("all");

  useEffect(() => {
    if (id) {
      fetchSettlementBill();
    }
  }, [id]);

  async function fetchSettlementBill() {
    setLoading(true);
    try {
      const res = await fetch(`/api/settlements/${id}`);
      if (!res.ok) {
        throw new Error("Settlement not found");
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDeleteSettlement() {
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can delete settlements.");
      return;
    }
    const s = data?.settlement;
    if (!s) return;
    if (
      !confirm(
        `Are you sure you want to cancel and delete settlement ${s.settlementNumber}?\n\nThis will safely revert all associated parcels back to Unsettled and reverse the ledger entry.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/settlements/${s._id}`, { method: "DELETE" });
      if (res.ok) {
        alert(`Settlement ${s.settlementNumber} cancelled and deleted.`);
        router.push("/settlements");
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete settlement");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete settlement");
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm font-medium">Generating Courier Settlement Statement...</p>
      </div>
    );
  }

  if (!data || !data.settlement) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Settlement Statement Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested settlement ID #{id} could not be located in records.
        </p>
        <Link
          href="/settlements"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settlements</span>
        </Link>
      </div>
    );
  }

  const { settlement: s, courier: c, settings, parcels, payments } = data;
  const filteredParcels =
    parcelFilter === "all"
      ? parcels
      : parcels.filter((p) => p.status?.toLowerCase() === parcelFilter.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto pb-12 print:p-0 print:max-w-none">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3">
          <Link
            href="/settlements"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Settlements"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-slate-900 text-sm">
                {s.settlementNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  s.paymentStatus === "Paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.paymentStatus === "Partially Paid"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {s.paymentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Courier: <strong className="text-slate-700">{s.courierName}</strong> &bull; Period:{" "}
              {formatDate(s.fromDate)} — {formatDate(s.toDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Individual Parcels Modal trigger */}
          <button
            onClick={() => setShowParcelModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Inspect all delivered and returned parcels in this settlement"
          >
            <Package className="w-4 h-4 text-slate-500" />
            <span>View Parcel Details ({parcels.length})</span>
          </button>

          {/* Download Bill as Formatted Excel Statement */}
          <a
            href={`/api/export?type=settlement-bill&id=${s._id}`}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Download vertical settlement bill formatted in Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Bill (Excel)</span>
          </a>

          {/* Record payment shortcut */}
          <Link
            href={`/payments?settlementId=${s._id}&courierId=${s.courierId}`}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Payment</span>
          </Link>

          {/* Print / Download PDF */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill / PDF</span>
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleDeleteSettlement}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Cancel and delete this settlement (Admin & Manager)"
            >
              <Trash2 className="w-4 h-4" />
              <span>Cancel Settlement</span>
            </button>
          )}
        </div>
      </div>

      {/* A4 PRINTABLE BILL STATEMENT CONTAINER */}
      <div
        id="settlement-bill-sheet"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 print:border-none print:shadow-none print:p-0 print:rounded-none text-slate-800"
      >
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {settings?.companyName || "Courier Management System"}
            </h1>
            <p className="text-xs text-slate-600 font-medium">{settings?.address}</p>
            <p className="text-xs text-slate-600">
              Phone: <span className="font-medium text-slate-700">{settings?.phone}</span>
              {settings?.email && (
                <>
                  {" "}
                  &bull; Email:{" "}
                  <span className="font-medium text-slate-700">{settings?.email}</span>
                </>
              )}
            </p>
            {settings?.panVat && (
              <p className="text-[11px] font-mono text-slate-500 pt-0.5">
                PAN / VAT Reg: <strong>{settings?.panVat}</strong>
              </p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1 sm:min-w-[200px]">
            <div className="inline-block sm:block">
              <span className="text-[11px] font-extrabold tracking-widest text-blue-800 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100 print:border-none print:bg-transparent">
                Courier Settlement
              </span>
            </div>
            <div className="text-base font-black font-mono text-slate-900 tracking-tight pt-1">
              #{s.settlementNumber}
            </div>
            <div className="text-xs text-slate-500">
              Settlement Date:{" "}
              <strong className="text-slate-700">{formatDate(s.createdAt)}</strong>
            </div>
          </div>
        </div>

        {/* COURIER & SETTLEMENT PERIOD INFO BOX */}
        <div className="my-6 p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 print:bg-transparent print:border-slate-300">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
            Bill To / Courier Partner
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Courier Name:</span>
              <strong className="text-sm text-slate-900 font-bold block">{s.courierName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Contact Person & Mobile:</span>
              <span className="text-slate-700 font-medium block">
                {c?.contactPerson || "Not set"}{" "}
                {c?.phone && <span className="font-mono text-slate-500">({c.phone})</span>}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Service Area:</span>
              <span className="text-slate-700 font-semibold block">
                {c?.serviceArea || "Inside Valley"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Settlement Period:</span>
              <span className="text-slate-900 font-bold font-mono block">
                {formatDate(s.fromDate)} — {formatDate(s.toDate)}
              </span>
            </div>
          </div>
        </div>

        {/* PARCEL SUMMARY 3-BOX DISPLAY */}
        <div className="mb-6">
          <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-500 pb-2">
            Parcel Processing Summary
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 text-center rounded-xl bg-emerald-50/70 border border-emerald-100 print:border-slate-300 print:bg-transparent">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Delivered Parcels
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">
                {s.deliveredParcelsCount}
              </div>
            </div>

            <div className="p-3 text-center rounded-xl bg-rose-50/70 border border-rose-100 print:border-slate-300 print:bg-transparent">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                Returned Parcels
              </span>
              <div className="text-2xl font-black text-rose-700 mt-0.5">
                {s.returnedParcelsCount}
              </div>
            </div>

            <div className="p-3 text-center rounded-xl bg-slate-50 border border-slate-200 print:border-slate-300 print:bg-transparent">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Total Processed
              </span>
              <div className="text-2xl font-black text-slate-800 mt-0.5">
                {s.deliveredParcelsCount + s.returnedParcelsCount}
              </div>
            </div>
          </div>
        </div>

        {/* FINANCIAL CALCULATION STATEMENT TABLE */}
        <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden print:border-slate-400">
          <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-xs text-slate-700 uppercase tracking-wider border-b border-slate-200 flex justify-between print:bg-slate-200 print:border-slate-400">
            <span>Settlement Details & Description</span>
            <span className="text-right">Amount (NPR)</span>
          </div>

          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {/* Gross COD */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Gross COD Collection (Delivered Parcels)
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                  {formatNPR(s.grossCOD)}
                </td>
              </tr>

              {/* Delivery charges */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 text-slate-600 pl-8">
                  Less: Delivery Charges ({s.deliveredParcelsCount} packages)
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-rose-700">
                  - {formatNPR(s.deliveryCharges)}
                </td>
              </tr>

              {/* Adjustments */}
              {s.adjustments !== 0 && (
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 text-slate-600 pl-8">
                    {s.adjustments > 0 ? "Add" : "Less"}: Manual Adjustments{" "}
                    {s.adjustmentNotes && (
                      <span className="text-slate-400 italic font-normal">
                        ({s.adjustmentNotes})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                    {s.adjustments > 0 ? "+ " : "- "}
                    {formatNPR(Math.abs(s.adjustments))}
                  </td>
                </tr>
              )}

              {/* Current Net Receivable Subtotal */}
              <tr className="bg-slate-50/80 font-bold text-slate-800 print:bg-transparent">
                <td className="py-2.5 px-4 font-bold">Current Net Receivable</td>
                <td className="py-2.5 px-4 text-right font-extrabold text-slate-900">
                  {formatNPR(s.currentNetReceivable)}
                </td>
              </tr>

              {/* Previous Due */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 text-slate-700 pl-8 font-medium">
                  Add: Previous Outstanding Due (Brought Forward)
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-slate-800">
                  + {formatNPR(s.previousDue)}
                </td>
              </tr>

              {/* TOTAL RECEIVABLE (PROMINENT) */}
              <tr className="bg-blue-50/80 font-black text-blue-950 border-t-2 border-b-2 border-blue-200 print:bg-slate-100 print:border-slate-400">
                <td className="py-3 px-4 text-sm uppercase tracking-wide">
                  TOTAL RECEIVABLE FROM COURIER
                </td>
                <td className="py-3 px-4 text-right text-base font-black text-blue-900">
                  {formatNPR(s.totalReceivable)}
                </td>
              </tr>

              {/* Amount Received / Paid */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 text-slate-700 pl-8 font-medium">
                  Less: Payment Received / Deposited
                </td>
                <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                  - {formatNPR(s.totalPaid)}
                </td>
              </tr>

              {/* REMAINING OUTSTANDING DUE (MOST PROMINENT) */}
              <tr className="bg-amber-100/80 text-amber-950 border-t-2 border-b-2 border-amber-300 print:bg-slate-200 print:border-slate-500">
                <td className="py-3.5 px-4 text-sm font-black uppercase tracking-wide">
                  REMAINING DUE (CARRIED FORWARD)
                </td>
                <td className="py-3.5 px-4 text-right text-lg font-black text-amber-900">
                  {formatNPR(s.remainingDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAYMENT HISTORY BREAKDOWN (IF ANY PAYMENTS RECORDED) */}
        {payments && payments.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-transparent print:border-slate-300">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Payment Transactions on this Settlement
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-200">
                  <th className="py-1">Date</th>
                  <th className="py-1">Payment Method</th>
                  <th className="py-1">Reference / Trx No.</th>
                  <th className="py-1 text-right">Amount (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p: any) => (
                  <tr key={p._id}>
                    <td className="py-1.5 font-medium">{formatDate(p.paymentDate)}</td>
                    <td className="py-1.5">{p.paymentMethod}</td>
                    <td className="py-1.5 font-mono text-slate-500">{p.referenceNumber || "-"}</td>
                    <td className="py-1.5 text-right font-bold text-emerald-700">
                      {formatNPR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REMARKS IF ANY */}
        {s.notes && (
          <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs print:bg-transparent print:border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Settlement Remarks & Notes:
            </span>
            <p className="text-slate-700 font-medium">{s.notes}</p>
          </div>
        )}

        {/* SIGNATURE SECTION */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs print:mt-16">
          <div>
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <div className="font-semibold text-slate-800">
              {s.createdBy || "Prepared By"}
            </div>
            <div className="text-[10px] text-slate-400">Accountant / Staff</div>
          </div>

          <div>
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <div className="font-semibold text-slate-800">Courier Representative</div>
            <div className="text-[10px] text-slate-400">Received & Acknowledged</div>
          </div>

          <div>
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <div className="font-semibold text-slate-800">
              {settings?.authorizedPerson || "Authorized Signatory"}
            </div>
            <div className="text-[10px] text-slate-400">For {settings?.companyName}</div>
          </div>
        </div>

        {/* FOOTER NOTICE */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Thank You
          </div>
          <p className="text-[10px] text-slate-400 max-w-xl mx-auto italic">
            {settings?.footerMessage ||
              "This is a computer-generated courier settlement statement. For any discrepancies, please contact the accounts department within 7 business days."}
          </p>
        </div>
      </div>

      {/* PARCEL BREAKDOWN MODAL (Inspecting 100+ parcels without cluttering 1-page bill) */}
      {showParcelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Settlement Parcels Breakdown &bull; {s.settlementNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Total of {parcels.length} parcels processed in this settlement period
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/export?type=settlement-parcels&id=${s._id}`}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to Excel</span>
                </a>
                <button
                  onClick={() => setShowParcelModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-2 my-3 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Filter by status:</span>
              <button
                onClick={() => setParcelFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  parcelFilter === "all"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({parcels.length})
              </button>
              <button
                onClick={() => setParcelFilter("delivered")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  parcelFilter === "delivered"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Delivered ({s.deliveredParcelsCount})
              </button>
              <button
                onClick={() => setParcelFilter("returned")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  parcelFilter === "returned"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Returned ({s.returnedParcelsCount})
              </button>
            </div>

            {/* Table of parcels */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">S.N.</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile (Tracking Ref)</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">COD</th>
                    <th className="py-2.5 px-3 text-right">Charge</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Delivery Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParcels.map((p, idx) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{p.customerName}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{p.mobile}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {p.sku || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatNPR(p.codAmount)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 font-medium">
                        {p.status === "Returned"
                          ? "Rs. 0"
                          : formatNPR(p.actualDeliveryCharge ?? p.deliveryCharge ?? 0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === "Delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "Returned"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {p.deliveryDate || p.returnDate || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>
                Showing {filteredParcels.length} of {parcels.length} parcels
              </div>
              <button
                onClick={() => setShowParcelModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

