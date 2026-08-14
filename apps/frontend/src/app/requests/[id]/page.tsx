"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<HelpRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api<HelpRequest>(`/api/help-requests/${params.id}`)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load request"));
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-danger">{error}</p>
        <Link href="/requests" className="mt-4 inline-block text-brand hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  if (!item) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-ink-muted sm:px-6">Loading…</div>;
  }

  const progress = item.goal_ngn > 0 ? Math.min(100, (item.raised_ngn / item.goal_ngn) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/requests" className="text-sm text-ink-muted hover:text-brand">
        ← Browse
      </Link>
      <div className="mt-6 overflow-hidden border border-line bg-surface-elevated">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt={item.full_name} className="h-72 w-full object-cover" />
        ) : null}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-mid">
            {statusLabel(item.status)}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-ink">{item.full_name}</h1>
          <p className="mt-4 whitespace-pre-wrap text-ink-muted">{item.story}</p>

          <div className="mt-8">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-brand">{formatNgn(item.raised_ngn)} raised</span>
              <span className="text-ink-muted">Goal {formatNgn(item.goal_ngn)}</span>
            </div>
            <div className="h-2 bg-brand-soft">
              <div className="h-2 bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {item.deadline_at ? (
            <p className="mt-4 text-sm text-ink-muted">
              Deadline: {new Date(item.deadline_at).toLocaleDateString("en-NG")}
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Deadline: {item.deadline_days} days after approval</p>
          )}

          {item.status === "live" ? (
            <p className="mt-6 border border-line bg-brand-soft px-4 py-3 text-sm text-brand-deep">
              Donations arrive in Phase 4 (Paystack). For now this request is live for discovery.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
