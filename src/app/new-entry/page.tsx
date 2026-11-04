"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Truck,
  Calendar,
  Layers,
  ArrowRight,
  Clipboard,
  X,
  Loader2,
  ChevronDown,
  Check,
  ExternalLink,
} from "lucide-react";
import { formatNPR, generateBatchNumber, isValidNepaliMobile } from "@/lib/utils";

interface ParcelRow {
  id: string;
  customerName: string;
  mobile: string;
  codAmount: number | "";
  trackingId?: string;
  sku: string;
  deliveryArea: "Inside Valley" | "Outside Valley";
  deliveryCharge: number | "";
  remarks: string;
  isCustomCharge?: boolean;
}

function buildEmptyRows(
  count: number,
  defaultCharge: number = 70,
  defaultArea: "Inside Valley" | "Outside Valley" = "Inside Valley"
): ParcelRow[] {
  const arr: ParcelRow[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: "row-" + Date.now() + "-" + i + "-" + Math.random().toString(36).substring(2, 6),
      customerName: "",
      mobile: "",
      codAmount: "",
      trackingId: "",
      sku: "",
      deliveryArea: defaultArea,
      deliveryCharge: defaultCharge,
      remarks: "",
      isCustomCharge: false,
    });
  }
  return arr;
}

const DEFAULT_COURIER_LIST = [
  { _id: "c-001", name: "Google Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 70 },
  { _id: "c-002", name: "KDM Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-003", name: "SP Express", serviceArea: "Inside Valley", defaultDeliveryCharge: 150 },
  { _id: "c-004", name: "Nepal Can Move", serviceArea: "Outside Valley", defaultDeliveryCharge: 250 },
];

export default function BulkEntryPage() {
  const router = useRouter();

  // Header / Batch configuration (Pre-loaded with defaults so dropdown is never empty/blank)
  const [couriers, setCouriers] = useState<any[]>(DEFAULT_COURIER_LIST);
  const [selectedCourierId, setSelectedCourierId] = useState("c-001");
  const [isCourierDropdownOpen, setIsCourierDropdownOpen] = useState(false);
  const courierDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close courier dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        courierDropdownRef.current &&
        !courierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCourierDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [batchNumber, setBatchNumber] = useState(() => generateBatchNumber());
  const [batchNotes, setBatchNotes] = useState("");

  // Table rows initialized with Google Express's default charge (70) rather than hardcoded 100
  const [rows, setRows] = useState<ParcelRow[]>(() =>
    buildEmptyRows(
      10,
      DEFAULT_COURIER_LIST[0].defaultDeliveryCharge,
      DEFAULT_COURIER_LIST[0].serviceArea as any
    )
  );

  // Modals & Submissions
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate warning modal
  const [duplicateWarning, setDuplicateWarning] = useState<{
    trackingDuplicates: string[];
    suspiciousDuplicates: string[];
  } | null>(null);

  // Focus matrix helper
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchCouriers();

    // Real-time synchronization across browser tabs and components
    function onCouriersUpdated() {
      fetchCouriers();
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "couriers_last_updated") {
        fetchCouriers();
      }
    }

    window.addEventListener("couriers_updated", onCouriersUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onCouriersUpdated);

    return () => {
      window.removeEventListener("couriers_updated", onCouriersUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onCouriersUpdated);
    };
  }, []);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers", { cache: "no-store" });
      const d = await res.json();
      const list = d.couriers || [];
      if (list.length > 0) {
        setCouriers(list);
        setSelectedCourierId((prev) => {
          if (prev && list.some((c: any) => c._id === prev)) {
            return prev;
          }
          return list[0]._id;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  const selectedCourier = couriers.find((c) => c._id === selectedCourierId);

  // Synchronize delivery charge and service area with selected courier in real time
  useEffect(() => {
    if (!selectedCourier) return;
    const charge = selectedCourier.defaultDeliveryCharge ?? 70;
    const area =
      selectedCourier.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley";

    setRows((prev) =>
      prev.map((r) => {
        // If row is empty or user hasn't explicitly customized its charge, sync with courier default
        const isEmpty =
          !r.customerName.trim() &&
          !r.mobile.trim() &&
          (!r.codAmount || r.codAmount === 0);

        if (isEmpty || !r.isCustomCharge) {
          return {
            ...r,
            deliveryCharge: charge,
            deliveryArea: isEmpty ? area : r.deliveryArea,
          };
        }
        return r;
      })
    );
  }, [selectedCourierId, selectedCourier?.defaultDeliveryCharge, selectedCourier?.serviceArea]);

  function addRows(count: number) {
    const charge = selectedCourier?.defaultDeliveryCharge ?? 70;
    const area =
      selectedCourier?.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley";
    setRows((prev) => [...prev, ...buildEmptyRows(count, charge, area)]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleCellChange(index: number, field: keyof ParcelRow, value: any) {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      if (field === "deliveryCharge") {
        copy[index].isCustomCharge = true;
      }

      // If user types in the last row, automatically append 1 more row for smooth continuous entry!
      if (index === copy.length - 1 && field === "customerName" && String(value).trim().length > 0) {
        const charge = selectedCourier?.defaultDeliveryCharge ?? 70;
        const area =
          selectedCourier?.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley";
        return [...copy, ...buildEmptyRows(1, charge, area)];
      }

      return copy;
    });
  }

  // Keyboard navigation
  const columnOrder: (keyof ParcelRow)[] = [
    "customerName",
    "mobile",
    "codAmount",
    "sku",
    "deliveryCharge",
    "remarks",
  ];

  function handleKeyDown(e: React.KeyboardEvent, rowIndex: number, colIndex: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to same column in next row
      if (rowIndex + 1 < rows.length) {
        cellRefs.current[`${rowIndex + 1}-${colIndex}`]?.focus();
      } else {
        // Append row and move
        addRows(1);
        setTimeout(() => {
          cellRefs.current[`${rowIndex + 1}-${colIndex}`]?.focus();
        }, 50);
      }
    } else if (e.key === "Tab" && !e.shiftKey) {
      if (colIndex === columnOrder.length - 1) {
        // If at last column, move to first column of next row
        e.preventDefault();
        if (rowIndex + 1 < rows.length) {
          cellRefs.current[`${rowIndex + 1}-0`]?.focus();
        } else {
          addRows(1);
          setTimeout(() => {
            cellRefs.current[`${rowIndex + 1}-0`]?.focus();
          }, 50);
        }
      }
    } else if (e.key === "ArrowDown") {
      if (rowIndex + 1 < rows.length) {
        cellRefs.current[`${rowIndex + 1}-${colIndex}`]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      if (rowIndex > 0) {
        cellRefs.current[`${rowIndex - 1}-${colIndex}`]?.focus();
      }
    }
  }

  // Paste from Excel / Google Sheets
  function handlePasteParse() {
    if (!pasteText.trim()) return;

    const lines = pasteText.trim().split(/\r?\n/);
    const newRows: ParcelRow[] = [];
    const defaultCharge = selectedCourier?.defaultDeliveryCharge || 100;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      if (parts.length === 0 || parts.every((p) => !p.trim())) continue;

      const customerName = parts[0]?.trim() || "";
      const mobile = parts[1]?.trim() || "";
      const codRaw = parts[2]?.trim().replace(/[^0-9.]/g, "") || "";
      let sku = "";
      let chargeRaw = "";
      let remarks = "";

      if (parts.length <= 6) {
        sku = parts[3]?.trim() || "";
        chargeRaw = parts[4]?.trim().replace(/[^0-9.]/g, "") || "";
        remarks = parts[5]?.trim() || "";
      } else {
        sku = parts[4]?.trim() || parts[3]?.trim() || "";
        chargeRaw = parts[5]?.trim().replace(/[^0-9.]/g, "") || "";
        remarks = parts[6]?.trim() || "";
      }

      newRows.push({
        id: "pasted-" + Date.now() + "-" + i,
        customerName,
        mobile,
        codAmount: codRaw ? Number(codRaw) : "",
        sku,
        deliveryArea:
          selectedCourier?.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley",
        deliveryCharge: chargeRaw ? Number(chargeRaw) : defaultCharge,
        remarks,
      });
    }

    if (newRows.length > 0) {
      // Filter out completely empty current rows and prepend/append pasted ones
      const nonEmptyCurrent = rows.filter(
        (r) => r.customerName.trim() || r.mobile.trim() || r.codAmount !== ""
      );
      setRows([...nonEmptyCurrent, ...newRows]);
      setIsPasteModalOpen(false);
      setPasteText("");
    }
  }

  // Live Calculations (Updates instantly as user types)
  const activeEntries = rows.filter(
    (r) => r.customerName.trim() || r.mobile.trim() || (r.codAmount !== "" && Number(r.codAmount) > 0)
  );

  const totalEntries = activeEntries.length;
  const totalCOD = activeEntries.reduce((sum, r) => sum + (Number(r.codAmount) || 0), 0);
  const totalEstimatedDeliveryCharge = activeEntries.reduce(
    (sum, r) => sum + (Number(r.deliveryCharge) || 0),
    0
  );
  const totalNet = totalCOD - totalEstimatedDeliveryCharge;

  // Save Batch & Parcels
  async function handleSaveBatch(forceSkipDuplicates: boolean = false) {
    if (!selectedCourierId) {
      alert("Please select a Courier first.");
      return;
    }

    if (activeEntries.length === 0) {
      alert("Please enter at least one parcel before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Duplicate check (unless bypassed)
      if (!forceSkipDuplicates) {
        const checkItems = activeEntries.map((r) => ({
          trackingId: r.trackingId?.trim(),
          mobile: r.mobile?.trim(),
          codAmount: Number(r.codAmount) || 0,
        }));

        const dupRes = await fetch("/api/parcels/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: checkItems }),
        });

        const dupData = await dupRes.json();
        if (dupData.hasDuplicates) {
          setDuplicateWarning({
            trackingDuplicates: dupData.trackingDuplicates || [],
            suspiciousDuplicates: dupData.suspiciousDuplicates || [],
          });
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit Bulk Parcels
      const payload = {
        courierId: selectedCourierId,
        courierName: selectedCourier?.name || "Courier",
        batchDate,
        batchNumber,
        notes: batchNotes,
        parcels: activeEntries.map((r) => ({
          customerName: r.customerName.trim(),
          mobile: r.mobile.trim(),
          codAmount: Number(r.codAmount) || 0,
          trackingId: r.trackingId?.trim() || undefined,
          sku: r.sku.trim() || undefined,
          serviceArea: r.deliveryArea,
          deliveryCharge: Number(r.deliveryCharge) || 0,
          remarks: r.remarks.trim(),
          status: "Pending",
        })),
      };

      const res = await fetch("/api/parcels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save batch");
        setIsSubmitting(false);
        return;
      }

      // Success! Redirect to Batches page
      router.push("/batches");
    } catch (err: any) {
      alert(err.message || "An error occurred");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                Fast-Paced Entry
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Bulk Parcel Entry
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Enter 100+ parcels continuously using Tab or Enter keys, or paste directly from Excel
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste from Excel</span>
            </button>

            <button
              onClick={() => handleSaveBatch(false)}
              disabled={isSubmitting || activeEntries.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Batch...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Batch ({activeEntries.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Batch Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Guaranteed Courier Service Selector Dropdown */}
          <div className="relative" ref={courierDropdownRef}>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Courier Service <span className="text-red-500">*</span>
            </label>

            {/* Clickable Trigger Box */}
            <div
              tabIndex={0}
              role="button"
              aria-haspopup="listbox"
              aria-expanded={isCourierDropdownOpen}
              onClick={() => setIsCourierDropdownOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                  e.preventDefault();
                  setIsCourierDropdownOpen(true);
                } else if (e.key === "Escape") {
                  setIsCourierDropdownOpen(false);
                }
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center justify-between transition-all select-none shadow-2xs relative"
            >
              <Truck className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="flex items-center space-x-1.5 truncate">
                <span className="font-bold text-slate-900 truncate">
                  {selectedCourier?.name || "Select Courier"}
                </span>
                {selectedCourier && (
                  <>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                      {selectedCourier.serviceArea}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold font-mono border border-emerald-200 whitespace-nowrap">
                      Rs. {selectedCourier.defaultDeliveryCharge ?? 0}
                    </span>
                  </>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${
                  isCourierDropdownOpen ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </div>

            {/* Guaranteed Dropdown Popup Menu */}
            {isCourierDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                  <span>Courier Partner</span>
                  <span>Delivery Charge</span>
                </div>
                {couriers.map((c) => {
                  const isSelected = c._id === selectedCourierId;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => {
                        setSelectedCourierId(c._id);
                        setIsCourierDropdownOpen(false);
                        const charge = c.defaultDeliveryCharge ?? 70;
                        const area =
                          c.serviceArea === "Outside Valley" ? "Outside Valley" : "Inside Valley";
                        setRows((prev) =>
                          prev.map((r) => {
                            const isEmpty =
                              !r.customerName.trim() &&
                              !r.mobile.trim() &&
                              (!r.codAmount || r.codAmount === 0);
                            if (isEmpty || !r.isCustomCharge) {
                              return {
                                ...r,
                                deliveryCharge: charge,
                                deliveryArea: isEmpty ? area : r.deliveryArea,
                              };
                            }
                            return r;
                          })
                        );
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Truck
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {c.serviceArea}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="font-mono text-slate-700 font-bold text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {formatNPR(c.defaultDeliveryCharge || 0)}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    </button>
                  );
                })}
                <div className="p-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Live Synced Fees</span>
                  <Link
                    href="/couriers"
                    target="_blank"
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Edit Courier Fees</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Batch Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Batch ID (Auto Generated)
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Batch Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Afternoon dispatch, Cotton hoodies"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Row Adder Quick Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600">Add Rows:</span>
          <button
            onClick={() => addRows(1)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors"
          >
            +1 Row
          </button>
          <button
            onClick={() => addRows(10)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors"
          >
            +10 Rows
          </button>
          <button
            onClick={() => addRows(50)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors"
          >
            +50 Rows
          </button>
          <button
            onClick={() => addRows(100)}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-colors"
          >
            +100 Rows
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Total Rows in Table: <span className="font-bold text-slate-800">{rows.length}</span>
        </div>
      </div>

      {/* Excel-like Bulk Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">S.N.</th>
                <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-200">
                  Customer Name <span className="text-red-500">*</span>
                </th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-200">
                  Mobile Number <span className="text-red-500">*</span>
                </th>
                <th className="py-2.5 px-3 min-w-[130px] text-right border-r border-slate-200">
                  COD Amount (Rs.) <span className="text-red-500">*</span>
                </th>
                <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-200">SKU / Item</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-200">
                  Delivery Area
                </th>
                <th className="py-2.5 px-3 min-w-[110px] text-right border-r border-slate-200">
                  Charge (Rs.)
                </th>
                <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200">Remarks</th>
                <th className="py-2.5 px-2 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((row, idx) => {
                const isMobileValid = !row.mobile || isValidNepaliMobile(row.mobile);

                return (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* S.N. */}
                    <td className="py-1 px-2 text-center font-mono text-[11px] text-slate-400 bg-slate-50/50 border-r border-slate-200">
                      {idx + 1}
                    </td>

                    {/* Customer Name */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-0`] = el;
                        }}
                        type="text"
                        placeholder="Customer name"
                        value={row.customerName}
                        onChange={(e) => handleCellChange(idx, "customerName", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Mobile Number */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-1`] = el;
                        }}
                        type="text"
                        placeholder="98XXXXXXXX"
                        value={row.mobile}
                        onChange={(e) => handleCellChange(idx, "mobile", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                        className={`w-full px-2.5 py-1.5 text-xs font-mono font-medium bg-transparent border-0 focus:outline-none focus:ring-1 ${
                          isMobileValid
                            ? "text-slate-800 focus:ring-blue-500"
                            : "text-red-600 bg-red-50/50 focus:ring-red-500"
                        }`}
                      />
                    </td>

                    {/* COD Amount */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-2`] = el;
                        }}
                        type="number"
                        placeholder="0"
                        value={row.codAmount}
                        onChange={(e) =>
                          handleCellChange(
                            idx,
                            "codAmount",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                        className="w-full px-2.5 py-1.5 text-xs text-right font-bold text-blue-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* SKU */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-3`] = el;
                        }}
                        type="text"
                        placeholder="Item SKU"
                        value={row.sku}
                        onChange={(e) => handleCellChange(idx, "sku", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Delivery Area */}
                    <td className="p-0 border-r border-slate-200">
                      <select
                        value={row.deliveryArea}
                        onChange={(e) =>
                          handleCellChange(idx, "deliveryArea", e.target.value as any)
                        }
                        className="w-full px-2 py-1.5 text-xs text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Inside Valley">Inside Valley</option>
                        <option value="Outside Valley">Outside Valley</option>
                      </select>
                    </td>

                    {/* Delivery Charge */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-4`] = el;
                        }}
                        type="number"
                        placeholder={String(selectedCourier?.defaultDeliveryCharge ?? 70)}
                        value={row.deliveryCharge}
                        onChange={(e) =>
                          handleCellChange(
                            idx,
                            "deliveryCharge",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                        className="w-full px-2.5 py-1.5 text-xs text-right font-medium text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        ref={(el) => {
                          cellRefs.current[`${idx}-5`] = el;
                        }}
                        type="text"
                        placeholder="Special notes"
                        value={row.remarks}
                        onChange={(e) => handleCellChange(idx, "remarks", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Delete Row Button */}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => removeRow(idx)}
                        title="Delete row"
                        className="text-slate-300 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Live Bulk Calculation Bar (Bottom of screen) */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-slate-900 text-white px-6 py-3.5 border-t border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4 z-40">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Entries:
            </span>
            <span className="text-base font-extrabold text-white bg-slate-800 px-2.5 py-0.5 rounded">
              {totalEntries}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Total COD:
            </span>
            <span className="text-base font-extrabold text-blue-400">
              {formatNPR(totalCOD)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Estimated Delivery Charge:
            </span>
            <span className="text-base font-bold text-slate-300">
              {formatNPR(totalEstimatedDeliveryCharge)}
            </span>
          </div>

          <div className="flex items-center space-x-2 border-l border-slate-700 pl-4">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
              Estimated Net:
            </span>
            <span className="text-base font-extrabold text-emerald-400">
              {formatNPR(totalNet)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleSaveBatch(false)}
            disabled={isSubmitting || totalEntries === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Batch ({totalEntries} Parcels)</span>
          </button>
        </div>
      </div>

      {/* Direct Paste from Excel Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Paste Rows Directly from Excel or Google Sheets
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <p>
                Copy your columns in Excel (Tab separated) and paste here. Expected column order:
              </p>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                Customer Name | Mobile | COD Amount | SKU | Delivery Charge | Remarks
              </div>
            </div>

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste cells copied from Excel/Google Sheets here..."
              className="mt-3 w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteParse}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Parse & Add to Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Prevention Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center space-x-2.5 text-amber-600 pb-3 border-b border-amber-100">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">
                Duplicate Warning Detected
              </h3>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              The system found suspicious or identical records already saved in the database:
            </p>

            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {duplicateWarning.trackingDuplicates.map((track, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-mono"
                >
                  Duplicate Tracking ID: <strong>{track}</strong> already exists in database
                </div>
              ))}

              {duplicateWarning.suspiciousDuplicates.map((susp, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800"
                >
                  Suspicious Duplicate: {susp}
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              As an authorized manager, you can choose to review your entries or proceed with saving anyway.
            </p>

            <div className="mt-5 flex justify-end space-x-2.5">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Go Back & Review
              </button>
              <button
                onClick={() => {
                  setDuplicateWarning(null);
                  handleSaveBatch(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Save Anyway (Authorized Override)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
