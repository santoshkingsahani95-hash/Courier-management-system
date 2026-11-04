"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  Calendar,
  Layers,
  Loader2,
  FileUp,
} from "lucide-react";
import { formatNPR } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ImportExportPage() {
  const router = useRouter();

  // Couriers
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    fetchCouriers();
  }, []);

  async function fetchCouriers() {
    try {
      const res = await fetch("/api/couriers");
      const d = await res.json();
      const list = d.couriers || [];
      setCouriers(list);
      if (list.length > 0) {
        setSelectedCourierId(list[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleFilePreview(selectedFile: File) {
    setFile(selectedFile);
    setIsPreviewing(true);
    setPreviewResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("action", "preview");

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const d = await res.json();
      if (res.ok) {
        setPreviewResult(d);
      } else {
        alert(d.error || "Failed to parse file");
      }
    } catch (e: any) {
      alert(e.message || "Error reading file");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommitImport() {
    if (!previewResult || !selectedCourierId) {
      alert("Please select a courier partner first.");
      return;
    }

    const validParcels = previewResult.rows.filter((r: any) => r.isValid);
    if (validParcels.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    setIsCommitting(true);
    try {
      const formData = new FormData();
      formData.append("action", "commit");
      formData.append("courierId", selectedCourierId);
      formData.append("batchDate", batchDate);
      formData.append("parcels", JSON.stringify(validParcels));

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const d = await res.json();
      if (res.ok) {
        alert(`Successfully imported ${d.importedCount} parcels into Batch ${d.batch.batchNumber}!`);
        router.push("/batches");
      } else {
        alert(d.error || "Import failed");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Excel Import & Export
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bulk upload parcel spreadsheets with validation, and export clean financial `.xlsx` reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>1. Upload Spreadsheet</span>
            </h2>

            {/* Drop Zone */}
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFilePreview(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {file ? file.name : "Choose Excel or CSV file"}
                </div>
                <p className="text-[10px] text-slate-400">
                  Supports .xlsx, .xls, .csv (Max 1,000 rows per batch)
                </p>
              </label>
            </div>

            {/* Courier & Batch Destination */}
            <div className="mt-4 space-y-3 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign to Courier Partner <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {couriers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Dispatch Date
                </label>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {previewResult && (
                <button
                  onClick={handleCommitImport}
                  disabled={isCommitting || previewResult.validCount === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  {isCommitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Commit {previewResult.validCount} Valid Parcels</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Export Downloads Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Quick Excel Downloads</span>
            </h2>

            <a
              href="/api/export?type=parcels"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>Export All Parcels</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a
              href="/api/export?type=settlements"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>Export All Settlements</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <a
              href="/api/export?type=ledger"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>Export Courier Ledger</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Right Side: Interactive Preview & Validation Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800">
                2. Validation Preview
              </h2>
              {previewResult && (
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {previewResult.validCount} Valid
                  </span>
                  <span className="flex items-center text-red-600 font-bold">
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    {previewResult.invalidCount} Invalid
                  </span>
                </div>
              )}
            </div>

            {isPreviewing ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
                <span className="text-xs">Analyzing and validating spreadsheet rows...</span>
              </div>
            ) : !previewResult ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Upload an Excel spreadsheet on the left to see the interactive validation preview.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Mobile (Tracking Ref)</th>
                      <th className="py-2.5 px-3 text-right">COD</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3 text-center">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.rows.map((r: any, idx: number) => (
                      <tr
                        key={idx}
                        className={r.isValid ? "hover:bg-slate-50" : "bg-red-50/40 hover:bg-red-50"}
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {r.customerName || (
                            <span className="text-red-500 italic">Missing Name</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {r.mobile || <span className="text-red-500 italic">Missing Mobile</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-700">
                          {formatNPR(r.codAmount)}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {r.sku || "-"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.isValid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Valid
                            </span>
                          ) : (
                            <div className="text-left text-[10px] text-red-600 font-medium">
                              {r.errors.join(", ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

