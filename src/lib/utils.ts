import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Nepali Currency Formatter:
 * e.g., 54400 -> "Rs. 54,400"
 * No unnecessary decimals like ".00"
 */
export function formatNPR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "Rs. 0";
  }
  const isNegative = amount < 0;
  const absAmount = Math.round(Math.abs(amount));
  
  // Format with standard commas
  const formatted = absAmount.toLocaleString("en-IN");
  return isNegative ? `-Rs. ${formatted}` : `Rs. ${formatted}`;
}

export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Validates Nepali mobile numbers:
 * Standard 10 digits starting with 97 or 98 or 96 (NTC / Ncell / SmartCell)
 */
export function isValidNepaliMobile(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "").replace(/^(\+977)/, "");
  return /^(98|97|96)\d{8}$/.test(cleaned);
}

/**
 * Generate unique Batch Number, e.g. BAT-20261103-001
 */
export function generateBatchNumber(counter: number = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const num = String(counter).padStart(3, "0");
  return `BAT-${year}${month}${day}-${num}`;
}

/**
 * Generate unique Settlement Number, e.g. SET-20261103-001
 */
export function generateSettlementNumber(counter: number = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const num = String(counter).padStart(3, "0");
  return `SET-${year}${month}${day}-${num}`;
}

/**
 * Date range helpers for dashboard and filtering
 */
export function getDateRangePresets(preset: string) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  switch (preset) {
    case "today": {
      return { from: todayStr, to: todayStr };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      return { from: yStr, to: yStr };
    }
    case "last7days": {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return { from: past.toISOString().split("T")[0], to: todayStr };
    }
    case "last30days": {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return { from: past.toISOString().split("T")[0], to: todayStr };
    }
    case "thismonth": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: firstDay.toISOString().split("T")[0], to: todayStr };
    }
    case "prevmonth": {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: firstDay.toISOString().split("T")[0],
        to: lastDay.toISOString().split("T")[0],
      };
    }
    default:
      return { from: "", to: "" };
  }
}

