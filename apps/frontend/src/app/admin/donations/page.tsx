"use client";

import { Suspense } from "react";
import AdminDonationsContent from "./DonationsContent";

export default function AdminDonationsPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading donations…</p>}>
      <AdminDonationsContent />
    </Suspense>
  );
}
