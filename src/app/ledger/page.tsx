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
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatNPR, formatDate } from "@/lib/utils";
import { useUserRole } from "@/lib/useUserRole";

export default function LedgerPage() {
  const { user, role, isAdminOrManager, isStaff } = useUserRole();
  const [entries, setEntries] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("all");
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal State (Admin & Manager)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryCourierId, setNewEntryCourierId] = useState("");
  const [newEntryDate, setNewEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newEntryType, setNewEntryType] = useState("Manual Adjustment");
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [newEntryDebit, setNewEntryDebit] = useState<number | "">("");
  const [newEntryCredit, setNewEntryCredit] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Entry State (Admin & Manager)
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

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
      const list = d.couriers || [];
      setCouriers(list);
      if (list.length > 0 && !newEntryCourierId) {
        setNewEntryCourierId(list[0]._id);
      }
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

  // Delete Ledger Entry - Admin & Manager only
  async function handleDeleteEntry(id: string, refId: string) {
    if (!isAdminOrManager) {
      alert("Permission denied: Only Admin and Manager can delete ledger entries.");
      return;
    }
    if (!confirm(`Are you sure you want to delete this ledger entry "${refId}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/ledger?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Ledger entry deleted successfully.");
        fetchLedger();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete ledger entry");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete ledger entry");
    }
  }

  // Add Manual Entry - Admin & Manager only
  async function handleAddManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newEntryCourierId) {
      alert("Please select a courier");
      return;
    }
    if (!newEntryDesc.trim()) {
      alert("Please enter a description for the ledger entry");
      return;
    }
    const debitNum = Number(newEntryDebit) || 0;
    const creditNum = Number(newEntryCredit) || 0;
    if (debitNum <= 0 && creditNum <= 0) {
      alert("Please enter either a Debit or Credit amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId: newEntryCourierId,
          transactionDate: newEntryDate,
          transactionType: newEntryType,
          description: newEntryDesc.trim(),
          debit: debitNum,
          credit: creditNum,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewEntryDesc("");
        setNewEntryDebit("");
        setNewEntryCredit("");
        fetchLedger();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to add ledger entry");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add ledger entry");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Edited Entry - Admin & Manager only
  async function handleSaveEditedEntry() {
    if (!editingEntry) return;
    try {
      const res = await fetch("/api/ledger", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingEntry._id,
          updates: {
            transactionDate: editingEntry.transactionDate,
            description: editingEntry.description,
            debit: Number(editingEntry.debit) || 0,
            credit: Number(editingEntry.credit) || 0,
          },
        }),
      });

      if (res.ok) {
        setEditingEntry(null);
        fetchLedger();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update ledger entry");
      }
    } catch (e: any) {
      alert(e.message || "Failed to update ledger entry");
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

        <div className="flex items-center space-x-2">
          {isAdminOrManager ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Adjustment Entry</span>
            </button>
          ) : (
            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
              Staff Mode (Read-only Ledger)
            </span>
          )}

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
          className={`p-4 rounded-xl border shadow-xs flex items-center justify-between ${(summary?.closingBalance || 0) > 0
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
                {isAdminOrManager && <th className="py-3 px-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdminOrManager ? 9 : 8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading ledger...</span>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrManager ? 9 : 8} className="py-12 text-center text-slate-400">
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.transactionType === "Payment Received"
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

                    {isAdminOrManager && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setEditingEntry({ ...e })}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Ledger Entry"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteEntry(e._id, e.referenceId || e.description)
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Ledger Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MANUAL ADJUSTMENT MODAL (Admin & Manager) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Add Manual Ledger Adjustment
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualEntry} className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Select Courier *</label>
                <select
                  value={newEntryCourierId}
                  onChange={(e) => setNewEntryCourierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  required
                >
                  {couriers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={newEntryDate}
                    onChange={(e) => setNewEntryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Type</label>
                  <select
                    value={newEntryType}
                    onChange={(e) => setNewEntryType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Manual Adjustment">Manual Adjustment</option>
                    <option value="Debit Note">Debit Note (Courier Owes)</option>
                    <option value="Credit Note">Credit Note (Discount/Refund)</option>
                    <option value="Opening Balance">Opening Balance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description / Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Courier late fee waiver, manual adjustment, etc."
                  value={newEntryDesc}
                  onChange={(e) => setNewEntryDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Debit (Rs.) <span className="font-normal text-slate-400">(Owed to us)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newEntryDebit}
                    onChange={(e) =>
                      setNewEntryDebit(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Credit (Rs.) <span className="font-normal text-slate-400">(Paid / Reduced)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newEntryCredit}
                    onChange={(e) =>
                      setNewEntryCredit(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? "Recording..." : "Record Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ENTRY MODAL (Admin & Manager) */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Edit Ledger Entry ({editingEntry.referenceId || editingEntry.courierName})
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={editingEntry.transactionDate}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, transactionDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={editingEntry.description}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Debit (Rs.)</label>
                  <input
                    type="number"
                    value={editingEntry.debit}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        debit: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Credit (Rs.)</label>
                  <input
                    type="number"
                    value={editingEntry.credit}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        credit: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedEntry}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
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

