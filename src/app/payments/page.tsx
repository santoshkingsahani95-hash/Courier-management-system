"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  PlusCircle,
  Calendar,
  Truck,
  Download,
  X,
  Loader2,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  Calculator,
  ShieldCheck,
  Wallet,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";

function PaymentsContent() {
  const searchParams = useSearchParams();
  const initialCourierId = searchParams?.get("courierId") || "";
  const initialSettlementId = searchParams?.get("settlementId") || "";

  const DEFAULT_COURIER_LIST = [
    { _id: "c-001", name: "Google Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 70 },
    { _id: "c-002", name: "KDM Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
    { _id: "c-003", name: "SP Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
    { _id: "c-004", name: "Nepal Can Move", serviceArea: "Outside Valley", defaultDeliveryCharge: 250 },
  ];

  const [payments, setPayments] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>(DEFAULT_COURIER_LIST);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [courierBalances, setCourierBalances] = useState<{ [key: string]: number }>({});
  const [summary, setSummary] = useState({
    totalAmountReceived: 0,
    todayReceived: 0,
    totalOutstandingDue: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters for History Table
  const [selectedCourierFilter, setSelectedCourierFilter] = useState(initialCourierId || "all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "thismonth" | "custom">("all");
  const [customFromDate, setCustomFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Record Payment Workbench Form State
  const [payCourierId, setPayCourierId] = useState(initialCourierId || "");
  const [paySettlementId, setPaySettlementId] = useState(initialSettlementId || "");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSuccessMsg, setRecordedSuccessMsg] = useState("");

  useEffect(() => {
    fetchPaymentsData();
  }, [selectedCourierFilter]);

  async function fetchPaymentsData() {
    setLoading(true);
    try {
      let url = "/api/payments";
      if (selectedCourierFilter && selectedCourierFilter !== "all") {
        url += `?courierId=${selectedCourierFilter}`;
      }
      const res = await fetch(url);
      const d = await res.json();
      setPayments(d.payments || []);
      setCouriers(d.couriers || []);
      setSettlements(d.settlements || []);
      setCourierBalances(d.courierBalances || {});
      if (d.summary) {
        setSummary(d.summary);
      }
      if (d.couriers && d.couriers.length > 0 && !payCourierId) {
        setPayCourierId(d.couriers[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Active selected courier in payment form
  const activePayCourier = couriers.find((c) => c._id === payCourierId);
  const currentCourierDue = activePayCourier ? courierBalances[activePayCourier._id] ?? 0 : 0;

  // Active unpaid/partially paid settlements for this courier
  const courierUnpaidSettlements = settlements.filter(
    (s) => s.courierId === payCourierId && s.remainingDue > 0
  );

  // Live Due Calculation
  const numericAmount = Number(amount) || 0;
  const newProjectedRemainingDue = Math.max(0, currentCourierDue - numericAmount);
  const isFullySettled = numericAmount > 0 && currentCourierDue > 0 && numericAmount >= currentCourierDue;

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payCourierId) {
      alert("Please select a courier partner.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid payment amount greater than Rs. 0.");
      return;
    }

    setIsRecording(true);
    setRecordedSuccessMsg("");
    try {
      const matchingSettlement = settlements.find((s) => s._id === paySettlementId);

      const payload = {
        courierId: payCourierId,
        settlementId: paySettlementId || undefined,
        settlementNumber: matchingSettlement?.settlementNumber || undefined,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        remarks: remarks.trim(),
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (res.ok) {
        const remainingText =
          d.remainingOutstanding !== undefined
            ? `Remaining Outstanding Due: ${formatNPR(d.remainingOutstanding)}.`
            : `Remaining Due: ${formatNPR(newProjectedRemainingDue)}.`;
        setRecordedSuccessMsg(
          `Payment of Rs. ${Number(amount).toLocaleString()} recorded successfully! ${remainingText}`
        );
        setAmount("");
        setReferenceNumber("");
        setRemarks("");
        await fetchPaymentsData();
        setTimeout(() => setRecordedSuccessMsg(""), 7000);
      } else {
        alert(d.error || "Failed to record payment");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsRecording(false);
    }
  }

  // Filter Payments History Table
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    return payments.filter((p) => {
      // Courier filter
      if (selectedCourierFilter !== "all" && p.courierId !== selectedCourierFilter) {
        return false;
      }

      // Method filter
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) {
        return false;
      }

      // Date filter
      const pDate = (p.paymentDate || p.createdAt || "").split("T")[0];
      if (dateFilter === "today" && pDate !== todayStr) return false;
      if (dateFilter === "yesterday" && pDate !== yesterdayStr) return false;
      if (dateFilter === "thismonth" && pDate < thisMonthStart) return false;
      if (dateFilter === "custom") {
        if (customFromDate && pDate < customFromDate) return false;
        if (customToDate && pDate > customToDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const courierMatch = (p.courierName || "").toLowerCase().includes(q);
        const refMatch = (p.referenceNumber || "").toLowerCase().includes(q);
        const setMatch = (p.settlementNumber || "").toLowerCase().includes(q);
        const remarksMatch = (p.remarks || "").toLowerCase().includes(q);
        if (!courierMatch && !refMatch && !setMatch && !remarksMatch) return false;
      }

      return true;
    });
  }, [payments, selectedCourierFilter, methodFilter, dateFilter, customFromDate, customToDate, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Payment Receipts & Settlement Dues
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Record incoming payments from couriers across multiple payment methods. Automatically recalculates settlement dues and keeps audit ledgers in balance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/export?type=payments"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Payments (Excel)</span>
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Ledger Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Collection & Outstanding Dues Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Total Received (All-Time)
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">
            {formatNPR(summary.totalAmountReceived)}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">
            {summary.totalCount} recorded payments
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            Today's Collections
          </div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">
            {formatNPR(summary.todayReceived)}
          </div>
          <p className="text-[11px] text-blue-600/80 mt-0.5">Paid into accounts today</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Current Outstanding Due
          </div>
          <div className="text-2xl font-black text-amber-800 mt-0.5">
            {formatNPR(summary.totalOutstandingDue)}
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">Total couriers owe company</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active Courier Partners
          </div>
          <div className="text-2xl font-black text-slate-800 mt-0.5">{couriers.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Settlement accounts managed</p>
        </div>
      </div>

      {/* RECORD PAYMENT & LIVE SETTLEMENT DUE CALCULATOR WORKBENCH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Record Incoming Courier Payment
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Live Settlement & Due Calculation
          </span>
        </div>

        {recordedSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recordedSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4">
          {/* Top Row: Courier & Live Balance Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Courier Provider Paying Us <span className="text-red-500">*</span>
              </label>
              <select
                value={payCourierId}
                onChange={(e) => {
                  setPayCourierId(e.target.value);
                  setPaySettlementId("");
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {couriers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.serviceArea})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Due Status Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Current Courier Outstanding Due:
                </span>
                <span className="text-xl font-black text-amber-700 block">
                  {formatNPR(currentCourierDue)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {courierUnpaidSettlements.length > 0
                    ? `${courierUnpaidSettlements.length} active unpaid settlement(s)`
                    : "No pending settlement invoices"}
                </span>
              </div>

              {activePayCourier && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Contact Person:</span>
                  <strong className="text-xs text-slate-800 block">
                    {activePayCourier.contactPerson || "Staff"}
                  </strong>
                  <span className="font-mono text-[11px] text-slate-500">
                    {activePayCourier.phone || "-"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: Payment Method, Amount, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bank Transfer">Bank Transfer (NIC Asia, Nabil, etc.)</option>
                <option value="eSewa">eSewa Mobile Wallet</option>
                <option value="Khalti">Khalti Wallet</option>
                <option value="Cash">Cash Handover / Counter Cash</option>
                <option value="Cheque Deposit">Cheque Deposit</option>
                <option value="ConnectIPS">ConnectIPS</option>
                <option value="Other">Other Payout Method</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Paid by Courier (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="e.g. 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Third Row: Settlement Linkage & Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Apply Payment Against Settlement
              </label>
              <select
                value={paySettlementId}
                onChange={(e) => setPaySettlementId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Auto-Apply to Oldest Settlement Due</option>
                {courierUnpaidSettlements.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.settlementNumber} &bull; Due: {formatNPR(s.remainingDue)} ({s.paymentStatus})
                  </option>
                ))}
                <option value="unallocated_credit">Keep as Unallocated Courier Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Reference / Transaction / Cheque No.
              </label>
              <input
                type="text"
                placeholder="e.g. TRX-909281 / Slip #10492"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Deposited in Nabil Bank accounts"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* LIVE SETTLEMENT DUE CALCULATION PREVIEW BOX */}
          {numericAmount > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live Settlement Due Calculation:</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  {paySettlementId === "unallocated_credit"
                    ? "Keep as Unallocated Courier Credit"
                    : paySettlementId
                    ? "Specific Settlement Allocation"
                    : "Auto-Allocating to Oldest Due"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 text-[10px]">Current Courier Due:</span>
                  <div className="font-extrabold text-slate-800 text-sm">
                    {formatNPR(currentCourierDue)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">(-) Payment to Credit:</span>
                  <div className="font-extrabold text-emerald-700 text-sm">
                    - {formatNPR(numericAmount)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px]">Remaining Due After Payment:</span>
                  <div
                    className={`font-black text-sm ${
                      isFullySettled ? "text-emerald-700" : "text-amber-800"
                    }`}
                  >
                    {formatNPR(newProjectedRemainingDue)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                <span className="text-emerald-800 font-medium">
                  {paySettlementId === "unallocated_credit"
                    ? `✓ Rs. ${numericAmount.toLocaleString()} will be credited to courier ledger as unallocated credit.`
                    : isFullySettled
                    ? "✓ Full payment: Courier settlement liability will be completely settled!"
                    : `Partial payment: Remaining Rs. ${newProjectedRemainingDue.toLocaleString()} carried forward.`}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    paySettlementId === "unallocated_credit"
                      ? "bg-blue-600 text-white"
                      : isFullySettled
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {paySettlementId === "unallocated_credit"
                    ? "UNALLOCATED CREDIT"
                    : isFullySettled
                    ? "FULLY SETTLED"
                    : "PARTIALLY PAID"}
                </span>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isRecording || !amount || Number(amount) <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              {isRecording ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Record Payment & Update Settlement Due</span>
            </button>
          </div>
        </form>
      </div>

      {/* COMPLETE PAYMENT HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Payment Transaction History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified record of payouts received from courier partners
            </p>
          </div>

          {/* Date Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "all", label: "All Payments" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "thismonth", label: "This Month" },
              { id: "custom", label: "Custom Date" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  dateFilter === p.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: Courier, Method & Search */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courier, reference, settlement #, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <select
              value={selectedCourierFilter}
              onChange={(e) => setSelectedCourierFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Courier Partners</option>
              {couriers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Payment Methods</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="eSewa">eSewa</option>
              <option value="Khalti">Khalti</option>
              <option value="Cash">Cash Handover</option>
              <option value="Cheque Deposit">Cheque Deposit</option>
              <option value="ConnectIPS">ConnectIPS</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <div className="md:col-span-3 flex items-center space-x-2 pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-semibold">Date Range:</span>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              />
            </div>
          )}
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Courier Partner</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4">Reference / TRX ID</th>
                <th className="py-3 px-4">Settlement Reference</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading payment transactions...</span>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  let methodBadgeColor = "bg-slate-100 text-slate-700";
                  if (p.paymentMethod === "Bank Transfer")
                    methodBadgeColor = "bg-blue-50 text-blue-700 border border-blue-200";
                  else if (p.paymentMethod === "eSewa")
                    methodBadgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                  else if (p.paymentMethod === "Khalti")
                    methodBadgeColor = "bg-purple-50 text-purple-700 border border-purple-200";
                  else if (p.paymentMethod === "Cash")
                    methodBadgeColor = "bg-amber-50 text-amber-800 border border-amber-200";

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {p.paymentDate || formatDate(p.createdAt)}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">{p.courierName}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodBadgeColor}`}
                        >
                          {p.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatNPR(p.amount)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {p.referenceNumber || "-"}
                      </td>

                      <td className="py-3 px-4">
                        {p.settlementId ? (
                          <div>
                            <Link
                              href={`/settlements/${p.settlementId}`}
                              className="font-mono text-xs font-bold text-blue-700 hover:underline inline-flex items-center space-x-1"
                              title="View Settlement Bill Statement"
                            >
                              <span>{p.settlementNumber || p.settlementId}</span>
                              <ExternalLink className="w-3 h-3 text-blue-500" />
                            </Link>
                            {p.unallocatedAmount && p.unallocatedAmount > 0 ? (
                              <span className="block text-[10px] text-amber-700 font-semibold">
                                (+ Rs. {p.unallocatedAmount.toLocaleString()} credit)
                              </span>
                            ) : null}
                          </div>
                        ) : p.allocationMethod === "unallocated_credit" || p.settlementNumber === "Unallocated Credit" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Unallocated Credit
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-400">{p.settlementNumber || "General"}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {p.remarks || "-"}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {p.recordedBy || "Admin"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs text-slate-500 gap-2">
          <div>
            Showing {filteredPayments.length} of {payments.length} payment records
          </div>
          <div>
            Total in View:{" "}
            <strong className="text-emerald-700 font-black text-sm">
              {formatNPR(
                filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
              )}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Loading payment receipts...</span>
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
