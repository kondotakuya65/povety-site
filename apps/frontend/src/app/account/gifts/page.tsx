"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";
import { formatNgn, statusLabel } from "@/lib/helpRequests";

type MyDonation = {
  id: string;
  status: string;
  gross_amount: number;
  net_to_request: number;
  created_at: string | null;
  help_request?: { id: string; full_name: string; status: string };
};

export default function GiftHistoryPage() {
  const router = useRouter();
  const [donations, setDonations] = useState<MyDonation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ items: MyDonation[] }>("/api/donations/mine")
      .then((res) => setDonations(res.items))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load gifts");
      });
  }, [router]);

  async function requestRefund(donationId: string) {
    if (!window.confirm("Request a refund for this held donation?")) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await api<{ refund: { status: string } }>(`/api/donations/${donationId}/refund`, {
        method: "POST",
      });
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/account" className="text-sm text-ink-muted hover:text-brand">
        ← Account
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        Your gifts
      </p>
      <h1 className="font-display mt-1 text-4xl font-semibold text-ink">Gifts sent</h1>
      <p className="mt-3 text-ink-muted">
        Held gifts can be refunded from here while they are still waiting for weekly payout.
      </p>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-6 text-sm text-brand">{message}</p> : null}

      {donations.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold text-ink">No gifts yet</p>
          <p className="mt-2 text-ink-muted">When you send help, it will show up here.</p>
          <Link
            href="/requests"
            className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep"
          >
            Browse live needs
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-3">
          {donations.map((donation) => (
            <li key={donation.id} className="rounded-2xl border border-line bg-white p-5 text-sm shadow-sm">
              <p className="font-medium text-ink">
                {donation.help_request?.full_name ?? "Help request"}
              </p>
              <p className="mt-1 text-ink-muted">
                {formatNgn(donation.gross_amount)} · {statusLabel(donation.status)}
                {donation.created_at
                  ? ` · ${new Date(donation.created_at).toLocaleDateString("en-NG")}`
                  : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {donation.help_request ? (
                  <Link
                    href={`/requests/${donation.help_request.id}`}
                    className="text-brand hover:underline"
                  >
                    View request
                  </Link>
                ) : null}
                {donation.status === "held" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => requestRefund(donation.id)}
                    className="text-danger hover:underline disabled:opacity-60"
                  >
                    Request refund
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
