"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";
import { formatNgn, statusLabel } from "@/lib/helpRequests";

type Payout = {
  id: string;
  amount: number;
  status: string;
  recipient_account_name: string | null;
  failure_reason: string | null;
};

type Batch = {
  id: string;
  status: string;
  notes: string | null;
  started_at: string | null;
  payouts: Payout[];
};

type Refund = {
  id: string;
  donation_id: string;
  amount: number;
  reason: string;
  status: string;
  notes: string | null;
  created_at: string | null;
};

export default function AdminMoneyPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ payout_batches: Batch[]; refunds: Refund[] }>(
      "/api/admin/money-operations",
    );
    setBatches(res.payout_batches);
    setRefunds(res.refunds);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load().catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not load money operations");
    });
  }, [load, router]);

  async function runPayouts() {
    if (!window.confirm("Run weekly payouts for fully funded requests?")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{ batch: Batch }>("/api/admin/payouts/run", { method: "POST" });
      setMessage(`Payout batch ${statusLabel(res.batch.status)}: ${res.batch.notes ?? "complete"}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payout run failed");
    } finally {
      setBusy(false);
    }
  }

  async function sweepDeadlines() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api<{
        expired_requests: number;
        processed: number;
        failed: number;
      }>("/api/admin/refunds/sweep-deadlines", { method: "POST" });
      setMessage(
        `${res.expired_requests} expired request(s); ${res.processed} refund(s) processed; ${res.failed} failed.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Deadline sweep failed");
    } finally {
      setBusy(false);
    }
  }

  async function retryRefund(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/refunds/${id}/retry`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refund retry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Money</p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Payouts & refunds</h1>
          <p className="mt-2 text-ink-muted">Run weekly transfers and manage unmet-goal / failed refunds.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={runPayouts}
          className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          Run weekly payouts
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={sweepDeadlines}
          className="rounded-full border border-brand px-5 py-2.5 font-semibold text-brand disabled:opacity-60"
        >
          Sweep expired requests
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <section>
        <h2 className="font-display text-2xl font-semibold text-ink">Payout batches</h2>
        <div className="mt-4 space-y-4">
          {batches.length === 0 ? (
            <p className="text-sm text-ink-muted">No payout batches yet.</p>
          ) : (
            batches.map((batch) => (
              <article key={batch.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <p className="font-semibold capitalize text-ink">{statusLabel(batch.status)}</p>
                <p className="mt-1 text-sm text-ink-muted">{batch.notes}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {batch.payouts.map((payout) => (
                    <li key={payout.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2">
                      <span>
                        {payout.recipient_account_name ?? "Missing recipient"} · {statusLabel(payout.status)}
                      </span>
                      <span className="font-medium text-brand">{formatNgn(payout.amount)}</span>
                      {payout.failure_reason ? (
                        <span className="w-full text-danger">{payout.failure_reason}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-ink">Refunds</h2>
        <div className="mt-4 space-y-3">
          {refunds.length === 0 ? (
            <p className="text-sm text-ink-muted">No refunds yet.</p>
          ) : (
            refunds.map((refund) => (
              <article key={refund.id} className="rounded-2xl border border-line bg-white p-4 text-sm shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="capitalize text-ink">
                    {statusLabel(refund.reason)} · {statusLabel(refund.status)}
                  </span>
                  <span className="font-medium text-brand">{formatNgn(refund.amount)}</span>
                </div>
                {refund.notes ? <p className="mt-2 text-danger">{refund.notes}</p> : null}
                {refund.status === "failed" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => retryRefund(refund.id)}
                    className="mt-3 text-brand hover:underline disabled:opacity-60"
                  >
                    Retry
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
