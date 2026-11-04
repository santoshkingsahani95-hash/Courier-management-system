"use client";

import { useState, useEffect } from "react";
import { canEditOrDelete } from "./permissions";

export function useUserRole() {
  const [user, setUser] = useState<{
    _id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (isMounted && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const role = user?.role || "staff";
  const isAdminOrManager = canEditOrDelete(role);
  const isStaff = role === "staff";

  return {
    user,
    role,
    isAdminOrManager,
    canEdit: isAdminOrManager,
    canDelete: isAdminOrManager,
    isStaff,
    loading,
  };
}
