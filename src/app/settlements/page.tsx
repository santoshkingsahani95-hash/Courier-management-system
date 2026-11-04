"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  Calendar,
  Truck,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Download,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  DollarSign,
  Package,
  Eye,
  Printer,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";

const DEFAULT_COURIER_LIST = [
  { _id: "c-001", name: "Google Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 70 },
  { _id: "c-002", name: "KDM Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-003", name: "SP Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-004", name: "Nepal Can Move", serviceArea: "Outside Valley", defaultDeliveryCharge: 250 },
];

export default function SettlementsPage() {
  const [couriers, setCouriers] = useState<any[]>(DEFAULT_COURIER_LIST);
  const [selectedCourierId, setSelectedCourierId] = useState("c-001");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [activePreset, setActivePreset] = useState("last7days");

  function handlePresetChange(preset: string) {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "last7days") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setFromDate(past.toISOString().split("T")[0]);
      setToDate(todayStr);
    } else if (preset === "thismonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(todayStr);
    }
  }

  // Live calculation preview state
  const [calcPreview, setCalcPreview] = useState<any | null>(null);
  const [adjustments, setAdjustments] = useState<number | "">(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [initialPayment, setInitialPayment] = useState<number | "">("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("Bank Transfer");
  const [initialPaymentRef, setInitialPaymentRef] = useState("");
  const [notes, setNotes] = useState("");

  const [isCalculating, setIsCalculating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Past finalized settlements
  const [pastSettlements, setPastSettlements] = useState<any[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    fetchCouriers();
    fetchPastSettlements();
  }, []);

  useEffect(() => {
    if (selectedCourierId) {
      calculateSettlementPreview();
    }
  }, [selectedCourierId, fromDate, toDate, adjustments]);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      const list = d.couriers || [];
      setCouriers(list);
      if (list.length > 0) {
        setSelectedCourierId(list[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPastSettlements() {
    setLoadingPast(true);
    try {
      const res = await fetch("/api/settlements");
      const d = await res.json();
      setPastSettlements(d.settlements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPast(false);
    }
  }

  async function calculateSettlementPreview() {
    if (!selectedCourierId) return;
    setIsCalculating(true);
    try {
      const res = await fetch("/api/settlements/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: selectedCourierId,
          fromDate,
          toDate,
          adjustments: Number(adjustments) || 0,
        }),
      });
      const d = await res.json();
      setCalcPreview(d);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  }

  // Finalize settlement
  async function handleFinalizeSettlement() {
    if (!selectedCourierId) return;
    if (!confirm("Are you sure you want to finalize this settlement? A permanent snapshot and ledger record will be created.")) {
      return;
    }

    setIsFinalizing(true);
    try {
      const payload = {
        courierId: selectedCourierId,
        fromDate,
        toDate,
        adjustments: Number(adjustments) || 0,
        adjustmentNotes,
        initialPayment: Number(initialPayment) || 0,
        initialPaymentMethod,
        initialPaymentRef,
        notes,
      };

      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (res.ok) {
        setInitialPayment("");
        setInitialPaymentRef("");
        setAdjustments(0);
        setAdjustmentNotes("");
        setNotes("");
        fetchPastSettlements();
        calculateSettlementPreview();
        if (d.settlement?._id) {
          window.location.href = `/settlements/${d.settlement._id}`;
        }
      } else {
        alert(d.error || "Failed to finalize settlement");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsFinalizing(false);
    }
  }

  const selectedCourier = couriers.find((c) => c._id === selectedCourierId);

  // Derived calculations from preview + local inputs
  const currentNet = calcPreview?.currentNetReceivable || 0;
  const previousDue = calcPreview?.previousDue || 0;
  const totalReceivable = currentNet + previousDue;
  const paymentReceived = Number(initialPayment) || 0;
  const remainingDue = totalReceivable - paymentReceived;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier COD Settlement System
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated reconciliation: Gross COD, charges, carried-forward dues & partial payments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {pastSettlements.length > 0 && (
            <a
              href={`/api/export?type=settlement-bill&id=${pastSettlements[0]._id}`}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
              title="Download latest settlement formatted bill in Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Bill (Excel)</span>
            </a>
          )}
          <a
            href="/api/export?type=settlements"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
            title="Export raw settlements table"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Table</span>
          </a>
        </div>
      </div>

      {/* Main Settlement Engine Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* Quick Period Presets: Today, Yesterday, Last 7 Days, This Month */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Quick Period Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "last7days", label: "Last 7 Days" },
                { id: "thismonth", label: "This Month" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePreset === p.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Active Period: <strong className="text-slate-800 font-mono">{fromDate}</strong> to{" "}
            <strong className="text-slate-800 font-mono">{toDate}</strong>
          </div>
        </div>

        {/* Controls: Select Courier & Period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Courier Partner <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {couriers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.serviceArea})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Period From
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Period To
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Accounting Statement Computation Card */}
        <div className="mt-6 max-w-2xl mx-auto bg-slate-50/70 border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-extrabold text-slate-900">
              Courier Settlement Statement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Courier: <strong>{selectedCourier?.name || "Selected Courier"}</strong> &bull; Period:{" "}
              {fromDate} — {toDate}
            </p>
          </div>

          <div className="mt-4 space-y-3 text-xs font-medium">
            {/* Reconciliation Summary: Total Handed Over = Delivered + Returned + Pending */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-blue-900 border-b border-blue-200/60 pb-1.5">
                <span>Total Parcels Handed Over:</span>
                <span className="font-extrabold text-blue-950 font-mono">
                  {(calcPreview?.deliveredCount || 0) +
                    (calcPreview?.returnedCount || 0) +
                    (calcPreview?.pendingCount || 0)}{" "}
                  parcels
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block font-bold">Delivered</span>
                  <span className="text-emerald-950 font-extrabold text-xs">
                    {calcPreview?.deliveredCount || 0}
                  </span>
                </div>
                <div className="bg-white/80 p-1.5 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block font-bold">Returned</span>
                  <span className="text-rose-950 font-extrabold text-xs">
                    {calcPreview?.returnedCount || 0}
                  </span>
                </div>
                <div className="bg-white/80 p-1.5 rounded-lg border border-amber-200">
                  <span className="text-amber-700 block font-bold">Pending</span>
                  <span className="text-amber-950 font-extrabold text-xs">
                    {calcPreview?.pendingCount || 0}
                  </span>
                </div>
              </div>
              {calcPreview?.returnReasonsSummary && Object.keys(calcPreview.returnReasonsSummary).length > 0 && (
                <div className="pt-1.5 border-t border-blue-200/60 text-[10px] text-slate-600">
                  <span className="font-bold text-rose-800">Return Reasons breakdown: </span>
                  {Object.entries(calcPreview.returnReasonsSummary)
                    .map(([r, c]) => `${r} (${c})`)
                    .join(", ")}
                </div>
              )}
            </div>

            {/* Gross COD */}
            <div className="flex justify-between items-center py-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>A. Gross COD Collected:</span>
              <span className="text-blue-700">
                {formatNPR(calcPreview?.grossCOD || 0)}
              </span>
            </div>

            {/* Delivery Charges */}
            <div className="flex justify-between items-center py-1 text-slate-600 pl-4">
              <span>(-) Delivery Charges:</span>
              <span className="font-semibold text-rose-700">
                {formatNPR(calcPreview?.deliveryCharges || 0)}
              </span>
            </div>

            {/* Current Net Receivable */}
            <div className="flex justify-between items-center py-2 border-t border-slate-200 text-slate-800 font-bold">
              <span>Current Net Receivable (Gross COD - Delivery Charges):</span>
              <span className="text-indigo-700">{formatNPR(currentNet)}</span>
            </div>

            {/* Previous Outstanding Due */}
            <div className="flex justify-between items-center py-1 text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <span>(+) Previous Outstanding Due Carried Forward:</span>
              <span>{formatNPR(previousDue)}</span>
            </div>

            {/* TOTAL RECEIVABLE */}
            <div className="flex justify-between items-center py-3 border-t-2 border-slate-300 text-base font-extrabold text-slate-900 bg-white px-4 rounded-xl shadow-xs border border-slate-200">
              <span className="text-slate-800">TOTAL RECEIVABLE:</span>
              <span className="text-emerald-700 text-lg">{formatNPR(totalReceivable)}</span>
            </div>

            {/* Payment Received Input */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-emerald-900">
                  Amount Received / Deposited (Rs.):
                </label>
                <input
                  type="number"
                  placeholder="e.g. 80000"
                  value={initialPayment}
                  onChange={(e) =>
                    setInitialPayment(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-36 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-right font-extrabold text-sm text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {Number(initialPayment) > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                      Method
                    </label>
                    <select
                      value={initialPaymentMethod}
                      onChange={(e) => setInitialPaymentMethod(e.target.value)}
                      className="w-full p-1 bg-white border border-emerald-200 rounded text-xs"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="eSewa">eSewa</option>
                      <option value="Khalti">Khalti</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                      Bank Ref No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TRX-109283"
                      value={initialPaymentRef}
                      onChange={(e) => setInitialPaymentRef(e.target.value)}
                      className="w-full p-1 bg-white border border-emerald-200 rounded text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* REMAINING OUTSTANDING DUE */}
            <div className="flex justify-between items-center py-3 bg-amber-100/70 border border-amber-300 text-amber-950 px-4 rounded-xl font-extrabold text-base">
              <span>REMAINING OUTSTANDING DUE:</span>
              <span className="text-amber-900 text-lg">{formatNPR(remainingDue)}</span>
            </div>
            <p className="text-[11px] text-amber-700 italic">
              * This {formatNPR(remainingDue)} will automatically carry forward as the courier's
              outstanding due in the next settlement period and ledger.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              onClick={calculateSettlementPreview}
              disabled={isCalculating}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Recalculate
            </button>

            <button
              onClick={handleFinalizeSettlement}
              disabled={isFinalizing || !calcPreview}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center space-x-2"
            >
              {isFinalizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Finalize & Snapshot Settlement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Past Finalized Settlements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Settlement History & Ledger Snapshots</h2>
          <span className="text-xs text-slate-500">{pastSettlements.length} total records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Settlement ID</th>
                <th className="py-3 px-4">Courier</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Gross COD</th>
                <th className="py-3 px-4 text-right">Delivery Charges</th>
                <th className="py-3 px-4 text-right">Previous Due</th>
                <th className="py-3 px-4 text-right">Total Receivable</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPast ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading settlements...</span>
                  </td>
                </tr>
              ) : pastSettlements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No finalized settlements recorded yet.
                  </td>
                </tr>
              ) : (
                pastSettlements.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      <Link
                        href={`/settlements/${s._id}`}
                        className="hover:underline flex items-center space-x-1"
                        title="Click to view professional settlement bill statement"
                      >
                        <span>{s.settlementNumber}</span>
                      </Link>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">{s.courierName}</td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {s.fromDate} — {s.toDate}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatNPR(s.grossCOD)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-rose-700">
                      {formatNPR(s.deliveryCharges)}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      {formatNPR(s.previousDue)}
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                      {formatNPR(s.totalReceivable)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      {formatNPR(s.totalPaid)}
                    </td>

                    <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                      {formatNPR(s.remainingDue)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.paymentStatus === "Partially Paid"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <Link
                          href={`/settlements/${s._id}`}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold flex items-center space-x-1"
                          title="View & Print Professional Bill"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Bill</span>
                        </Link>

                        <a
                          href={`/api/export?type=settlement-bill&id=${s._id}`}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                          title="Download Formatted Statement in Excel"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </a>

                        <Link
                          href={`/payments?settlementId=${s._id}&courierId=${s.courierId}`}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                          title="Record Payment"
                        >
                          + Pay
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

