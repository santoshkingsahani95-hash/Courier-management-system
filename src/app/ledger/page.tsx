"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Truck,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatNPR, formatDate } from "@/lib/utils";

export default function LedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("all");
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouriers();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedCourierId]);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      setCouriers(d.couriers || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLedger() {
    setLoading(true);
    try {
      let url = "/api/ledger";
      if (selectedCourierId && selectedCourierId !== "all") {
        url += `?courierId=${selectedCourierId}`;
      }
      const res = await fetch(url);
      const d = await res.json();
      setEntries(d.entries || []);
      setSummary(d.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const selectedCourier = couriers.find((c) => c._id === selectedCourierId);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Financial Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accounting-grade double entry audit trail: Debit (Receivables) vs Credit (Charges & Payments)
          </p>
        </div>

        <a
          href={`/api/export?type=ledger&courierId=${selectedCourierId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Ledger Excel</span>
        </a>
      </div>

      {/* Courier Selector & Outstanding Balance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Courier Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-center">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Courier Ledger
          </label>
          <select
            value={selectedCourierId}
            onChange={(e) => setSelectedCourierId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Couriers (Combined Ledger)</option>
            {couriers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Total Debit & Credit Cards */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Debit (COD)</span>
            <div className="text-xl font-extrabold text-blue-600">
              {formatNPR(summary?.totalDebit || 0)}
            </div>
          </div>
          <div className="border-l border-slate-100 pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Total Credit (Paid/Fees)
            </span>
            <div className="text-xl font-extrabold text-emerald-600">
              {formatNPR(summary?.totalCredit || 0)}
            </div>
          </div>
        </div>

        {/* Closing Balance Card with Courier Owes Us / We Owe Courier */}
        <div
          className={`p-4 rounded-xl border shadow-xs flex items-center justify-between ${
            (summary?.closingBalance || 0) > 0
              ? "bg-amber-50/70 border-amber-300 text-amber-900"
              : (summary?.closingBalance || 0) < 0
              ? "bg-purple-50/70 border-purple-300 text-purple-900"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Closing Running Balance
            </span>
            <div className="text-2xl font-extrabold">
              {formatNPR(summary?.closingBalance || 0)}
            </div>
          </div>
          <div className="text-right">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-white shadow-xs">
              {summary?.balanceStatus || "Settled"}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Courier</th>
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Ref ID</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Debit (Owed to Us)</th>
                <th className="py-3 px-4 text-right">Credit (Paid/Charges)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading ledger...</span>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No ledger transactions recorded yet.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {e.transactionDate}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">{e.courierName}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.transactionType === "Payment Received"
                            ? "bg-emerald-100 text-emerald-800"
                            : e.transactionType === "Settlement Finalized"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {e.transactionType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {e.referenceId || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">{e.description}</td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-600">
                      {e.debit > 0 ? formatNPR(e.debit) : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                      {e.credit > 0 ? formatNPR(e.credit) : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-800 text-sm">
                      {formatNPR(e.runningBalance)}
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

