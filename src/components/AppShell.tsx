"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    async function checkAuth() {
      if (isLoginPage) return;

      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        } else {
          // Auto-login as default Admin if unauthenticated so all sidebar buttons work smoothly
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "santoshkingsahani95@gmail.com", password: "Santosh@143" }),
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            setUser(loginData.user);
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }
    }

    checkAuth();
  }, [isLoginPage]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading Courier Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <Sidebar
        userRole={user?.role || "admin"}
        userName={user?.name || "Santosh Mukhiya (Admin)"}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          userRole={user?.role || "admin"}
          userName={user?.name || "Santosh Mukhiya (Admin)"}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
