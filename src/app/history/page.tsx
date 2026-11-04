"use client";

import { useState, useEffect, useMemo } from "react";
import {
  History,
  Layers,
  Calendar,
  Truck,
  Eye,
  Printer,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";

interface BatchItem {
  _id: string;
  batchNumber: string;
  courierId: string;
  courierName: string;
  batchDate: string;
  totalPackages: number;
  totalCOD: number;
  deliveredCount?: number;
  returnedCount?: number;
  pendingCount?: number;
  settlementStatus?: "Unsettled" | "Partially Settled" | "Settled";
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ParcelDetail {
  _id: string;
  batchId?: string;
  batchNumber?: string;
  courierId: string;
  courierName: string;
  customerName: string;
  mobile: string;
  trackingId?: string;
  sku?: string;
  deliveryArea?: string;
  codAmount: number;
  deliveryCharge?: number;
  status: "Pending" | "Delivered" | "Returned" | "Cancelled";
  settlementStatus?: "Unsettled" | "Settled";
  returnReason?: string;
  customReason?: string;
  returnDate?: string;
  returnedBy?: string;
  remarks?: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "returned" | "unsettled" | "settled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "last7days" | "custom">("all");
  const [customFromDate, setCustomFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Selected Batch Details Modal
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [batchParcels, setBatchParcels] = useState<ParcelDetail[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailParcelFilter, setDetailParcelFilter] = useState<"all" | "Returned" | "Delivered" | "Pending">("all");
  const [detailSearch, setDetailSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [batchesRes, couriersRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/couriers"),
      ]);
      const batchesData = await batchesRes.json();
      const couriersData = await couriersRes.json();

      setBatches(batchesData.batches || []);
      setCouriers(couriersData.couriers || []);
    } catch (e) {
      console.error("Failed to load history data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function openBatchDetail(batchId: string) {
    setLoadingDetail(true);
    setDetailParcelFilter("all");
    setDetailSearch("");
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      setSelectedBatch(data.batch);
      setBatchParcels(data.parcels || []);
    } catch (e) {
      console.error("Failed to fetch batch details:", e);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const past7 = new Date();
    past7.setDate(past7.getDate() - 6);
    const past7Str = past7.toISOString().split("T")[0];

    return batches.filter((b) => {
      // 1. Status Filter Tab
      if (activeTab === "returned" && (b.returnedCount || 0) === 0) return false;
      if (activeTab === "unsettled" && b.settlementStatus === "Settled") return false;
      if (activeTab === "settled" && b.settlementStatus !== "Settled") return false;

      // 2. Courier Filter
      if (selectedCourierId !== "all" && b.courierId !== selectedCourierId) return false;

      // 3. Date Filter
      const bDate = b.batchDate || (b.createdAt || "").split("T")[0];
      if (dateFilter === "today" && bDate !== todayStr) return false;
      if (dateFilter === "yesterday" && bDate !== yesterdayStr) return false;
      if (dateFilter === "last7days" && bDate < past7Str) return false;
      if (dateFilter === "custom") {
        if (customFromDate && bDate < customFromDate) return false;
        if (customToDate && bDate > customToDate) return false;
      }

      // 4. Search Query (Batch # or Courier name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBatch = b.batchNumber.toLowerCase().includes(q);
        const matchCourier = (b.courierName || "").toLowerCase().includes(q);
        const matchNotes = (b.notes || "").toLowerCase().includes(q);
        if (!matchBatch && !matchCourier && !matchNotes) return false;
      }

      return true;
    });
  }, [batches, activeTab, selectedCourierId, dateFilter, customFromDate, customToDate, searchQuery]);

  // High-level Metrics
  const summaryMetrics = useMemo(() => {
    const totalBatches = batches.length;
    const totalHandedOver = batches.reduce((sum, b) => sum + (b.totalPackages || 0), 0);
    const totalDelivered = batches.reduce((sum, b) => sum + (b.deliveredCount || 0), 0);
    const totalReturned = batches.reduce((sum, b) => sum + (b.returnedCount || 0), 0);
    const totalPending = batches.reduce((sum, b) => sum + (b.pendingCount || 0), 0);
    const totalCOD = batches.reduce((sum, b) => sum + (b.totalCOD || 0), 0);
    const settledBatchesCount = batches.filter((b) => b.settlementStatus === "Settled").length;

    return {
      totalBatches,
      totalHandedOver,
      totalDelivered,
      totalReturned,
      totalPending,
      totalCOD,
      settledBatchesCount,
    };
  }, [batches]);

  // Filtered parcels within active detail modal
  const filteredDetailParcels = useMemo(() => {
    return batchParcels.filter((p) => {
      if (detailParcelFilter !== "all" && p.status !== detailParcelFilter) return false;
      if (detailSearch.trim()) {
        const q = detailSearch.toLowerCase().trim();
        const matchName = (p.customerName || "").toLowerCase().includes(q);
        const matchPhone = (p.mobile || "").includes(q);
        const matchTracking = (p.trackingId || "").toLowerCase().includes(q);
        const matchSku = (p.sku || "").toLowerCase().includes(q);
        const matchReason = (p.returnReason || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTracking && !matchSku && !matchReason) return false;
      }
      return true;
    });
  }, [batchParcels, detailParcelFilter, detailSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Batch & Handover History
            </h1>
            <p className="text-xs text-slate-500">
              Audit trail of all courier handover batches, reconciliation counts, and return tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <a
            href="/api/export?type=batches"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Batches</span>
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Batches</span>
          <div className="text-xl font-black text-slate-900 mt-1">{summaryMetrics.totalBatches}</div>
          <span className="text-[10px] text-slate-400">Recorded Dispatches</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Handed Over</span>
          <div className="text-xl font-black text-blue-700 mt-1">{summaryMetrics.totalHandedOver}</div>
          <span className="text-[10px] text-slate-400">Total parcels dispatched</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Delivered / Payable</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{summaryMetrics.totalDelivered}</div>
          <span className="text-[10px] text-emerald-600/70 font-semibold">Ready for Settlement</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Returned</span>
          <div className="text-xl font-black text-rose-700 mt-1">{summaryMetrics.totalReturned}</div>
          <span className="text-[10px] text-rose-600/80 font-bold">Deducted from due</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Settled Batches</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summaryMetrics.settledBatchesCount} / {summaryMetrics.totalBatches}
          </div>
          <span className="text-[10px] text-slate-400">Fully closed</span>
        </div>
      </div>

      {/* FILTER TABS & TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex space-x-1">
            {[
              { id: "all", label: "All Batches", count: batches.length },
              {
                id: "returned",
                label: "Returned Batches",
                count: batches.filter((b) => (b.returnedCount || 0) > 0).length,
                badgeColor: "bg-rose-100 text-rose-700 font-bold",
              },
              {
                id: "unsettled",
                label: "Unsettled Batches",
                count: batches.filter((b) => b.settlementStatus !== "Settled").length,
              },
              {
                id: "settled",
                label: "Settled Batches",
                count: batches.filter((b) => b.settlementStatus === "Settled").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    tab.badgeColor || (activeTab === tab.id ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600")
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1 pb-2 sm:pb-0 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7days", label: "7 Days" },
              { id: "custom", label: "Custom" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                  dateFilter === d.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Selector Toolbar */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Mobile Number, Customer, Batch #, or Courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Courier Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer w-full"
              >
                <option value="all">All Courier Partners</option>
                {couriers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.serviceArea})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Custom Date Pickers */}
            {dateFilter === "custom" && (
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* BATCHES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Batch #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Courier</th>
                <th className="py-3 px-3 text-center">Handed Over</th>
                <th className="py-3 px-3 text-center">Delivered</th>
                <th className="py-3 px-3 text-center">Returned</th>
                <th className="py-3 px-4 text-right">Total COD</th>
                <th className="py-3 px-4 text-center">Settlement Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading batch history...</span>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600">No batches matching your filters</p>
                    <p className="text-[11px] mt-1 text-slate-400">Try adjusting your search query, courier or date filter.</p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const hasReturns = (b.returnedCount || 0) > 0;
                  const isSettled = b.settlementStatus === "Settled";
                  const isPartiallySettled = b.settlementStatus === "Partially Settled";

                  return (
                    <tr
                      key={b._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasReturns ? "bg-rose-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {b.batchNumber}
                        {b.notes && (
                          <div className="text-[10px] font-normal text-slate-400 truncate max-w-xs">
                            {b.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(b.batchDate || b.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{b.courierName}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100 font-mono">
                          {b.totalPackages}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-emerald-700 font-mono">
                          {b.deliveredCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hasReturns ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 font-mono border border-rose-200">
                            {b.returnedCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                        {formatNPR(b.totalCOD || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                            isSettled
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isPartiallySettled
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {b.settlementStatus || "Unsettled"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => openBatchDetail(b._id)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-800">{filteredBatches.length}</strong> of{" "}
            <strong>{batches.length}</strong> total batches
          </div>
          <div className="flex items-center space-x-3">
            <span>
              Total Handed Over:{" "}
              <strong className="text-blue-700 font-bold">
                {filteredBatches.reduce((sum, b) => sum + (b.totalPackages || 0), 0)} parcels
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Total Returns:{" "}
              <strong className="text-rose-700 font-bold">
                {filteredBatches.reduce((sum, b) => sum + (b.returnedCount || 0), 0)} parcels
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BATCH DETAIL MODAL / AUDIT TRAIL VIEW                                     */}
      {/* ========================================================================= */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {selectedBatch.batchNumber}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        selectedBatch.settlementStatus === "Settled"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : selectedBatch.settlementStatus === "Partially Settled"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {selectedBatch.settlementStatus || "Unsettled"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                    <span>
                      Courier: <strong className="text-slate-800">{selectedBatch.courierName}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>Handover Date: {formatDate(selectedBatch.batchDate || selectedBatch.createdAt)}</span>
                    {selectedBatch.createdBy && (
                      <>
                        <span>&bull;</span>
                        <span>Created By: {selectedBatch.createdBy}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Batch</span>
                </button>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reconciliation Formula Bar */}
            <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center flex-wrap gap-2 text-slate-700">
                <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Reconciliation:
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-blue-200 font-bold text-blue-900">
                  Total Handed Over: {selectedBatch.totalPackages}
                </span>
                <span>=</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
                  Delivered: {selectedBatch.deliveredCount || 0}
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 font-extrabold text-rose-800">
                  Returned: {selectedBatch.returnedCount || 0}
                </span>
              </div>

              <div className="text-xs">
                Total Batch COD:{" "}
                <strong className="text-slate-900 font-black text-sm">
                  {formatNPR(selectedBatch.totalCOD || 0)}
                </strong>
              </div>
            </div>

            {/* In-Batch Filter & Search Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center space-x-1 w-full sm:w-auto">
                {[
                  { id: "all", label: "All Parcels", count: batchParcels.length },
                  {
                    id: "Returned",
                    label: "Returned",
                    count: batchParcels.filter((p) => p.status === "Returned").length,
                    badge: "bg-rose-100 text-rose-700 font-bold",
                  },
                  {
                    id: "Delivered",
                    label: "Delivered",
                    count: batchParcels.filter((p) => p.status !== "Returned").length,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDetailParcelFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 ${
                      detailParcelFilter === f.id
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1 rounded ${f.badge || "bg-slate-200/60"}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Mobile Number, Customer, SKU..."
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Parcels Table with RED HIGHLIGHTING FOR RETURNED PARCELS */}
            <div className="overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <span>Loading parcels...</span>
                </div>
              ) : filteredDetailParcels.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No parcels matching your criteria in this batch.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">SKU / Item</th>
                      <th className="py-2.5 px-3">Area / Tracking</th>
                      <th className="py-2.5 px-3 text-right">COD (Rs.)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4">Return Reason / Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDetailParcels.map((p, idx) => {
                      const isReturned = p.status === "Returned";
                      const isDelivered = p.status === "Delivered";

                      return (
                        <tr
                          key={p._id}
                          className={`transition-colors ${
                            isReturned
                              ? "bg-red-50/90 border-l-4 border-l-red-500 text-red-950 font-medium"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td
                            className={`py-2 px-3 font-mono text-[11px] ${
                              isReturned ? "text-red-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-bold">
                            <span className={isReturned ? "text-red-950" : "text-slate-900"}>
                              {p.customerName}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-3 font-mono ${
                              isReturned ? "text-red-900" : "text-slate-600"
                            }`}
                          >
                            {p.mobile || "-"}
                          </td>
                          <td
                            className={`py-2 px-3 font-mono text-[11px] ${
                              isReturned ? "text-red-800" : "text-slate-500"
                            }`}
                          >
                            {p.sku || "-"}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {p.trackingId && (
                              <div className="font-mono text-[10px] text-blue-600">{p.trackingId}</div>
                            )}
                            <div className="text-[11px]">{p.deliveryArea || "Inside Valley"}</div>
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-black font-mono whitespace-nowrap ${
                              isReturned ? "text-red-700" : "text-slate-900"
                            }`}
                          >
                            {formatNPR(p.codAmount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isReturned ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shadow-xs">
                                RETURNED
                              </span>
                            ) : isDelivered ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                                DELIVERED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {isReturned ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-red-700 flex items-center space-x-1">
                                  <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                                  <span>{p.returnReason || p.remarks || "Customer refused parcel"}</span>
                                </div>
                                <div className="text-[10px] text-red-800/80 font-mono">
                                  {p.returnDate && `Returned on: ${formatDate(p.returnDate)}`}
                                  {p.returnedBy && ` • Logged by: ${p.returnedBy}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">{p.remarks || "-"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
              <div>
                Showing {filteredDetailParcels.length} of {batchParcels.length} parcels in batch
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors"
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

