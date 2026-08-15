"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  HelpRequest,
  formatNgn,
  requestPhoto,
  statusLabel,
  storyExcerpt,
} from "@/lib/helpRequests";

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
          <p className="mt-3 max-w-lg text-ink-muted">
            Every gift is held until weekly payout. Choose someone and send help through Paystack.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white shadow-md shadow-brand/20 hover:bg-brand-deep"
        >
          Request help
        </Link>
      </div>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
        {items.map((item) => {
          const progress = item.goal_ngn > 0 ? Math.min(100, (item.raised_ngn / item.goal_ngn) * 100) : 0;
          return (
            <Link
              key={item.id}
              href={`/requests/${item.id}`}
              className="browse-card group flex flex-col overflow-hidden"
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={requestPhoto(item.photo_url)}
                  alt={item.full_name}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand shadow-sm backdrop-blur">
                  {statusLabel(item.status)}
                </span>
              </div>

              <div className="flex flex-1 flex-col border-t border-line/80 bg-white p-5 sm:p-6">
                <h2 className="font-display text-2xl font-semibold text-ink transition group-hover:text-brand">
                  {item.full_name}
                </h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                  {storyExcerpt(item.story, item.story_plain)}
                </p>

                <div className="mt-5">
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-brand">
                      {formatNgn(item.raised_ngn)} raised
                    </span>
                    <span className="text-ink-muted">of {formatNgn(item.goal_ngn)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-mid transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">
                  View & send help
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {!error && items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-white/70 px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold text-ink">No live requests yet</p>
          <p className="mt-2 text-ink-muted">Check back soon, or be the first to request help.</p>
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
