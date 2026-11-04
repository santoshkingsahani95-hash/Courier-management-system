"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Calendar,
  Truck,
  PlusCircle,
  Eye,
  Printer,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Phone,
  ArrowRight,
  RotateCcw,
  Trash2,
  Pencil,
  ShieldAlert,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";

export default function BatchesPage() {
  const { user, role, isAdminOrManager, isStaff } = useUserRole();
  const [batches, setBatches] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customFromDate, setCustomFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Active Batch modal & parcel entries
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [batchParcels, setBatchParcels] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [parcelSearch, setParcelSearch] = useState("");
  const [parcelStatusFilter, setParcelStatusFilter] = useState("all");

  // Multi-select inside batch
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [bulkStatusToApply, setBulkStatusToApply] = useState<"Delivered" | "Returned" | "Pending">("Delivered");

  // Edit states for Admin & Manager
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [editingParcel, setEditingParcel] = useState<any | null>(null);

  // Delete Batch - Admin & Manager only
  async function handleDeleteBatch(batchId: string, batchNumber: string) {
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can delete batches.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete Batch ${batchNumber}?\n\nThis will permanently delete the batch and all its parcel handover records.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
      if (res.ok) {
        setBatches((prev) => prev.filter((b) => b._id !== batchId));
        if (selectedBatch?._id === batchId) {
          setSelectedBatch(null);
        }
        alert(`Batch ${batchNumber} deleted successfully.`);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete batch");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete batch");
    }
  }

  // Delete Parcel - Admin & Manager only
  async function handleDeleteParcel(parcelId: string, customerName: string) {
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can delete parcels.");
      return;
    }
    if (!confirm(`Are you sure you want to delete parcel entry for "${customerName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/parcels?id=${parcelId}`, { method: "DELETE" });
      if (res.ok) {
        setBatchParcels((prev) => prev.filter((p) => p._id !== parcelId));
        fetchBatches();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete parcel");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete parcel");
    }
  }

  // Save edited parcel - Admin & Manager only
  async function handleSaveEditedParcel() {
    if (!editingParcel) return;
    try {
      const res = await fetch("/api/parcels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingParcel),
      });
      if (res.ok) {
        setBatchParcels((prev) =>
          prev.map((p) => (p._id === editingParcel._id ? { ...p, ...editingParcel } : p))
        );
        setEditingParcel(null);
        fetchBatches();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update parcel");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update parcel");
    }
  }

  // Save edited batch - Admin & Manager only
  async function handleSaveEditedBatch() {
    if (!editingBatch) return;
    try {
      const res = await fetch(`/api/batches/${editingBatch._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBatch),
      });
      if (res.ok) {
        setBatches((prev) =>
          prev.map((b) => (b._id === editingBatch._id ? { ...b, ...editingBatch } : b))
        );
        if (selectedBatch?._id === editingBatch._id) {
          setSelectedBatch({ ...selectedBatch, ...editingBatch });
        }
        setEditingBatch(null);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update batch");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update batch");
    }
  }

  useEffect(() => {
    fetchBatches();
    fetchCouriers();
  }, []);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      setCouriers(d.couriers || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await fetch("/api/batches");
      const d = await res.json();
      setBatches(d.batches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function openBatchDetail(id: string) {
    setLoadingDetail(true);
    setSelectedParcelIds([]);
    try {
      const res = await fetch(`/api/batches/${id}`);
      const d = await res.json();
      setSelectedBatch(d.batch);
      setBatchParcels(d.parcels || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Update individual parcel status
  async function handleUpdateSingleParcelStatus(parcelId: string, newStatus: string) {
    const todayStr = new Date().toISOString().split("T")[0];
    const updates: any = { status: newStatus };
    if (newStatus === "Delivered") {
      updates.deliveryDate = todayStr;
    } else if (newStatus === "Returned") {
      updates.returnDate = todayStr;
    }

    try {
      const res = await fetch("/api/parcels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: parcelId, ...updates }),
      });
      if (res.ok) {
        // Update local state
        setBatchParcels((prev) =>
          prev.map((p) => (p._id === parcelId ? { ...p, ...updates } : p))
        );
        // Refresh batches list counts
        fetchBatches();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Bulk update selected parcels in batch
  async function handleApplyBulkStatus(targetStatus?: "Delivered" | "Returned" | "Pending") {
    const status = targetStatus || bulkStatusToApply;
    if (selectedParcelIds.length === 0) {
      alert("Please select at least one parcel using the checkboxes.");
      return;
    }

    setIsUpdatingBulk(true);
    const todayStr = new Date().toISOString().split("T")[0];
    const updates: any = { status };
    if (status === "Delivered") {
      updates.deliveryDate = todayStr;
    } else if (status === "Returned") {
      updates.returnDate = todayStr;
    }

    try {
      const res = await fetch("/api/parcels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcelIds: selectedParcelIds,
          updates,
        }),
      });

      if (res.ok) {
        // Update local parcels
        setBatchParcels((prev) =>
          prev.map((p) => (selectedParcelIds.includes(p._id) ? { ...p, ...updates } : p))
        );
        setSelectedParcelIds([]);
        fetchBatches();
        // Update batch counts locally if selectedBatch is active
        if (selectedBatch) {
          const updatedParcels = batchParcels.map((p) =>
            selectedParcelIds.includes(p._id) ? { ...p, ...updates } : p
          );
          setSelectedBatch({
            ...selectedBatch,
            deliveredCount: updatedParcels.filter((p) => p.status === "Delivered").length,
            returnedCount: updatedParcels.filter((p) => p.status === "Returned").length,
            pendingCount: updatedParcels.filter((p) => p.status === "Pending").length,
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingBulk(false);
    }
  }

  function handleSelectAllParcels() {
    if (selectedParcelIds.length === filteredBatchParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(filteredBatchParcels.map((p) => p._id));
    }
  }

  function handleToggleParcelSelect(id: string) {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handlePrintHandover() {
    window.print();
  }

  // Filter calculation for Batches
  const filteredBatches = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];

    return batches.filter((b) => {
      // 1. Date Filter
      const batchDate = b.batchDate || (b.createdAt || "").split("T")[0];
      if (dateFilter === "today" && batchDate !== todayStr) {
        return false;
      }
      if (dateFilter === "yesterday" && batchDate !== yesterdayStr) {
        return false;
      }
      if (dateFilter === "custom") {
        if (customFromDate && batchDate < customFromDate) return false;
        if (customToDate && batchDate > customToDate) return false;
      }

      // 2. Courier Filter
      if (selectedCourierId !== "all" && b.courierId !== selectedCourierId) {
        return false;
      }

      // 3. Status Filter
      const total = b.totalPackages || 0;
      const delivered = b.deliveredCount || 0;
      const pending = b.pendingCount ?? (total - delivered - (b.returnedCount || 0));

      let overallStatus = "Pending";
      if (total > 0 && delivered === total) {
        overallStatus = "Delivered";
      } else if (delivered > 0 || b.returnedCount > 0) {
        overallStatus = "Partially Delivered";
      }

      if (selectedStatus === "Delivered" && overallStatus !== "Delivered") return false;
      if (selectedStatus === "Pending" && overallStatus !== "Pending") return false;
      if (selectedStatus === "Partially Delivered" && overallStatus !== "Partially Delivered") return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = (b.batchNumber || "").toLowerCase().includes(q);
        const courierMatch = (b.courierName || "").toLowerCase().includes(q);
        const notesMatch = (b.notes || "").toLowerCase().includes(q);
        if (!numMatch && !courierMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [batches, dateFilter, customFromDate, customToDate, selectedCourierId, selectedStatus, searchQuery]);

  // Overall KPI stats
  const totalPackagesAcross = filteredBatches.reduce((sum, b) => sum + (b.totalPackages || 0), 0);
  const totalCODAcross = filteredBatches.reduce((sum, b) => sum + (b.totalCOD || 0), 0);
  const deliveredBatchesCount = filteredBatches.filter(
    (b) => b.totalPackages > 0 && b.deliveredCount === b.totalPackages
  ).length;
  const pendingBatchesCount = filteredBatches.filter(
    (b) => !b.deliveredCount || b.deliveredCount === 0
  ).length;

  // Filter parcels within selected batch
  const filteredBatchParcels = useMemo(() => {
    return batchParcels.filter((p) => {
      if (parcelStatusFilter !== "all" && p.status?.toLowerCase() !== parcelStatusFilter.toLowerCase()) {
        return false;
      }
      if (parcelSearch.trim()) {
        const q = parcelSearch.toLowerCase().trim();
        const matchName = (p.customerName || "").toLowerCase().includes(q);
        const matchPhone = (p.mobile || "").includes(q);
        const matchTracking = (p.trackingId || "").toLowerCase().includes(q);
        const matchSku = (p.sku || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTracking && !matchSku) return false;
      }
      return true;
    });
  }, [batchParcels, parcelStatusFilter, parcelSearch]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Dispatch Batches
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch records of 100+ packages handed over to couriers. Track delivery statuses, open batches to inspect entries & update deliveries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchBatches}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
            title="Refresh batches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/new-entry"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Batch</span>
          </Link>
        </div>
      </div>

      {/* Quick Date Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Filter:</span>
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateFilter === "all"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Batches
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("today")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateFilter === "today"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("yesterday")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateFilter === "yesterday"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("custom")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateFilter === "custom"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Choose Date
              </button>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 font-bold">{filteredBatches.length}</strong> batches &bull;{" "}
            <strong className="text-blue-700 font-bold">{totalPackagesAcross}</strong> packages &bull;{" "}
            <strong className="text-slate-900 font-bold">{formatNPR(totalCODAcross)}</strong> COD
          </div>
        </div>

        {/* Custom Date Pickers when 'Choose Date' is active */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs bg-slate-50 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-600">Select Date Range:</span>
            <div className="flex items-center space-x-2">
              <label className="text-slate-500 text-[11px]">From:</label>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-slate-500 text-[11px]">To:</label>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Dropdown Filters & Search Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Mobile Number, Batch ID, Courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Courier Filter */}
          <div>
            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Couriers</option>
              {couriers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.serviceArea})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Batch Statuses</option>
              <option value="Delivered">Delivered (100% Completed)</option>
              <option value="Pending">Pending (Not Started)</option>
              <option value="Partially Delivered">Partially Delivered (In Progress)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Dispatch Date</th>
                <th className="py-3 px-4">Courier Partner</th>
                <th className="py-3 px-4 text-right">Packages</th>
                <th className="py-3 px-4 text-right">Total COD</th>
                <th className="py-3 px-4 text-center">Batch Status</th>
                <th className="py-3 px-4 text-center">Progress</th>
                <th className="py-3 px-4">Created By</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Loading courier batches...</span>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No batches match the selected date or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const total = b.totalPackages || 0;
                  const returned = b.returnedCount || 0;
                  const delivered = b.deliveredCount ?? (total - returned);

                  let statusBadge = (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready for Settlement</span>
                    </span>
                  );

                  if (b.settlementStatus === "Settled") {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settled</span>
                      </span>
                    );
                  } else if (returned > 0) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <RotateCcw className="w-3 h-3" />
                        <span>Returns Recorded</span>
                      </span>
                    );
                  }

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <button
                          onClick={() => openBatchDetail(b._id)}
                          className="hover:underline flex items-center space-x-1 text-left"
                          title="Open batch to see all parcel entries"
                        >
                          <span>{b.batchNumber}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">{b.batchDate}</td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.courierName}</span>
                        </div>
                        {b.notes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal truncate max-w-xs">
                            {b.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                        {total}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-blue-600">
                        {formatNPR(b.totalCOD)}
                      </td>

                      {/* Prominent Status Badge */}
                      <td className="py-3.5 px-4 text-center">{statusBadge}</td>

                      {/* Status breakdown pills */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center space-x-1.5 text-[10px] font-semibold">
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                            {delivered} del
                          </span>
                          {returned > 0 && (
                            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-mono font-bold">
                              {returned} ret
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div>{b.createdBy}</div>
                        <div className="text-[9px] text-slate-400">
                          {formatDateTime(b.createdAt)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => openBatchDetail(b._id)}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-bold transition-colors inline-flex items-center space-x-1"
                            title="Open batch entries and update deliveries"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open ({total})</span>
                          </button>

                          <a
                            href={`/api/export?type=batch&id=${b._id}`}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors"
                            title="Download Batch in Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </a>

                          {isAdminOrManager && (
                            <>
                              <button
                                onClick={() =>
                                  setEditingBatch({
                                    _id: b._id,
                                    batchNumber: b.batchNumber,
                                    batchDate: b.batchDate,
                                    notes: b.notes || "",
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit Batch Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteBatch(b._id, b.batchNumber)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete Batch (Admin & Manager)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL BATCH DETAIL MODAL WITH ALL PARCEL ENTRIES & STATUS UPDATES */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-extrabold text-blue-700">
                    {selectedBatch.batchNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    Courier Dispatch Manifest
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Courier: <strong className="text-slate-800">{selectedBatch.courierName}</strong>{" "}
                  &bull; Dispatch Date:{" "}
                  <strong className="text-slate-800">{selectedBatch.batchDate}</strong> &bull; Total
                  Parcels: <strong>{selectedBatch.totalPackages}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/export?type=batch&id=${selectedBatch._id}`}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to Excel</span>
                </a>

                <button
                  onClick={handlePrintHandover}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>

                {isAdminOrManager && (
                  <>
                    <button
                      onClick={() =>
                        setEditingBatch({
                          _id: selectedBatch._id,
                          batchNumber: selectedBatch.batchNumber,
                          batchDate: selectedBatch.batchDate,
                          notes: selectedBatch.notes || "",
                        })
                      }
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-blue-200"
                      title="Edit Batch Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Batch</span>
                    </button>

                    <button
                      onClick={() => handleDeleteBatch(selectedBatch._id, selectedBatch.batchNumber)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-rose-200"
                      title="Delete this batch and all entries"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Batch</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Packages</div>
                <div className="text-xl font-extrabold text-slate-900">
                  {selectedBatch.totalPackages}
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="text-[10px] uppercase font-bold text-blue-600">Total COD Amount</div>
                <div className="text-xl font-extrabold text-blue-700">
                  {formatNPR(selectedBatch.totalCOD)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-emerald-600">
                  Delivered Parcels
                </div>
                <div className="text-xl font-extrabold text-emerald-700">
                  {selectedBatch.deliveredCount || 0}
                </div>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="text-[10px] uppercase font-bold text-amber-600">
                  Pending Parcels
                </div>
                <div className="text-xl font-extrabold text-amber-700">
                  {selectedBatch.pendingCount ??
                    (selectedBatch.totalPackages -
                      (selectedBatch.deliveredCount || 0) -
                      (selectedBatch.returnedCount || 0))}
                </div>
              </div>
            </div>

            {/* In-batch Filters & Bulk Action Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Search within batch */}
                <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer, mobile number, SKU..."
                    value={parcelSearch}
                    onChange={(e) => setParcelSearch(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium"
                  />
                </div>

                {/* Status filter within batch */}
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-slate-400">Filter:</span>
                  {["all", "Delivered", "Returned", "Pending"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setParcelStatusFilter(s)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        parcelStatusFilter === s
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Update Controls */}
              {selectedParcelIds.length > 0 && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-blue-700">
                    {selectedParcelIds.length} parcel(s) selected:
                  </span>
                  {isAdminOrManager ? (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleApplyBulkStatus("Delivered")}
                        disabled={isUpdatingBulk}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark Delivered</span>
                      </button>
                      <button
                        onClick={() => handleApplyBulkStatus("Returned")}
                        disabled={isUpdatingBulk}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Mark Returned</span>
                      </button>
                      <button
                        onClick={() => handleApplyBulkStatus("Pending")}
                        disabled={isUpdatingBulk}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] flex items-center space-x-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Mark Pending</span>
                      </button>
                      <button
                        onClick={() => setSelectedParcelIds([])}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Deselect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                        Bulk status change restricted to Admin & Manager
                      </span>
                      <button
                        onClick={() => setSelectedParcelIds([])}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Deselect
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Parcels in Batch Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 sticky top-0 text-slate-600 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <button
                        onClick={handleSelectAllParcels}
                        className="text-slate-500 hover:text-slate-800 flex items-center"
                        title="Select All"
                      >
                        {selectedParcelIds.length > 0 &&
                        selectedParcelIds.length === filteredBatchParcels.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-2">S.N.</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile (Tracking Ref)</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3 text-right">COD</th>
                    <th className="py-2.5 px-3 text-right">Charge</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Remarks</th>
                    {isAdminOrManager && <th className="py-2.5 px-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatchParcels.map((p, idx) => {
                    const isSelected = selectedParcelIds.includes(p._id);

                    return (
                      <tr
                        key={p._id}
                        className={`hover:bg-slate-50 ${isSelected ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleToggleParcelSelect(p._id)}
                            className="text-slate-500 hover:text-slate-800 flex items-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.customerName}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{p.mobile}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                          {p.sku || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{p.serviceArea}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                          {formatNPR(p.codAmount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {p.status === "Returned"
                            ? "Rs. 0"
                            : formatNPR(p.actualDeliveryCharge ?? p.deliveryCharge ?? 0)}
                        </td>

                        {/* Interactive Status Selector for Admin/Manager or Readonly Badge for Staff */}
                        <td className="py-2 px-3 text-center">
                          {isAdminOrManager ? (
                            <select
                              value={p.status}
                              onChange={(e) => handleUpdateSingleParcelStatus(p._id, e.target.value)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border focus:outline-none ${
                                p.status === "Delivered"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : p.status === "Returned"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Returned">Returned</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block ${
                                p.status === "Delivered"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : p.status === "Returned"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {p.status}
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-slate-400 text-[10px]">
                          {p.deliveryDate || p.returnDate || "-"}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {p.remarks || "-"}
                        </td>

                        {isAdminOrManager && (
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setEditingParcel({ ...p })}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Parcel Details"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteParcel(p._id, p.customerName)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete Parcel Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Handover Signatures footer for printing */}
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
              <div>
                Showing {filteredBatchParcels.length} of {batchParcels.length} parcel entries in this batch
                {!isAdminOrManager && (
                  <span className="ml-2 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                    Staff View: Edit/Delete disabled
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL (Admin & Manager) */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Edit Batch {editingBatch.batchNumber}
              </h3>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Batch Date</label>
                <input
                  type="date"
                  value={editingBatch.batchDate}
                  onChange={(e) =>
                    setEditingBatch({ ...editingBatch, batchDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Notes / Remarks</label>
                <textarea
                  value={editingBatch.notes || ""}
                  onChange={(e) =>
                    setEditingBatch({ ...editingBatch, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="Additional dispatch notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingBatch(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedBatch}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARCEL MODAL (Admin & Manager) */}
      {editingParcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Edit Parcel Entry ({editingParcel.customerName})
              </h3>
              <button
                onClick={() => setEditingParcel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editingParcel.customerName}
                  onChange={(e) =>
                    setEditingParcel({ ...editingParcel, customerName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editingParcel.mobile}
                  onChange={(e) =>
                    setEditingParcel({ ...editingParcel, mobile: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">COD Amount (Rs.)</label>
                <input
                  type="number"
                  value={editingParcel.codAmount}
                  onChange={(e) =>
                    setEditingParcel({
                      ...editingParcel,
                      codAmount: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Delivery Charge</label>
                <input
                  type="number"
                  value={editingParcel.deliveryCharge ?? 0}
                  onChange={(e) =>
                    setEditingParcel({
                      ...editingParcel,
                      deliveryCharge: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Tracking ID</label>
                <input
                  type="text"
                  value={editingParcel.trackingId || ""}
                  onChange={(e) =>
                    setEditingParcel({ ...editingParcel, trackingId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">SKU / Item</label>
                <input
                  type="text"
                  value={editingParcel.sku || ""}
                  onChange={(e) =>
                    setEditingParcel({ ...editingParcel, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-600 font-bold mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingParcel.remarks || ""}
                  onChange={(e) =>
                    setEditingParcel({ ...editingParcel, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingParcel(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedParcel}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
