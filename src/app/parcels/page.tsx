"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ParcelsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/batches");
  }, [router]);

  return (
    <div className="py-20 text-center text-xs text-slate-400">
      Redirecting to Dispatched Batches & Parcels...
    </div>
  );
}
