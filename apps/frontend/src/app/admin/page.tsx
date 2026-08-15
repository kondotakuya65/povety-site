"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatNgn, statusLabel, storyExcerpt } from "@/lib/helpRequests";

type Overview = {
  stats: {
    users: number;
    pending_requests: number;
    live_requests: number;
    funded_requests: number;
    held_donations: number;
    held_total_ngn: number;
    gifted_last_7_days_ngn: number;
    open_refunds: number;
  };
  recent_requests: Array<{
    id: string;
    full_name: string;
    story: string;
    story_plain?: string;
    status: string;
    goal_ngn: number;
    raised_ngn: number;
  }>;
  recent_audit: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string | null;
  }>;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Overview>("/api/admin/overview")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load overview"));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-ink-muted">Loading overview…</p>;

  const cards = [
    { label: "Users", value: data.stats.users, href: "/admin/users" },
    { label: "Pending review", value: data.stats.pending_requests, href: "/admin/requests?status=pending_review" },
    { label: "Live requests", value: data.stats.live_requests, href: "/admin/requests?status=live" },
    { label: "Funded", value: data.stats.funded_requests, href: "/admin/requests?status=funded" },
    { label: "Held gifts", value: data.stats.held_donations, href: "/admin/donations?status=held" },
    { label: "Held total", value: formatNgn(data.stats.held_total_ngn), href: "/admin/money" },
    { label: "Gifted (7 days)", value: formatNgn(data.stats.gifted_last_7_days_ngn), href: "/admin/donations" },
    { label: "Open refunds", value: data.stats.open_refunds, href: "/admin/money" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Overview</h1>
        <p className="mt-2 text-ink-muted">Monitor users, requests, and money in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          >
            <p className="text-sm text-ink-muted">{card.label}</p>
            <p className="font-display mt-2 text-3xl font-semibold text-brand">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">Recent requests</h2>
            <Link href="/admin/requests" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {data.recent_requests.map((item) => (
              <li key={item.id} className="border-b border-line pb-3 last:border-0">
                <Link href={`/requests/${item.id}`} className="block hover:text-brand">
                  <p className="font-semibold text-ink">{item.full_name}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                    {storyExcerpt(item.story, item.story_plain)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-brand">
                    {statusLabel(item.status)} · {formatNgn(item.raised_ngn)} / {formatNgn(item.goal_ngn)}
                  </p>
                </Link>
              </li>
            ))}
            {data.recent_requests.length === 0 ? (
              <li className="text-sm text-ink-muted">No requests yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {data.recent_audit.map((item) => (
              <li key={item.id} className="border-b border-line pb-3 text-sm last:border-0">
                <p className="font-medium text-ink">{item.action.replaceAll("_", " ")}</p>
                <p className="mt-1 text-ink-muted">
                  {item.entity_type}
                  {item.entity_id ? ` · ${item.entity_id.slice(0, 8)}…` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {item.created_at ? new Date(item.created_at).toLocaleString("en-NG") : "—"}
                </p>
              </li>
            ))}
            {data.recent_audit.length === 0 ? (
              <li className="text-sm text-ink-muted">No audit events yet.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
