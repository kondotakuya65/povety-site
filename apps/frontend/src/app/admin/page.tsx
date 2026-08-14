"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

type Ping = { ok: boolean; role: string; phone: string };

export default function AdminPage() {
  const router = useRouter();
  const [ping, setPing] = useState<Ping | null>(null);
  const [pending, setPending] = useState<HelpRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPending() {
    const res = await api<{ items: HelpRequest[] }>("/api/admin/help-requests?status=pending_review");
    setPending(res.items);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([api<Ping>("/api/admin/ping"), loadPending()])
      .then(([pingRes]) => setPing(pingRes))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setError("Admin only.");
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load admin");
      });
  }, [router]);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/help-requests/${id}/approve`, { method: "POST" });
      await loadPending();
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
      await loadPending();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">Admin</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Review console</h1>
      <p className="mt-3 text-ink-muted">Approve or reject pending help requests.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/settings" className="border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand-soft">
          Settings
        </Link>
        <Link href="/requests" className="border border-line px-4 py-2 font-semibold text-ink-muted hover:border-brand">
          Browse live
        </Link>
      </div>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {ping ? <p className="mt-4 text-sm text-ink-muted">Signed in as {ping.phone}</p> : null}

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Pending review</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted">No pending requests.</p>
        ) : (
          pending.map((item) => (
            <div key={item.id} className="border border-line bg-surface-elevated p-4">
              <div className="flex flex-wrap gap-4">
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt={item.full_name} className="h-24 w-24 object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.full_name}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{item.story}</p>
                  <p className="mt-2 text-sm text-brand">
                    Goal {formatNgn(item.goal_ngn)} · {statusLabel(item.status)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Verify via {item.verification_type}
                    {item.verification_type === "nin" ? `: ${item.verification_nin}` : `: ${item.verification_phone}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => approve(item.id)}
                      className="bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => reject(item.id)}
                      className="border border-danger px-3 py-2 text-sm font-semibold text-danger disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <Link href={`/requests/${item.id}`} className="px-3 py-2 text-sm text-ink-muted hover:text-brand">
                      Open
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
