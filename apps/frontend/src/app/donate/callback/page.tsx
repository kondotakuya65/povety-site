import { Suspense } from "react";
import DonateCallbackClient from "./DonateCallbackClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-ink-muted">Loading…</div>}>
      <DonateCallbackClient />
    </Suspense>
  );
}
