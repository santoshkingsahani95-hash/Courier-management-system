"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("santoshkingsahani95@gmail.com");
  const [password, setPassword] = useState("Santosh@143");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Truck className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Courier Management System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          COD Settlement, Bulk Parcel Entry & Due Tracking
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@courier.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick One-Click Demo Sign-In
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("santoshkingsahani95@gmail.com", "Santosh@143")}
                className="p-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 rounded-lg text-center transition-colors group"
              >
                <div className="flex justify-center text-blue-600 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-800">Admin</div>
                <div className="text-[9px] text-slate-500">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("manager@courier.com", "manager123")}
                className="p-2 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 rounded-lg text-center transition-colors group"
              >
                <div className="flex justify-center text-purple-600 mb-1">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-800">Manager</div>
                <div className="text-[9px] text-slate-500">Operations</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("staff@courier.com", "staff123")}
                className="p-2 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 rounded-lg text-center transition-colors group"
              >
                <div className="flex justify-center text-emerald-600 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-bold text-slate-800">Staff</div>
                <div className="text-[9px] text-slate-500">Fast Entry</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

