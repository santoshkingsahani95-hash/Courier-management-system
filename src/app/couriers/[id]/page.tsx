"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  Layers,
  Calculator,
  CreditCard,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  PlusCircle,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatNPR, formatDate, formatDateTime } from "@/lib/utils";

export default function CourierDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "parcels" | "batches" | "settlements" | "payments" | "ledger"
  >("parcels");

  useEffect(() => {
    fetchCourierData();
  }, [id]);

  async function fetchCourierData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/couriers/${id}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <span>Loading courier dashboard...</span>
      </div>
    );
  }

  if (!data?.courier) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Courier not found.</p>
        <Link href="/couriers" className="text-blue-600 underline mt-2 inline-block text-xs">
          Back to Couriers
        </Link>
      </div>
    );
  }

  const { courier, summary, parcels, batches, settlements, payments, ledger } = data;

  return (
    <div className="space-y-5">
      {/* Back button & Title Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/couriers"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {courier.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                  {courier.serviceArea}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contact: <strong>{courier.contactPerson || "N/A"}</strong> ({courier.phone || "N/A"})
                &bull; Default Delivery: <strong>{formatNPR(courier.defaultDeliveryCharge)}</strong>{" "}
                &bull; Return Charge: <strong>Free (Rs. 0)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/settlements?courierId=${courier._id}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Finalize Settlement
            </Link>
          </div>
        </div>

        {/* Financial KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Packages</span>
            <div className="text-lg font-extrabold text-slate-900">{summary.totalPackages}</div>
            <div className="text-[10px] text-slate-400">
              {summary.delivered} Del / {summary.returned} Ret
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-blue-600">Gross COD</span>
            <div className="text-lg font-extrabold text-blue-700">
              {formatNPR(summary.grossCOD)}
            </div>
            <div className="text-[10px] text-blue-600">From delivered parcels</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-500">Delivery Charge</span>
            <div className="text-lg font-bold text-slate-800">
              {formatNPR(summary.deliveryCharges)}
            </div>
            <div className="text-[10px] text-slate-400">Payable to courier</div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Total Received</span>
            <div className="text-lg font-extrabold text-emerald-700">
              {formatNPR(summary.totalReceived)}
            </div>
            <div className="text-[10px] text-emerald-600">Paid by courier</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-800">Outstanding Due</span>
            <div className="text-lg font-extrabold text-amber-800">
              {formatNPR(summary.outstandingDue)}
            </div>
            <div className="text-[10px] text-amber-700 font-semibold">Courier owes us</div>
          </div>
        </div>
      </div>

      {/* 5 Tabs Header */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 space-x-2 text-xs font-bold">
        {[
          { id: "parcels", label: "Parcels", count: parcels.length, icon: Package },
          { id: "batches", label: "Batches", count: batches.length, icon: Layers },
          { id: "settlements", label: "Settlements", count: settlements.length, icon: Calculator },
          { id: "payments", label: "Payments", count: payments.length, icon: CreditCard },
          { id: "ledger", label: "Ledger", count: ledger.length, icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-1.5 py-3 px-4 border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Parcels */}
      {activeTab === "parcels" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Tracking ID</th>
                  <th className="py-2.5 px-3 text-right">COD Amount</th>
                  <th className="py-2.5 px-3 text-right">Delivery Charge</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No parcels recorded for this courier yet.
                    </td>
                  </tr>
                ) : (
                  parcels.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.customerName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{p.mobile}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {p.trackingId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatNPR(p.codAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatNPR(p.actualDeliveryCharge ?? p.deliveryCharge)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
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
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.settlementStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Batches */}
      {activeTab === "batches" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Batch ID</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Packages</th>
                  <th className="py-2.5 px-4 text-right">Total COD</th>
                  <th className="py-2.5 px-4">Notes</th>
                  <th className="py-2.5 px-4">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No batches recorded for this courier yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {b.batchNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{b.batchDate}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                        {b.totalPackages}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {formatNPR(b.totalCOD)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{b.notes || "-"}</td>
                      <td className="py-3 px-4 text-slate-500">{b.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Settlements */}
      {activeTab === "settlements" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Settlement ID</th>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4 text-right">Gross COD</th>
                  <th className="py-2.5 px-4 text-right">Total Charges</th>
                  <th className="py-2.5 px-4 text-right">Total Receivable</th>
                  <th className="py-2.5 px-4 text-right">Paid</th>
                  <th className="py-2.5 px-4 text-right">Remaining Due</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No settlements finalized for this courier yet.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s: any) => (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">
                        {s.settlementNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.fromDate} to {s.toDate}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatNPR(s.grossCOD)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-700 font-medium">
                        {formatNPR(s.deliveryCharges)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                        {formatNPR(s.totalReceivable)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {formatNPR(s.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                        {formatNPR(s.remainingDue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.paymentStatus === "Partially Paid"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Payments */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Reference No.</th>
                  <th className="py-2.5 px-4">Remarks</th>
                  <th className="py-2.5 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No payments recorded for this courier yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((pay: any) => (
                    <tr key={pay._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-600">{pay.paymentDate}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{pay.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                        {formatNPR(pay.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {pay.referenceNumber || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{pay.remarks || "-"}</td>
                      <td className="py-3 px-4 text-slate-500">{pay.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Ledger */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Debit (Owed to Us)</th>
                  <th className="py-2.5 px-4 text-right">Credit (Paid/Charges)</th>
                  <th className="py-2.5 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No ledger transactions yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((l: any) => (
                    <tr key={l._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-600">{l.transactionDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {l.transactionType}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{l.description}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {l.debit > 0 ? formatNPR(l.debit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {l.credit > 0 ? formatNPR(l.credit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-amber-800">
                        {formatNPR(l.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

