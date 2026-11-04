"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  Truck,
  RotateCcw,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calculator,
  User,
} from "lucide-react";
import { formatNPR, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<
    "daily" | "courier" | "settlement" | "returns" | "customer"
  >("daily");

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  function handleDatePreset(preset: string) {
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
    } else {
      setFromDate("");
      setToDate("");
    }
  }

  useEffect(() => {
    fetchReport();
  }, [activeReport, fromDate, toDate, customerSearch]);

  async function fetchReport() {
    setLoading(true);
    try {
      let url = `/api/reports?type=${activeReport}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;
      if (activeReport === "customer" && customerSearch) {
        url += `&search=${encodeURIComponent(customerSearch)}`;
      }

      const res = await fetch(url);
      const d = await res.json();
      setReportData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Business & Financial Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Performance analytics, courier comparison, settlement audit and return cost intelligence
          </p>
        </div>

        <a
          href={`/api/export?type=parcels&fromDate=${fromDate}&toDate=${toDate}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Excel</span>
        </a>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        {[
          { id: "daily", label: "Daily Report", icon: Calendar },
          { id: "courier", label: "Courier Performance", icon: Truck },
          { id: "settlement", label: "Settlement Audit", icon: Calculator },
          { id: "returns", label: "Returns Analysis", icon: RotateCcw },
          { id: "customer", label: "Customer Parcel Search", icon: User },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReport === tab.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Date & Search Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {activeReport === "customer" ? (
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Track by Customer Mobile Number, Name, SKU..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Quick Range:</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleDatePreset("today")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("yesterday")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("last7days")}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Last 7D
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("all")}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 font-medium"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center space-x-1.5 ml-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report 1: Daily Report */}
      {activeReport === "daily" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Parcels</th>
                  <th className="py-3 px-4 text-center">Delivered</th>
                  <th className="py-3 px-4 text-center">Returned</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-right">Total COD</th>
                  <th className="py-3 px-4 text-right">Delivery Charges</th>
                  <th className="py-3 px-4 text-right">Net Receivable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Loading daily report...</span>
                    </td>
                  </tr>
                ) : !reportData?.data || reportData.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No records found for this period.
                    </td>
                  </tr>
                ) : (
                  reportData.data.map((r: any) => (
                    <tr key={r.date} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{r.date}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {r.totalParcels}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {r.delivered}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {r.returned}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {r.pending}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-700">
                        {formatNPR(r.totalCOD)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        {formatNPR(r.deliveryCharges)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                        {formatNPR(r.netReceivable)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Courier Performance */}
      {activeReport === "courier" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Courier Partner</th>
                  <th className="py-3 px-4 text-center">Area</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-center">Delivery Rate</th>
                  <th className="py-3 px-4 text-center">Return Rate</th>
                  <th className="py-3 px-4 text-right">Total COD</th>
                  <th className="py-3 px-4 text-right">Total Charges</th>
                  <th className="py-3 px-4 text-right">Net Receivable</th>
                  <th className="py-3 px-4 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.data?.map((c: any) => (
                  <tr key={c.courierId} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                        {c.serviceArea}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                      {c.totalParcels}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {c.deliveryRate}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                      {c.returnRate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-blue-700">
                      {formatNPR(c.totalCOD)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {formatNPR(c.totalCharges)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                      {formatNPR(c.netReceivable)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-800">
                      {formatNPR(c.outstandingDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Settlement Audit */}
      {activeReport === "settlement" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Settlement ID</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4 text-right">Gross COD</th>
                  <th className="py-3 px-4 text-right">Previous Due</th>
                  <th className="py-3 px-4 text-right">Total Receivable</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Remaining Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.data?.map((s: any) => (
                  <tr key={s._id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                      {s.settlementNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{s.courierName}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatNPR(s.grossCOD)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                      {formatNPR(s.previousDue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-700">
                      {formatNPR(s.totalReceivable)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      {formatNPR(s.totalPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-700">
                      {formatNPR(s.remainingDue)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.paymentStatus === "Paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 4: Returns Analysis */}
      {activeReport === "returns" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-rose-50/40 flex justify-between items-center text-xs">
            <span className="font-bold text-rose-900">
              Total Returns: {reportData?.summary?.count || 0}
            </span>
            <span className="font-bold text-emerald-700">
              No Return Charges (Free Returns)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile (Tracking Ref)</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4 text-right">Lost COD</th>
                  <th className="py-3 px-4">Return Reason / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.data?.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{formatDate(p.returnDate || p.createdAt)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{p.customerName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.mobile}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{p.courierName}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-500">
                      {formatNPR(p.codAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.remarks || "No reason noted"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 5: Customer Parcel Search */}
      {activeReport === "customer" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile (Tracking Ref)</th>
                  <th className="py-3 px-4">Courier</th>
                  <th className="py-3 px-4 text-right">COD</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.data?.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.customerName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.mobile}</td>
                    <td className="py-3.5 px-4 text-slate-700">{p.courierName}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatNPR(p.codAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-4 text-slate-500">{p.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

