"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";
import {
  HelpRequest,
  formatNgn,
  requestPhoto,
  statusLabel,
  storyExcerpt,
} from "@/lib/helpRequests";

const CANCELLABLE = new Set(["draft", "pending_review", "live"]);

export default function HelpHistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ items: HelpRequest[] }>("/api/help-requests/mine")
      .then((res) => setItems(res.items))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load help history");
      });
  }, [router]);

  async function cancelRequest(item: HelpRequest) {
    const warning =
      item.status === "live" && item.raised_ngn > 0
        ? "Cancel this live request? Held gifts will be refunded to donors."
        : "Cancel this help request? You can create a new one afterwards.";
    if (!window.confirm(warning)) return;
    setBusyId(item.id);
    setError(null);
    setMessage(null);
    try {
      const updated = await api<HelpRequest>(`/api/help-requests/${item.id}/cancel`, {
        method: "POST",
      });
      setItems((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setMessage(
        item.status === "live"
          ? "Request cancelled. Any held gifts are being refunded."
          : "Request cancelled.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel request");
    } finally {
      setBusyId(null);
    }
  }

  const open = items.find((item) => CANCELLABLE.has(item.status));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/account" className="text-sm text-ink-muted hover:text-brand">
        ← Account
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
            Your requests
          </p>
          <h1 className="font-display mt-1 text-4xl font-semibold text-ink">Help history</h1>
          <p className="mt-3 max-w-xl text-ink-muted">
            Track every request you have published. You can cancel a request while it is pending or
            live. Funded requests cannot be cancelled.
          </p>
        </div>
        {!open ? (
          <Link
            href="/requests/new"
            className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep"
          >
            Request help
          </Link>
        ) : null}
      </div>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-6 text-sm text-brand">{message}</p> : null}

      <div className="mt-10 space-y-5">
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
                className="h-32 w-full rounded-xl object-cover sm:h-28 sm:w-40"
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.status === "live" || item.status === "funded" || item.status === "pending_review" ? (
                    <Link
                      href={`/requests/${item.id}`}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-muted hover:border-brand hover:text-brand"
                    >
                      Open
                    </Link>
                  ) : null}
                  {CANCELLABLE.has(item.status) ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => cancelRequest(item)}
                      className="rounded-full border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
                    >
                      {busyId === item.id ? "Cancelling…" : "Cancel request"}
                    </button>
                  ) : null}
                </div>
                {item.status === "funded" ? (
                  <p className="mt-3 text-xs text-ink-muted">
                    Goal met — payout happens on the weekly cycle. Cancel is not available.
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold text-ink">No help requests yet</p>
          <p className="mt-2 text-ink-muted">When you publish a need, it will appear here.</p>
          <Link
            href="/requests/new"
            className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep"
          >
            Request help
          </Link>
        </div>
      ) : null}
    </div>
  );
}
