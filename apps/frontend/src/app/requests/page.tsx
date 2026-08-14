"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

export default function BrowseRequestsPage() {
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: HelpRequest[] }>("/api/help-requests", { auth: false })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load requests"));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
            Live needs
          </p>
          <h1 className="font-display text-4xl font-semibold text-ink">Browse help requests</h1>
        </div>
        <Link href="/requests/new" className="bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep">
          Request help
        </Link>
      </div>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/requests/${item.id}`}
            className="border border-line bg-surface-elevated p-4 hover:border-brand"
          >
            {item.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo_url} alt={item.full_name} className="mb-4 h-48 w-full object-cover" />
            ) : null}
            <h2 className="font-display text-2xl font-semibold text-ink">{item.full_name}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{item.story}</p>
            <p className="mt-4 text-sm font-medium text-brand">
              {formatNgn(item.raised_ngn)} raised of {formatNgn(item.goal_ngn)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">{statusLabel(item.status)}</p>
          </Link>
        ))}
      </div>

      {!error && items.length === 0 ? (
        <p className="mt-10 text-ink-muted">No live requests yet. Check back soon.</p>
      ) : null}
    </div>
  );
}
