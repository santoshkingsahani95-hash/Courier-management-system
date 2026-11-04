"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Calendar, Bell, LogOut, Loader2, ArrowRight, X, Package, Layers, Calculator } from "lucide-react";
import { formatNPR } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

export default function Navbar({ userName = "Admin", userRole = "admin" }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    parcels: any[];
    batches: any[];
    settlements: any[];
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Nepal current date formatted
  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || { parcels: [], batches: [], settlements: [] });
        setIsSearchOpen(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search flyout
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Global Search Bar */}
      <div className="relative w-96" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Track by Mobile Number, Customer, Batch, Settlement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setIsSearchOpen(true);
            }}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-[460px] overflow-y-auto p-2 z-50">
            {searchResults.parcels.length === 0 &&
            searchResults.batches.length === 0 &&
            searchResults.settlements.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching records found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-3">
                {/* Parcels */}
                {searchResults.parcels.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Package className="w-3 h-3 text-blue-500" />
                      <span>Parcels ({searchResults.parcels.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {searchResults.parcels.slice(0, 8).map((p) => (
                        <div
                          key={p._id}
                          className="p-3 hover:bg-slate-50 rounded-xl text-xs border border-slate-100 transition-colors space-y-1.5"
                        >
                          <div className="flex justify-between items-start font-medium">
                            <span className="text-slate-900 font-bold">{p.customerName}</span>
                            <span className="text-blue-600 font-extrabold font-mono">{formatNPR(p.codAmount)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-600">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              📞 {p.mobile}
                            </span>
                            <span className="font-mono text-slate-500 text-[10px]">
                              {p.batchNumber || "Batch Handover"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                            <span className="font-medium text-slate-700">{p.courierName}</span>
                            <div className="flex items-center space-x-1.5">
                              {p.status === "Returned" ? (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-red-100 text-red-800 border border-red-200 uppercase text-[9px]">
                                  RETURNED {p.returnReason ? `(${p.returnReason})` : ""}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] uppercase">
                                  DELIVERED / SETTLEMENT READY
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  p.settlementStatus === "Settled"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {p.settlementStatus || "Unsettled"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Batches */}
                {searchResults.batches.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers className="w-3 h-3 text-purple-500" />
                      <span>Batches ({searchResults.batches.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {searchResults.batches.slice(0, 3).map((b) => (
                        <Link
                          key={b._id}
                          href="/batches"
                          className="block p-2 hover:bg-slate-50 rounded-lg text-xs border border-slate-100"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-800">
                              {b.batchNumber}
                            </span>
                            <span className="text-slate-500">{b.batchDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {b.courierName} &bull; {b.totalPackages} packages &bull;{" "}
                            {formatNPR(b.totalCOD)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settlements */}
                {searchResults.settlements.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calculator className="w-3 h-3 text-emerald-500" />
                      <span>Settlements ({searchResults.settlements.length})</span>
                    </div>
                    <div className="space-y-1 mt-1">
                      {searchResults.settlements.slice(0, 3).map((s) => (
                        <Link
                          key={s._id}
                          href="/settlements"
                          className="block p-2 hover:bg-slate-50 rounded-lg text-xs border border-slate-100"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-800">
                              {s.settlementNumber}
                            </span>
                            <span className="text-emerald-600 font-semibold">
                              Due: {formatNPR(s.remainingDue)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {s.courierName} &bull; Receivable: {formatNPR(s.totalReceivable)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Cache Pre-warmed Pill */}
        <Link
          href="/settings"
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-[11px] font-bold text-emerald-700 transition-colors"
          title="Database Object Cache: Pre-warmed in RAM (<0.2ms latency). Click to view cache telemetry in Settings."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cache Warm</span>
        </Link>

        {/* Today's Date Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{todayFormatted}</span>
        </div>

        {/* User Profile & Quick Logout */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">{userName}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">
              {userRole}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

