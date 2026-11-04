"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Layers,
  Truck,
  Calculator,
  CreditCard,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  Users,
  Settings,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

export default function Sidebar({ userRole = "admin", userName = "User" }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "New Entry", href: "/new-entry", icon: PlusCircle, highlight: true },
    { name: "Batches", href: "/batches", icon: Layers },
    { name: "Returns", href: "/returns", icon: RotateCcw, badge: "Inward" },
    { name: "Couriers", href: "/couriers", icon: Truck },
    { name: "Settlements", href: "/settlements", icon: Calculator },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Ledger", href: "/ledger", icon: BookOpen },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Import / Export", href: "/import-export", icon: FileSpreadsheet },
    ...(userRole === "admin"
      ? [
          { name: "Users", href: "/users", icon: Users },
          { name: "Settings", href: "/settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm leading-tight tracking-tight">
              Courier Hub
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">COD Settlement Pro</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                item.highlight && !isActive && "text-blue-600 bg-blue-50/50 hover:bg-blue-100/60"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-blue-600"
                      : item.highlight
                      ? "text-blue-500"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.highlight && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                  Bulk
                </span>
              )}
              {item.badge && !item.highlight && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card & Role Indicator */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <div className="flex items-center space-x-3 p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
            {userName.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                {userRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

