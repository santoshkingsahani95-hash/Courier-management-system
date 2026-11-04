"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  Truck,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  X,
  Undo2,
  ChevronDown,
  Trash2,
  Calendar,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { formatNPR, formatDate } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";

const RETURN_REASONS = [
  "Customer unavailable",
  "Wrong address",
  "Customer refused parcel",
  "Customer phone switched off",
  "Delivery unsuccessful",
  "Other",
];

const DEFAULT_COURIER_LIST = [
  { _id: "c-001", name: "Google Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 70 },
  { _id: "c-002", name: "KDM Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-003", name: "SP Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-004", name: "Nepal Can Move", serviceArea: "Outside Valley", defaultDeliveryCharge: 250 },
];

interface ReturnModalRow {
  id: string;
  customerName: string;
  mobile: string;
  sku: string;
  codAmount: number | "";
  remarks: string;
}

export default function ReturnsPage() {
  const { user, role, isAdminOrManager, isStaff } = useUserRole();
  const [couriers, setCouriers] = useState<any[]>(DEFAULT_COURIER_LIST);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("c-001");
  const [loadingData, setLoadingData] = useState(true);

  // Return inward data
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [pendingParcels, setPendingParcels] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalReturnedCount: 0,
    totalReturnedCOD: 0,
    todayReturnsCount: 0,
    todayReturnedCOD: 0,
  });

  // Search & Selection for pending parcels
  const [pendingSearch, setPendingSearch] = useState("");
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Confirm Return Modal (for marking pending parcel(s) as returned with mandatory reason)
  const [showConfirmReturnModal, setShowConfirmReturnModal] = useState(false);
  const [targetParcelsToReturn, setTargetParcelsToReturn] = useState<any[]>([]);
  const [actionReturnReason, setActionReturnReason] = useState("Customer refused parcel");
  const [actionCustomReason, setActionCustomReason] = useState("");
  const [actionReturnDate, setActionReturnDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Quick inline return toggle & form
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineMobile, setInlineMobile] = useState("");
  const [inlineCOD, setInlineCOD] = useState<number | "">("");
  const [inlineSKU, setInlineSKU] = useState("");

  // Comprehensive "Add Returns Entry" Modal Dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalCourierId, setModalCourierId] = useState("c-001");
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [modalReason, setModalReason] = useState("Customer refused parcel");
  const [modalCustomReason, setModalCustomReason] = useState("");
  const [modalRows, setModalRows] = useState<ReturnModalRow[]>([
    { id: "row-1", customerName: "", mobile: "", sku: "", codAmount: "", remarks: "" },
  ]);

  // History filtering
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "last7days" | "custom">("all");
  const [customFromDate, setCustomFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyCourierId, setHistoryCourierId] = useState("all");

  useEffect(() => {
    fetchCouriers();
    fetchReturns();
  }, []);

  useEffect(() => {
    fetchReturns();
    setSelectedPendingIds([]);
  }, [selectedCourierId]);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      const list = d.couriers || [];
      if (list.length > 0) {
        setCouriers(list);
        if (!selectedCourierId) {
          setSelectedCourierId(list[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchReturns() {
    setLoadingData(true);
    try {
      let url = `/api/returns`;
      if (selectedCourierId) {
        url += `?courierId=${encodeURIComponent(selectedCourierId)}`;
      }
      const res = await fetch(url);
      const d = await res.json();
      setReturnsList(d.returns || []);
      setPendingParcels(d.pendingParcels || []);
      if (d.summary) {
        setSummary(d.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }

  function showMessage(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  }

  // Open return confirmation modal for single parcel
  function openReturnModalForSingle(parcel: any) {
    setTargetParcelsToReturn([parcel]);
    setActionReturnReason("Customer refused parcel");
    setActionCustomReason("");
    setActionReturnDate(new Date().toISOString().split("T")[0]);
    setShowConfirmReturnModal(true);
  }

  // Open return confirmation modal for bulk selected parcels
  function openReturnModalForBulk() {
    const selectedItems = pendingParcels.filter((p) => selectedPendingIds.includes(p._id));
    if (selectedItems.length === 0) return;
    setTargetParcelsToReturn(selectedItems);
    setActionReturnReason("Customer refused parcel");
    setActionCustomReason("");
    setActionReturnDate(new Date().toISOString().split("T")[0]);
    setShowConfirmReturnModal(true);
  }

  // Process and save return records with mandatory return reason
  async function handleConfirmReturnAction() {
    if (targetParcelsToReturn.length === 0) return;

    const finalReason =
      actionReturnReason === "Other" && actionCustomReason.trim()
        ? actionCustomReason.trim()
        : actionReturnReason;

    if (actionReturnReason === "Other" && !actionCustomReason.trim()) {
      alert("Please specify the custom return reason.");
      return;
    }

    const ids = targetParcelsToReturn.map((p) => p._id);
    const totalCOD = targetParcelsToReturn.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    setIsProcessing(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: selectedCourierId,
          parcelIds: ids,
          returnReason: finalReason,
          customReason: actionReturnReason === "Other" ? actionCustomReason.trim() : "",
          returnDate: actionReturnDate,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        showMessage(`✓ Recorded return for ${ids.length} parcel(s) [Reason: ${finalReason}]. Deducted ${formatNPR(totalCOD)}.`);
        setShowConfirmReturnModal(false);
        setSelectedPendingIds((prev) => prev.filter((id) => !ids.includes(id)));
        fetchReturns();
      } else {
        alert(d.error || "Failed to process returns");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  // Quick Inline return save
  async function handleSaveInlineReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineName.trim() || inlineCOD === "") {
      alert("Please enter customer name and COD amount.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: selectedCourierId,
          customerName: inlineName.trim(),
          mobile: inlineMobile.trim(),
          sku: inlineSKU.trim(),
          codAmount: Number(inlineCOD) || 0,
          returnReason: "Customer Refused",
        }),
      });

      const d = await res.json();
      if (res.ok) {
        showMessage(`✓ Added return for "${inlineName}". Deducted ${formatNPR(Number(inlineCOD))}.`);
        setInlineName("");
        setInlineMobile("");
        setInlineCOD("");
        setInlineSKU("");
        setShowQuickAdd(false);
        fetchReturns();
      } else {
        alert(d.error || "Failed to save return");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle Modal Rows operations
  function handleAddModalRow() {
    setModalRows((prev) => [
      ...prev,
      {
        id: "row-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        customerName: "",
        mobile: "",
        sku: "",
        codAmount: "",
        remarks: "",
      },
    ]);
  }

  function handleRemoveModalRow(index: number) {
    if (modalRows.length <= 1) {
      setModalRows([{ id: "row-1", customerName: "", mobile: "", sku: "", codAmount: "", remarks: "" }]);
      return;
    }
    setModalRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleModalRowChange(index: number, field: keyof ReturnModalRow, val: any) {
    setModalRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }

  // Submit Modal Return Entries
  async function handleSubmitModalReturns(e: React.FormEvent) {
    e.preventDefault();

    const validEntries = modalRows.filter((r) => r.customerName.trim() !== "");
    if (validEntries.length === 0) {
      alert("Please enter at least one customer name.");
      return;
    }

    const finalModalReason =
      modalReason === "Other" && modalCustomReason.trim()
        ? modalCustomReason.trim()
        : modalReason;

    if (modalReason === "Other" && !modalCustomReason.trim()) {
      alert("Please enter a custom return reason.");
      return;
    }

    setIsProcessing(true);
    try {
      const entriesPayload = validEntries.map((r) => ({
        courierId: modalCourierId,
        customerName: r.customerName.trim(),
        mobile: r.mobile.trim(),
        sku: r.sku.trim(),
        codAmount: Number(r.codAmount) || 0,
        remarks: r.remarks.trim(),
        returnReason: finalModalReason,
        customReason: modalReason === "Other" ? modalCustomReason.trim() : "",
        returnDate: modalDate,
      }));

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: modalCourierId,
          entries: entriesPayload,
          returnReason: finalModalReason,
          customReason: modalReason === "Other" ? modalCustomReason.trim() : "",
          returnDate: modalDate,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        showMessage(`✓ Recorded ${validEntries.length} return entries. COD automatically adjusted!`);
        setShowAddModal(false);
        // Reset modal form
        setModalRows([{ id: "row-1", customerName: "", mobile: "", sku: "", codAmount: "", remarks: "" }]);
        setModalCustomReason("");
        fetchReturns();
      } else {
        alert(d.error || "Failed to record return entries");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  // Edit return state
  const [editingReturn, setEditingReturn] = useState<any | null>(null);

  // Revert return status back to active delivered - Admin & Manager only
  async function handleRevert(parcelId: string, customerName: string) {
    if (!isAdminOrManager) {
      alert("Permission denied: Staff members cannot revert returns. Only Admin and Manager are authorized.");
      return;
    }
    if (!confirm(`Revert return for "${customerName}"? Package will move back to Active Handover / Ready for Settlement.`)) {
      return;
    }

    try {
      const res = await fetch("/api/returns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelId, newStatus: "Delivered" }),
      });

      if (res.ok) {
        showMessage(`✓ Reverted return for "${customerName}".`);
        fetchReturns();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to revert return");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Delete return record - Admin & Manager only
  async function handleDeleteReturn(returnRecordId: string, parcelId: string, customerName: string) {
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can delete return records.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete return record for "${customerName}"?\n\nThis will clear the return and restore the parcel to Delivered.`
      )
    ) {
      return;
    }
    try {
      let url = "/api/returns?";
      if (returnRecordId) url += `id=${returnRecordId}&`;
      if (parcelId) url += `parcelId=${parcelId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        showMessage(`✓ Deleted return record for "${customerName}".`);
        fetchReturns();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete return record");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete return record");
    }
  }

  // Save edited return - Admin & Manager only
  async function handleSaveEditedReturn() {
    if (!editingReturn) return;
    try {
      const res = await fetch("/api/returns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnRecordId: editingReturn._id,
          parcelId: editingReturn.parcelId,
          updates: {
            returnReason: editingReturn.returnReason,
            customReason: editingReturn.customReason,
            remarks: editingReturn.remarks,
          },
        }),
      });
      if (res.ok) {
        setEditingReturn(null);
        showMessage("✓ Return details updated successfully.");
        fetchReturns();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update return");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update return");
    }
  }

  // Re-deliver & Re-assign Modal state (Customer contacted again)
  const [showRedeliverModal, setShowRedeliverModal] = useState(false);
  const [redeliverForm, setRedeliverForm] = useState<{
    parcelId: string;
    customerName: string;
    mobile: string;
    courierId: string;
    courierName: string;
    serviceArea: string;
    codAmount: number | "";
    deliveryCharge: number | "";
    dispatchDate: string;
    notes: string;
  } | null>(null);
  const [isSubmittingRedeliver, setIsSubmittingRedeliver] = useState(false);

  function openRedeliverModal(parcel: any) {
    const courier = couriers.find((c) => c._id === parcel.courierId) || couriers[0];
    setRedeliverForm({
      parcelId: parcel._id,
      customerName: parcel.customerName || "",
      mobile: parcel.mobile || "",
      courierId: courier?._id || parcel.courierId,
      courierName: courier?.name || parcel.courierName,
      serviceArea: parcel.serviceArea || courier?.serviceArea || "Inside Valley",
      codAmount: parcel.codAmount ?? 0,
      deliveryCharge:
        parcel.actualDeliveryCharge ?? parcel.deliveryCharge ?? courier?.defaultDeliveryCharge ?? 100,
      dispatchDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowRedeliverModal(true);
  }

  function handleRedeliverCourierChange(newCourierId: string) {
    if (!redeliverForm) return;
    const courier = couriers.find((c) => c._id === newCourierId);
    setRedeliverForm({
      ...redeliverForm,
      courierId: newCourierId,
      courierName: courier?.name || "Courier",
      serviceArea: courier?.serviceArea || redeliverForm.serviceArea,
      deliveryCharge: courier?.defaultDeliveryCharge ?? redeliverForm.deliveryCharge,
    });
  }

  async function handleSubmitRedeliver(e: React.FormEvent) {
    e.preventDefault();
    if (!redeliverForm) return;
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can re-deliver and re-assign parcels.");
      return;
    }

    setIsSubmittingRedeliver(true);
    try {
      const res = await fetch("/api/returns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeliver",
          parcelId: redeliverForm.parcelId,
          courierId: redeliverForm.courierId,
          courierName: redeliverForm.courierName,
          customerName: redeliverForm.customerName.trim(),
          mobile: redeliverForm.mobile.trim(),
          serviceArea: redeliverForm.serviceArea,
          codAmount: Number(redeliverForm.codAmount) || 0,
          deliveryCharge: Number(redeliverForm.deliveryCharge) || 0,
          dispatchDate: redeliverForm.dispatchDate,
          notes: redeliverForm.notes.trim(),
        }),
      });

      const d = await res.json();
      if (res.ok) {
        showMessage(`✓ Re-assigned and re-dispatched to ${redeliverForm.courierName} for delivery!`);
        setShowRedeliverModal(false);
        setRedeliverForm(null);
        fetchReturns();
      } else {
        alert(d.error || "Failed to re-deliver parcel");
      }
    } catch (err: any) {
      alert(err.message || "Failed to re-deliver parcel");
    } finally {
      setIsSubmittingRedeliver(false);
    }
  }

  // Filter pending parcels
  const filteredPending = useMemo(() => {
    if (!pendingSearch.trim()) return pendingParcels;
    const q = pendingSearch.toLowerCase().trim();
    return pendingParcels.filter(
      (p) =>
        p.customerName?.toLowerCase().includes(q) ||
        p.mobile?.includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [pendingParcels, pendingSearch]);

  // Filter returns history
  const filteredReturns = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    const past7Str = past7.toISOString().split("T")[0];

    return returnsList.filter((p) => {
      if (historyCourierId !== "all" && p.courierId !== historyCourierId) return false;

      const pDate = p.returnDate || (p.updatedAt || p.createdAt || "").split("T")[0];
      if (dateFilter === "today" && pDate !== todayStr) return false;
      if (dateFilter === "yesterday" && pDate !== yesterdayStr) return false;
      if (dateFilter === "last7days" && pDate < past7Str) return false;
      if (dateFilter === "custom") {
        if (customFromDate && pDate < customFromDate) return false;
        if (customToDate && pDate > customToDate) return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchName = (p.customerName || "").toLowerCase().includes(q);
        const matchMobile = (p.mobile || "").includes(q);
        const matchSku = (p.sku || "").toLowerCase().includes(q);
        const matchRemarks = (p.remarks || "").toLowerCase().includes(q);
        const matchCourier = (p.courierName || "").toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchSku && !matchRemarks && !matchCourier) return false;
      }

      return true;
    });
  }, [returnsList, historyCourierId, dateFilter, customFromDate, customToDate, historySearch]);

  const activeCourier = couriers.find((c) => c._id === selectedCourierId);
  const pendingCODTotal = pendingParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
  const selectedCODTotal = pendingParcels
    .filter((p) => selectedPendingIds.includes(p._id))
    .reduce((sum, p) => sum + (p.codAmount || 0), 0);

  const modalTotalCOD = modalRows.reduce((sum, r) => sum + (Number(r.codAmount) || 0), 0);
  const modalValidCount = modalRows.filter((r) => r.customerName.trim() !== "").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER: Clean, Minimalist, Action-Oriented */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Courier Returns
              </h1>
              <p className="text-xs text-slate-500">
                Record returned parcels to automatically deduct COD from courier settlement.
              </p>
            </div>
          </div>
        </div>

        {/* Compact Summary Pills, Primary Add Returns Button, & Export */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700">
            Today: <strong className="text-slate-900">{summary.todayReturnsCount}</strong> returns{" "}
            <span className="text-slate-400">({formatNPR(summary.todayReturnedCOD)})</span>
          </div>
          <div className="px-3 py-1.5 bg-rose-50/70 border border-rose-200/80 rounded-xl font-medium text-rose-800">
            Total Returned: <strong>{summary.totalReturnedCount}</strong>{" "}
            <span className="text-rose-600 font-bold">({formatNPR(summary.totalReturnedCOD)})</span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => {
              setModalCourierId(selectedCourierId);
              setShowAddModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Returns Entry</span>
          </button>

          <a
            href="/api/export?type=returns"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: RECEIVE RETURNS WORKBENCH */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Top Control Bar: Pick Courier + Live Search + Add Returns Entry */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center space-x-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Courier:</span>
            </label>
            <div className="relative">
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs appearance-none cursor-pointer"
              >
                {couriers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.serviceArea})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              <strong className="text-blue-700 font-bold">{pendingParcels.length}</strong> pending{" "}
              <span className="text-slate-400">({formatNPR(pendingCODTotal)})</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer or mobile..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <button
              onClick={() => {
                setModalCourierId(selectedCourierId);
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Returns Entry</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (when packages are selected) */}
        {selectedPendingIds.length > 0 && (
          <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between animate-in fade-in text-xs">
            <span className="font-bold text-rose-900">
              {selectedPendingIds.length} parcel(s) selected &bull; Total COD to deduct:{" "}
              <strong className="text-rose-700 font-extrabold">{formatNPR(selectedCODTotal)}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedPendingIds([])}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-medium"
              >
                Clear
              </button>
              <button
                onClick={openReturnModalForBulk}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors"
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Return Selected ({selectedPendingIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Pending Dispatched Checklist */}
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPendingIds.length === filteredPending.length && filteredPending.length > 0) {
                        setSelectedPendingIds([]);
                      } else {
                        setSelectedPendingIds(filteredPending.map((p) => p._id));
                      }
                    }}
                    className="text-slate-400 hover:text-slate-600 flex items-center"
                  >
                    {selectedPendingIds.length > 0 && selectedPendingIds.length === filteredPending.length ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3 text-right">COD Amount</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    {pendingParcels.length === 0
                      ? `No pending packages out for delivery with ${activeCourier?.name || "this courier"}.`
                      : `No pending packages matching "${pendingSearch}".`}
                  </td>
                </tr>
              ) : (
                filteredPending.map((p) => {
                  const isChecked = selectedPendingIds.includes(p._id);
                  return (
                    <tr
                      key={p._id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isChecked ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPendingIds((prev) =>
                              prev.includes(p._id) ? prev.filter((id) => id !== p._id) : [...prev, p._id]
                            );
                          }}
                          className="text-slate-400 hover:text-slate-600 flex items-center"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{p.customerName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{p.mobile || "-"}</td>
                      <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{p.sku || "-"}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">
                        {formatNPR(p.codAmount)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => openReturnModalForSingle(p)}
                          disabled={isProcessing}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] transition-colors"
                        >
                          Mark Returned
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: RETURNED PARCELS HISTORY LOG */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header & Quick Date Filters */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Returned Parcels Log</h2>
            <p className="text-xs text-slate-500">
              History of returned parcels with auto-adjusted COD amounts
            </p>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {[
              { id: "all", label: "All Returns" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7days", label: "Last 7 Days" },
              { id: "custom", label: "Custom Date" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  dateFilter === d.id
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: Search + Courier Filter */}
        <div className="p-3 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row gap-2.5 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, mobile, SKU, or remarks..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={historyCourierId}
              onChange={(e) => setHistoryCourierId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Couriers</option>
              {couriers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {dateFilter === "custom" && (
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Courier Partner</th>
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4 text-right">Deducted COD</th>
                <th className="py-2.5 px-4">Return Reason</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-rose-600" />
                    <span>Loading returned parcels...</span>
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No returned parcel records found.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(p.returnDate || p.updatedAt || p.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900">{p.customerName}</div>
                      {p.mobile && <div className="text-[11px] font-mono text-slate-500">{p.mobile}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{p.courierName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{p.sku || "-"}</td>
                    <td className="py-2.5 px-4 text-right font-black text-rose-700 whitespace-nowrap">
                      - {formatNPR(p.codAmount)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {p.returnReason || p.remarks || "Customer refused parcel"}
                      </span>
                      {p.returnedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5">By: {p.returnedBy}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isAdminOrManager ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openRedeliverModal(p)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center space-x-1 shadow-xs transition-colors"
                            title="Customer Contacted Again: Re-assign & Re-deliver to Courier"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Re-deliver</span>
                          </button>

                          <button
                            onClick={() =>
                              setEditingReturn({
                                _id: p.returnRecordId || p._id,
                                parcelId: p._id,
                                customerName: p.customerName,
                                returnReason: p.returnReason || "Customer refused parcel",
                                customReason: p.customReason || "",
                                remarks: p.remarks || "",
                              })
                            }
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Return Details (Admin & Manager)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRevert(p._id, p.customerName)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                            title="Revert back to Delivered / Active Handover"
                          >
                            <Undo2 className="w-3 h-3 text-slate-500" />
                            <span>Revert</span>
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteReturn(p.returnRecordId || "", p._id, p.customerName)
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Return Record (Admin & Manager)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Read-only (Staff)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
          <div>
            Showing {filteredReturns.length} of {returnsList.length} returned parcels
          </div>
          <div>
            Total Deducted COD in view:{" "}
            <strong className="text-rose-700 font-black">
              {formatNPR(filteredReturns.reduce((sum, p) => sum + (p.codAmount || 0), 0))}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD RETURNS ENTRY MODAL (Clean, Fast & Multi-row Capable)                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Add Returns Entry</h3>
                  <p className="text-xs text-slate-500">
                    Record returned parcels from courier to automatically deduct COD from settlement.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitModalReturns} className="p-5 space-y-5">
              {/* Top Configuration: Courier + Date + Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Courier Partner <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalCourierId}
                    onChange={(e) => setModalCourierId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {couriers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.serviceArea})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Return Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {modalReason === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify custom return reason..."
                      value={modalCustomReason}
                      onChange={(e) => setModalCustomReason(e.target.value)}
                      className="mt-2 w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Returned Parcels Information
                  </label>
                  <button
                    type="button"
                    onClick={handleAddModalRow}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Parcel</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-8">#</th>
                        <th className="py-2 px-3">Customer Name *</th>
                        <th className="py-2 px-3">Mobile Number</th>
                        <th className="py-2 px-3">SKU (Opt.)</th>
                        <th className="py-2 px-3 w-32">COD Amount (Rs.) *</th>
                        <th className="py-2 px-3">Notes / Remarks</th>
                        <th className="py-2 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Maya Shrestha"
                              value={row.customerName}
                              onChange={(e) => handleModalRowChange(idx, "customerName", e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="98XXXXXXXX"
                              value={row.mobile}
                              onChange={(e) => handleModalRowChange(idx, "mobile", e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="e.g. HD-BLK-M"
                              value={row.sku}
                              onChange={(e) => handleModalRowChange(idx, "sku", e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              required
                              placeholder="e.g. 2500"
                              value={row.codAmount}
                              onChange={(e) =>
                                handleModalRowChange(
                                  idx,
                                  "codAmount",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-black text-rose-700"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="e.g. refused by customer"
                              value={row.remarks}
                              onChange={(e) => handleModalRowChange(idx, "remarks", e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-600"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            {modalRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveModalRow(idx)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer & Financial Summary */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="font-medium">
                    Valid entries: <strong className="text-slate-900">{modalValidCount}</strong>
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span>
                    Total COD Deducted:{" "}
                    <strong className="text-rose-700 font-black text-sm">{formatNPR(modalTotalCOD)}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>Save Returns Entry</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDATORY RETURN REASON CONFIRMATION MODAL                                */}
      {/* ========================================================================= */}
      {showConfirmReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Record Parcel Return</h3>
                  <p className="text-xs text-slate-500">
                    Specify the return reason to automatically update courier records.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmReturnModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Target info card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                {targetParcelsToReturn.length === 1 ? (
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {targetParcelsToReturn[0].customerName}
                    </div>
                    <div className="flex items-center space-x-3 text-slate-600 font-mono">
                      <span>Phone: {targetParcelsToReturn[0].mobile || "-"}</span>
                      <span>&bull;</span>
                      <span>SKU: {targetParcelsToReturn[0].sku || "-"}</span>
                    </div>
                    <div className="text-rose-700 font-bold pt-1">
                      COD to Deduct: {formatNPR(targetParcelsToReturn[0].codAmount || 0)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      {targetParcelsToReturn.length} parcels selected for return
                    </span>
                    <div className="text-rose-700 font-bold mt-1">
                      Total COD to Deduct:{" "}
                      {formatNPR(
                        targetParcelsToReturn.reduce((sum, p) => sum + (p.codAmount || 0), 0)
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Return Date</label>
                <input
                  type="date"
                  value={actionReturnDate}
                  onChange={(e) => setActionReturnDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Return Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={actionReturnReason}
                  onChange={(e) => setActionReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  {RETURN_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason input if "Other" */}
              {actionReturnReason === "Other" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custom Return Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter specific return reason..."
                    value={actionCustomReason}
                    onChange={(e) => setActionCustomReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmReturnModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnAction}
                disabled={isProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Return</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RETURN MODAL (Admin & Manager) */}
      {editingReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Edit Return Details ({editingReturn.customerName})
              </h3>
              <button
                onClick={() => setEditingReturn(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Return Reason</label>
                <select
                  value={editingReturn.returnReason}
                  onChange={(e) =>
                    setEditingReturn({ ...editingReturn, returnReason: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {editingReturn.returnReason === "Other" && (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Custom Reason</label>
                  <input
                    type="text"
                    value={editingReturn.customReason || ""}
                    onChange={(e) =>
                      setEditingReturn({ ...editingReturn, customReason: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="Enter specific custom reason..."
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingReturn.remarks || ""}
                  onChange={(e) =>
                    setEditingReturn({ ...editingReturn, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Shortcut to Re-deliver if customer contacted again */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const p =
                      returnsList.find((item) => item._id === editingReturn.parcelId) ||
                      editingReturn;
                    setEditingReturn(null);
                    openRedeliverModal(p);
                  }}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Customer Contacted Again? Re-deliver to Courier</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditingReturn(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedReturn}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-ASSIGN & RE-DELIVER MODAL (When Customer Contacts Again) */}
      {showRedeliverModal && redeliverForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Re-assign & Re-deliver to Courier
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customer contacted again: update details & hand over for delivery
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRedeliverModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRedeliver} className="space-y-3 py-4 text-xs">
              {/* Courier Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Assign Delivery Courier Partner <span className="text-red-500">*</span>
                </label>
                <select
                  value={redeliverForm.courierId}
                  onChange={(e) => handleRedeliverCourierChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {couriers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.serviceArea || "Standard"} — Rs. {c.defaultDeliveryCharge ?? 100})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Contact Info (Editable if new number or address) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={redeliverForm.customerName}
                    onChange={(e) =>
                      setRedeliverForm({ ...redeliverForm, customerName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={redeliverForm.mobile}
                    onChange={(e) =>
                      setRedeliverForm({ ...redeliverForm, mobile: e.target.value })
                    }
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Area & Re-dispatch Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Coverage Area</label>
                  <select
                    value={redeliverForm.serviceArea}
                    onChange={(e) =>
                      setRedeliverForm({ ...redeliverForm, serviceArea: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="Inside Valley">Inside Valley</option>
                    <option value="Outside Valley">Outside Valley</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Re-dispatch Date</label>
                  <input
                    type="date"
                    value={redeliverForm.dispatchDate}
                    onChange={(e) =>
                      setRedeliverForm({ ...redeliverForm, dispatchDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* COD Amount & Delivery Charge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">COD Amount (Rs.)</label>
                  <input
                    type="number"
                    value={redeliverForm.codAmount}
                    onChange={(e) =>
                      setRedeliverForm({
                        ...redeliverForm,
                        codAmount: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Courier Delivery Fee (Rs.)</label>
                  <input
                    type="number"
                    value={redeliverForm.deliveryCharge}
                    onChange={(e) =>
                      setRedeliverForm({
                        ...redeliverForm,
                        deliveryCharge: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Notes / Special Customer Request */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Customer Re-contact Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer called again; deliver tomorrow after 2 PM at new office address..."
                  value={redeliverForm.notes}
                  onChange={(e) =>
                    setRedeliverForm({ ...redeliverForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                <strong>Re-delivery Effect:</strong> Package status will move from{" "}
                <span className="text-red-700 font-bold">Returned</span> to{" "}
                <span className="text-emerald-700 font-bold">Active Handover</span>. Previous return
                deduction will be cancelled, and the parcel will enter the settlement statement for{" "}
                <strong>{redeliverForm.courierName}</strong>.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRedeliverModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRedeliver}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  {isSubmittingRedeliver ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                  <span>Re-deliver to Courier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
