"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";

type SettingItem = {
  key: string;
  value: string | number | boolean | null;
  raw_value: string;
  value_type: "string" | "number" | "boolean";
  label: string;
  description: string;
  updated_at: string | null;
};

type SettingsResponse = {
  settings: SettingItem[];
  meta: { payout_weekday_labels: string[] };
};

const ORDER = [
  "platform_fee_percent",
  "min_donation_ngn",
  "default_deadline_days",
  "donor_refund_days",
  "unmet_goal_refund_business_days",
  "payout_weekday",
  "site_tagline",
  "whatsapp_follow_url",
  "maintenance_mode",
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [weekdayLabels, setWeekdayLabels] = useState<string[]>([]);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<SettingsResponse>("/api/admin/settings")
      .then((res) => {
        setItems(res.settings);
        setWeekdayLabels(res.meta.payout_weekday_labels);
        const next: Record<string, string | boolean> = {};
        for (const item of res.settings) {
          if (item.value_type === "boolean") {
            next[item.key] = Boolean(item.value);
          } else {
            next[item.key] = item.raw_value ?? String(item.value ?? "");
          }
        }
        setDraft(next);
        setLoaded(true);
      })
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
        setError(err instanceof Error ? err.message : "Could not load settings");
      });
  }, [router]);

  const ordered = useMemo(() => {
    const map = new Map(items.map((item) => [item.key, item]));
    return ORDER.map((key) => map.get(key)).filter(Boolean) as SettingItem[];
  }, [items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, string | number | boolean> = {};
      for (const item of ordered) {
        const value = draft[item.key];
        if (item.value_type === "boolean") {
          payload[item.key] = Boolean(value);
        } else if (item.value_type === "number") {
          payload[item.key] = Number(value);
        } else {
          payload[item.key] = String(value ?? "");
        }
      }
      const res = await api<{ ok: boolean; settings: SettingItem[] }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ settings: payload }),
      });
      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.key, item]));
        for (const updated of res.settings) {
          map.set(updated.key, updated);
        }
        return Array.from(map.values());
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && !error) {
    return <div className="text-ink-muted">Loading settings…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Ops</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-ink-muted">
          Operational knobs only. Secrets (Paystack, SMS, JWT) stay in server <code>.env</code>.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {ordered.map((item) => (
          <label key={item.key} className="block rounded-2xl border border-line bg-white p-4 shadow-sm">
            <span className="block text-sm font-semibold text-ink">{item.label}</span>
            <span className="mt-1 block text-sm text-ink-muted">{item.description}</span>
            {item.value_type === "boolean" ? (
              <input
                type="checkbox"
                className="mt-3 h-4 w-4 accent-[var(--brand)]"
                checked={Boolean(draft[item.key])}
                onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              />
            ) : item.key === "payout_weekday" ? (
              <select
                className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
                value={String(draft[item.key] ?? "1")}
                onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
              >
                {weekdayLabels.map((label, index) => (
                  <option key={label} value={String(index)}>
                    {index} — {label}
                  </option>
                ))}
              </select>
            ) : item.key === "default_deadline_days" ? (
              <select
                className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
                value={String(draft[item.key] ?? "30")}
                onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
              >
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
              </select>
            ) : (
              <input
                className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
                type={item.value_type === "number" ? "number" : "text"}
                step={item.key === "platform_fee_percent" ? "0.01" : undefined}
                value={String(draft[item.key] ?? "")}
                onChange={(e) => setDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
              />
            )}
          </label>
        ))}

        {message ? <p className="text-sm text-brand">{message}</p> : null}
        <button
          type="submit"
          disabled={busy || Boolean(error && !loaded)}
          className="rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
