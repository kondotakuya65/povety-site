"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AuthUser, clearSession, getToken } from "@/lib/auth";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mine, setMine] = useState<HelpRequest[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api<AuthUser>("/api/auth/me"),
      api<{ items: HelpRequest[] }>("/api/help-requests/mine"),
    ])
      .then(([me, requests]) => {
        setUser(me);
        setEmail(me.email ?? "");
        setMine(requests.items);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const updated = await api<AuthUser>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      setUser(updated);
      setMessage("Email saved for receipts.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save email");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-ink-muted sm:px-6">Loading…</div>;
  }

  const open = mine.find((item) => ["draft", "pending_review", "live"].includes(item.status));

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">Account</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Your Prosperax account</h1>

      <dl className="mt-8 space-y-3 border border-line bg-surface-elevated p-5 text-sm">
        <div>
          <dt className="text-ink-muted">Phone</dt>
          <dd className="font-medium text-ink">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Role</dt>
          <dd className="font-medium text-ink">{user.role}</dd>
        </div>
      </dl>

      <section className="mt-8 border border-line bg-surface-elevated p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">My help request</h2>
          {!open ? (
            <Link href="/requests/new" className="text-sm font-medium text-brand hover:underline">
              Create
            </Link>
          ) : null}
        </div>
        {open ? (
          <div className="mt-4 text-sm">
            <p className="font-medium text-ink">{open.full_name}</p>
            <p className="mt-1 capitalize text-ink-muted">{statusLabel(open.status)}</p>
            <p className="mt-2 text-brand">
              {formatNgn(open.raised_ngn)} / {formatNgn(open.goal_ngn)}
            </p>
            <Link href={`/requests/${open.id}`} className="mt-3 inline-block text-brand hover:underline">
              View request
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No open request yet.</p>
        )}
      </section>

      <form onSubmit={saveEmail} className="mt-8 space-y-4">
        <label className="block text-sm font-medium text-ink">
          Email for receipts
          <input
            type="email"
            className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-brand">{message}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save email"}
        </button>
      </form>
    </div>
  );
}
