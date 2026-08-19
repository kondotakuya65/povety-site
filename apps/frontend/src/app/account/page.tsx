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
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
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
        const request = requests.items.find((item) =>
          ["draft", "pending_review", "live", "funded"].includes(item.status),
        );
        setBankCode(request?.bank_code ?? "");
        setAccountNumber(request?.account_number ?? "");
        setAccountName(request?.account_name ?? "");
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

  async function saveBank(e: FormEvent) {
    e.preventDefault();
    const target = mine.find((item) =>
      ["draft", "pending_review", "live", "funded"].includes(item.status),
    );
    if (!target) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const updated = await api<HelpRequest>(`/api/help-requests/${target.id}/bank-details`, {
        method: "PATCH",
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
        }),
      });
      setMine((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Payout bank details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save bank details");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-ink-muted sm:px-6">Loading…</div>;
  }

  const open = mine.find((item) => ["draft", "pending_review", "live"].includes(item.status));
  const payoutRequest = open ?? mine.find((item) => item.status === "funded");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">Account</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Your Prosperax account</h1>
      <p className="mt-3 text-ink-muted">
        Phone, receipt email, and payout bank details. Help and gift history live on their own pages.
      </p>

      <dl className="mt-8 space-y-3 rounded-2xl border border-line bg-surface-elevated p-5 text-sm">
        <div>
          <dt className="text-ink-muted">Phone</dt>
          <dd className="font-medium text-ink">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Role</dt>
          <dd className="font-medium text-ink">{user.role}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/help"
          className="rounded-2xl border border-line bg-surface-elevated p-5 shadow-sm transition hover:border-brand"
        >
          <p className="font-display text-lg font-semibold text-ink">Help history</p>
          <p className="mt-1 text-sm text-ink-muted">
            {open ? `${statusLabel(open.status)} · ${formatNgn(open.raised_ngn)} raised` : "View and cancel requests"}
          </p>
        </Link>
        <Link
          href="/account/gifts"
          className="rounded-2xl border border-line bg-surface-elevated p-5 shadow-sm transition hover:border-brand"
        >
          <p className="font-display text-lg font-semibold text-ink">Gifts sent</p>
          <p className="mt-1 text-sm text-ink-muted">Donation history and held-gift refunds</p>
        </Link>
      </div>

      {payoutRequest ? (
        <form onSubmit={saveBank} className="mt-8 space-y-4 rounded-2xl border border-line bg-surface-elevated p-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Payout bank details</h2>
            <p className="mt-1 text-sm text-ink-muted">Required before a funded request can be paid.</p>
          </div>
          <label className="block text-sm font-medium text-ink">
            Bank code
            <input
              className="mt-2 w-full border border-line px-3 py-2.5 outline-none focus:border-brand"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Account number
            <input
              inputMode="numeric"
              className="mt-2 w-full border border-line px-3 py-2.5 outline-none focus:border-brand"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Account name
            <input
              className="mt-2 w-full border border-line px-3 py-2.5 outline-none focus:border-brand"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            Save payout details
          </button>
        </form>
      ) : null}

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
