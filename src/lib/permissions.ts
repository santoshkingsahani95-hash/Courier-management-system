import { IUser, UserRole } from "./types";

/**
 * Returns true if the user role is authorized to EDIT or DELETE entries.
 * Admin and Manager are authorized; Staff is restricted to View/Create only.
 */
export function canEditOrDelete(role?: string | null): boolean {
  if (!role) return false;
  return role === "admin" || role === "manager";
}

/**
 * Backend authorization guard: returns allowed=true for admin and manager,
 * and a 403-ready error for staff or unauthenticated callers.
 */
export function checkEditOrDeletePermission(user: IUser | null | undefined): {
  allowed: boolean;
  status: number;
  error?: string;
} {
  if (!user) {
    return {
      allowed: false,
      status: 401,
      error: "Unauthorized: Please log in to perform this action.",
    };
  }

  if (!canEditOrDelete(user.role)) {
    return {
      allowed: false,
      status: 403,
      error: "Forbidden: Staff members cannot edit or delete entries. Only Admin and Manager are authorized.",
    };
  }

  return { allowed: true, status: 200 };
}

