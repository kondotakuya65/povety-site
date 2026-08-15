"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  HelpRequest,
  formatNgn,
  requestPhoto,
  statusLabel,
  storyExcerpt,
} from "@/lib/helpRequests";

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "live", label: "Live" },
  { value: "funded", label: "Funded" },
  { value: "closed_refunded", label: "Refunded" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminRequestsContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("status") ?? "";
  const [status, setStatus] = useState(initial);
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    const res = await api<{ items: HelpRequest[] }>(`/api/admin/help-requests${query}`);
    setItems(res.items);
  }, []);

  useEffect(() => {
    load(status).catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load requests"),
    );
  }, [load, status]);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/help-requests/${id}/approve`, { method: "POST" });
      await load(status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reject reason (optional)") ?? "";
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/help-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
      });
      await load(status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Management</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Help requests</h1>
        <p className="mt-2 text-ink-muted">Review, approve, and track every request status.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              status === filter.value
                ? "bg-brand text-white"
                : "border border-line bg-white text-ink-muted hover:border-brand"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={requestPhoto(item.photo_url)}
                alt={item.full_name}
                className="h-28 w-full rounded-xl object-cover sm:h-28 sm:w-36"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ink">{item.full_name}</h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand">
                      {statusLabel(item.status)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-brand">
                    {formatNgn(item.raised_ngn)} / {formatNgn(item.goal_ngn)}
                  </p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                  {storyExcerpt(item.story, item.story_plain)}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Verify via {item.verification_type}
                  {item.verification_type === "nin"
                    ? `: ${item.verification_nin ?? "—"}`
                    : `: ${item.verification_phone ?? "—"}`}
                  {item.bank_code
                    ? ` · Bank ${item.bank_code} / ${item.account_number} (${item.account_name})`
                    : " · No bank details yet"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status === "pending_review" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => approve(item.id)}
                        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => reject(item.id)}
                        className="rounded-full border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  <Link
                    href={`/requests/${item.id}`}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-muted hover:border-brand hover:text-brand"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-10 text-center text-ink-muted">
            No requests in this filter.
          </p>
        ) : null}
      </div>
    </div>
  );
}
