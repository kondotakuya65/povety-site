"use client";

import { Suspense } from "react";
import AdminRequestsContent from "./RequestsContent";

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading requests…</p>}>
      <AdminRequestsContent />
    </Suspense>
  );
}
