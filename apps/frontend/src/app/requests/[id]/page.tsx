"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { HelpRequest, formatNgn, statusLabel } from "@/lib/helpRequests";

type PublicSettings = {
  platform_fee_percent?: number;
  min_donation_ngn?: number;
};

type Supporter = {
  net_to_request: number;
  created_at: string | null;
  label: string;
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<HelpRequest | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({});
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [amount, setAmount] = useState("1000");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    const [request, publicSettings, support] = await Promise.all([
      api<HelpRequest>(`/api/help-requests/${params.id}`),
      api<PublicSettings>("/api/settings/public", { auth: false }),
      api<{ items: Supporter[] }>(`/api/help-requests/${params.id}/supporters`, { auth: false }),
    ]);
    setItem(request);
    setSettings(publicSettings);
    setSupporters(support.items);
    setAmount((prev) => prev || String(publicSettings.min_donation_ngn ?? 1000));
  }, [params.id]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Could not load request"));
  }, [load]);

  async function donate(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (!getToken()) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setDonateError(null);
    try {
      const res = await api<{ authorization_url: string }>("/api/donations/initialize", {
        method: "POST",
        body: JSON.stringify({
          help_request_id: item.id,
          amount: Number(amount),
          email: email || null,
        }),
      });
      window.location.href = res.authorization_url;
    } catch (err) {
      setDonateError(err instanceof ApiError ? err.message : "Could not start donation");
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-danger">{error}</p>
        <Link href="/requests" className="mt-4 inline-block text-brand hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  if (!item) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-ink-muted sm:px-6">Loading…</div>;
  }

  const progress = item.goal_ngn > 0 ? Math.min(100, (item.raised_ngn / item.goal_ngn) * 100) : 0;
  const feePercent = settings.platform_fee_percent ?? 0;
  const gross = Number(amount) || 0;
  const feeAmount = Math.round(gross * feePercent) / 100;
  const net = Math.max(0, gross - feeAmount);
  const minDonation = settings.min_donation_ngn ?? 500;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/requests" className="text-sm text-ink-muted hover:text-brand">
        ← Browse
      </Link>
      <div className="mt-6 overflow-hidden border border-line bg-surface-elevated">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt={item.full_name} className="h-72 w-full object-cover" />
        ) : null}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-mid">
            {statusLabel(item.status)}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-ink">{item.full_name}</h1>
          <p className="mt-4 whitespace-pre-wrap text-ink-muted">{item.story}</p>

          <div className="mt-8">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-brand">{formatNgn(item.raised_ngn)} raised</span>
              <span className="text-ink-muted">Goal {formatNgn(item.goal_ngn)}</span>
            </div>
            <div className="h-2 bg-brand-soft">
              <div className="h-2 bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {item.deadline_at ? (
            <p className="mt-4 text-sm text-ink-muted">
              Deadline: {new Date(item.deadline_at).toLocaleDateString("en-NG")}
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Deadline: {item.deadline_days} days after approval</p>
          )}

          {item.status === "live" ? (
            <form onSubmit={donate} className="mt-8 space-y-4 border border-line bg-brand-mist p-4">
              <h2 className="font-display text-xl font-semibold text-ink">Send help</h2>
              <p className="text-sm text-ink-muted">
                Your gift is held securely until the request is approved for payout. Prosperax
                platform fee: {feePercent}%. Payment processing is handled by Paystack; Paystack’s
                standard processing fees may apply.
              </p>
              <label className="block text-sm font-medium text-ink">
                Amount (NGN)
                <input
                  type="number"
                  min={minDonation}
                  className="mt-2 w-full border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Receipt email (optional if already saved on account)
                <input
                  type="email"
                  className="mt-2 w-full border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <p className="text-sm text-ink-muted">
                Toward this request: <strong className="text-ink">{formatNgn(net)}</strong>
                {feePercent > 0 ? ` (platform fee ${formatNgn(feeAmount)})` : null}
              </p>
              {donateError ? <p className="text-sm text-danger">{donateError}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                {busy ? "Redirecting…" : "Donate with Paystack"}
              </button>
            </form>
          ) : null}

          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-ink">Recent supporters</h2>
            {supporters.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No gifts yet. Be the first.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {supporters.map((supporter, index) => (
                  <li key={`${supporter.created_at}-${index}`} className="flex justify-between border-b border-line py-2">
                    <span className="text-ink-muted">{supporter.label}</span>
                    <span className="font-medium text-brand">{formatNgn(supporter.net_to_request)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
