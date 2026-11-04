"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Receipt,
  CreditCard,
  AlertCircle,
  Download,
  PlusCircle,
  Calculator,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Truck,
  ArrowRight,
} from "lucide-react";
import { formatNPR, formatDate, getDateRangePresets } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState("today");
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCourier, setSelectedCourier] = useState("all");

  useEffect(() => {
    fetchCouriers();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [datePreset, fromDate, toDate, selectedCourier]);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      setCouriers(d.couriers || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      let url = `/api/dashboard?courierId=${selectedCourier}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;

      const res = await fetch(url);
      const resData = await res.json();
      setData(resData);
    } catch (e) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  function handlePresetChange(preset: string) {
    setDatePreset(preset);
    if (preset !== "custom") {
      const range = getDateRangePresets(preset);
      setFromDate(range.from);
      setToDate(range.to);
    }
  }

  const s = data?.summary || {
    totalPackages: 0,
    totalCOD: 0,
    deliveredPackages: 0,
    returnedPackages: 0,
    pendingPackages: 0,
    totalDeliveryCharges: 0,
    totalReturnCharges: 0,
    netReceivable: 0,
    amountReceived: 0,
    outstandingDue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Courier Business Summary
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time parcel status, live COD collections, courier charges & dues
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/new-entry"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Bulk Entry</span>
          </Link>

          <Link
            href="/settlements"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>Settle Courier</span>
          </Link>

          <a
            href={`/api/export?type=parcels&fromDate=${fromDate}&toDate=${toDate}&courierId=${selectedCourier}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </a>
        </div>
      </div>

      {/* Date & Courier Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last7days", label: "Last 7 Days" },
            { id: "thismonth", label: "This Month" },
            { id: "custom", label: "Custom Range" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handlePresetChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                datePreset === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {datePreset === "custom" && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-medium text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-medium text-slate-700 focus:outline-none"
              />
            </div>
          )}

          {/* Courier Selector */}
          <select
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Couriers</option>
            {couriers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchDashboardData}
            title="Refresh"
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 10 Core Business Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Packages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Packages
            </span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{s.totalPackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">Entered in period</p>
        </div>

        {/* Total COD Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total COD Amount
            </span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{formatNPR(s.totalCOD)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Booked parcel value</p>
        </div>

        {/* Delivered Packages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Delivered
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{s.deliveredPackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {s.totalPackages > 0
              ? `${Math.round((s.deliveredPackages / s.totalPackages) * 100)}% delivery rate`
              : "0% rate"}
          </p>
        </div>

        {/* Returned Packages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Returned
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">{s.returnedPackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {s.totalPackages > 0
              ? `${Math.round((s.returnedPackages / s.totalPackages) * 100)}% return rate`
              : "0% rate"}
          </p>
        </div>

        {/* Pending Packages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{s.pendingPackages}</div>
          <p className="text-[11px] text-slate-400 mt-1">In transit with couriers</p>
        </div>

        {/* Total Delivery Charges */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Delivery Charges
            </span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {formatNPR(s.totalDeliveryCharges)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">For delivered parcels</p>
        </div>

        {/* Net Receivable from Couriers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-gradient-to-br from-white to-blue-50/50">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Net Receivable
            </span>
            <Calculator className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-700">
            {formatNPR(s.netReceivable)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Delivered COD - Charges</p>
        </div>

        {/* Amount Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Amount Received
            </span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatNPR(s.amountReceived)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Deposited in bank/cash</p>
        </div>

        {/* Outstanding Due */}
        <div className="bg-white p-4 rounded-xl border-2 border-amber-300 shadow-xs bg-amber-50/30">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Outstanding Due
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-800">
            {formatNPR(s.outstandingDue)}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Total couriers owe us</p>
        </div>
      </div>

      {/* Courier-wise Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm">Courier-wise Summary</h2>
          </div>
          <Link
            href="/couriers"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Manage All Couriers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Courier Name</th>
                <th className="py-3 px-4 text-center">Service Area</th>
                <th className="py-3 px-4 text-right">Parcels</th>
                <th className="py-3 px-4 text-right">Total COD</th>
                <th className="py-3 px-4 text-right">Charges</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.courierSummary && data.courierSummary.length > 0 ? (
                data.courierSummary.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/couriers/${c.id}`}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                      >
                        <span>{c.name}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {c.deliveredCount} Delivered &bull; {c.returnedCount} Returned &bull;{" "}
                        {c.pendingCount} Pending
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {c.serviceArea}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {c.parcelsCount}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatNPR(c.totalCOD)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      {formatNPR(c.charges)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatNPR(c.received)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                      {formatNPR(c.due)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/settlements?courierId=${c.id}`}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[11px] font-semibold transition-colors"
                      >
                        Settle
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No courier data available for this range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

