"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AuthUser, clearSession, getToken } from "@/lib/auth";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

type MyDonation = {
  id: string;
  status: string;
  gross_amount: number;
  net_to_request: number;
  created_at: string | null;
  help_request?: { id: string; full_name: string; status: string };
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mine, setMine] = useState<HelpRequest[]>([]);
  const [donations, setDonations] = useState<MyDonation[]>([]);
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
      api<{ items: MyDonation[] }>("/api/donations/mine"),
    ])
      .then(([me, requests, giftHistory]) => {
        setUser(me);
        setEmail(me.email ?? "");
        setMine(requests.items);
        setDonations(giftHistory.items);
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

  async function requestRefund(donationId: string) {
    if (!window.confirm("Request a refund for this held donation?")) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await api<{ refund: { status: string } }>(
        `/api/donations/${donationId}/refund`,
        { method: "POST" },
      );
      setDonations((items) =>
        items.map((item) =>
          item.id === donationId && res.refund.status === "success"
            ? { ...item, status: "refunded" }
            : item,
        ),
      );
      setMessage(`Refund status: ${res.refund.status}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not request refund");
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
        Manage your request, payout bank details, donation history, and held-gift refunds.
      </p>

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

      {payoutRequest ? (
        <form onSubmit={saveBank} className="mt-8 space-y-4 border border-line bg-surface-elevated p-5">
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

      <section className="mt-8 border border-line bg-surface-elevated p-5">
        <h2 className="font-display text-xl font-semibold text-ink">My donations</h2>
        {donations.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No donations yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {donations.map((donation) => (
              <li key={donation.id} className="border-b border-line pb-3">
                <p className="font-medium text-ink">
                  {donation.help_request?.full_name ?? "Help request"}
                </p>
                <p className="mt-1 text-ink-muted">
                  {formatNgn(donation.gross_amount)} · {statusLabel(donation.status)}
                </p>
                {donation.help_request ? (
                  <Link
                    href={`/requests/${donation.help_request.id}`}
                    className="mt-1 inline-block text-brand hover:underline"
                  >
                    View
                  </Link>
                ) : null}
                {donation.status === "held" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => requestRefund(donation.id)}
                    className="ml-3 text-danger hover:underline disabled:opacity-60"
                  >
                    Request refund
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
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
