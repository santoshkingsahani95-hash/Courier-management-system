"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  PlusCircle,
  Edit2,
  Trash2,
  Phone,
  User,
  MapPin,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatNPR } from "@/lib/utils";

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [serviceArea, setServiceArea] = useState<"Inside Valley" | "Outside Valley" | "Both">(
    "Inside Valley"
  );
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState<number | "">(100);
  const [defaultReturnCharge, setDefaultReturnCharge] = useState<number | "">(50);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCouriers();
  }, []);

  async function fetchCouriers() {
    setLoading(true);
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      setCouriers(d.couriers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setEditingCourier(null);
    setName("");
    setServiceArea("Inside Valley");
    setContactPerson("");
    setPhone("");
    setDefaultDeliveryCharge(100);
    setDefaultReturnCharge(50);
    setStatus("active");
    setNotes("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(c: any) {
    setEditingCourier(c);
    setName(c.name);
    setServiceArea(c.serviceArea);
    setContactPerson(c.contactPerson || "");
    setPhone(c.phone || "");
    setDefaultDeliveryCharge(c.defaultDeliveryCharge);
    setDefaultReturnCharge(c.defaultReturnCharge);
    setStatus(c.status);
    setNotes(c.notes || "");
    setIsModalOpen(true);
  }

  async function handleSaveCourier(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        serviceArea,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        defaultDeliveryCharge: Number(defaultDeliveryCharge) || 0,
        defaultReturnCharge: Number(defaultReturnCharge) || 0,
        status,
        notes: notes.trim(),
      };

      let url = "/api/couriers";
      let method = "POST";

      if (editingCourier) {
        url = `/api/couriers/${editingCourier._id}`;
        method = "PUT";
        payload._id = editingCourier._id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCouriers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("couriers_updated"));
        try {
          localStorage.setItem("couriers_last_updated", Date.now().toString());
        } catch (e) {}
      }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("couriers_updated", { detail: payload }));
          try {
            localStorage.setItem("couriers_last_updated", Date.now().toString());
          } catch (e) {}
        }
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save courier");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCourier(id: string) {
    if (!confirm("Are you sure you want to delete this courier? Any associated records will also be removed.")) return;
    try {
      const res = await fetch(`/api/couriers/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "Failed to delete courier");
        return;
      }
      fetchCouriers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("couriers_updated"));
        try {
          localStorage.setItem("couriers_last_updated", Date.now().toString());
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Courier Companies
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage partner couriers, service coverage areas, default charges & view individual ledgers
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Courier</span>
        </button>
      </div>

      {/* Couriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading couriers...</span>
          </div>
        ) : couriers.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            No courier partners found. Click "Add New Courier" to create one.
          </div>
        ) : (
          couriers.map((c) => (
            <div
              key={c._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <Link
                        href={`/couriers/${c._id}`}
                        className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="flex items-center text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                          {c.serviceArea}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Edit Courier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourier(c._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Courier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact & Charge Information */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Contact Person:</span>
                    <p className="font-semibold text-slate-700">{c.contactPerson || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Phone Number:</span>
                    <p className="font-semibold text-slate-700 font-mono">{c.phone || "Not set"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-medium">Default Delivery Charge:</span>
                    <p className="font-bold text-slate-800">{formatNPR(c.defaultDeliveryCharge)}</p>
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Total Parcels
                    </span>
                    <p className="text-base font-extrabold text-slate-800">
                      {c.totalParcels || 0}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total COD</span>
                    <p className="text-base font-extrabold text-blue-600">
                      {formatNPR(c.totalCOD || 0)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-amber-700">
                      Outstanding Due
                    </span>
                    <p className="text-base font-extrabold text-amber-700">
                      {formatNPR(c.currentDue || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/couriers/${c._id}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <span>Open Courier Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/settlements?courierId=${c._id}`}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition-colors"
                >
                  Settle Due
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCourier ? "Edit Courier Company" : "Add New Courier Partner"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourier} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Courier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pathao Logistics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Area
                  </label>
                  <select
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Inside Valley">Inside Valley</option>
                    <option value="Outside Valley">Outside Valley</option>
                    <option value="Both">Both (Valley & Nationwide)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Delivery Charge (Rs.)
                </label>
                <input
                  type="number"
                  value={defaultDeliveryCharge}
                  onChange={(e) =>
                    setDefaultDeliveryCharge(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Daily 3 PM pickup, weekly Monday settlement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCourier ? "Save Changes" : "Create Courier"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

