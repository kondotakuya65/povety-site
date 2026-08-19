"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

const TOPICS = [
  { value: "general", label: "General" },
  { value: "request", label: "Help request" },
  { value: "donation", label: "Gift or refund" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

type PublicSettings = {
  support_email?: string;
  whatsapp_follow_url?: string;
};

export default function ContactPage() {
  const [settings, setSettings] = useState<PublicSettings>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<PublicSettings>("/api/settings/public", { auth: false })
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/contact", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ name, email, phone: phone || null, topic, message }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  const whatsapp = settings.whatsapp_follow_url?.trim() || "";
  const supportEmail = settings.support_email?.trim() || "";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        Support
      </p>
      <h1 className="font-display text-4xl font-semibold text-ink">Contact us</h1>
      <p className="mt-3 text-ink-muted">
        Questions about a request, gift, refund, or your account? Send a message and the Prosperax
        team will get back to you.
      </p>

      {whatsapp || supportEmail ? (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className="rounded-full border border-line bg-surface-elevated px-4 py-2 font-medium text-brand hover:border-brand"
            >
              {supportEmail}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              className="rounded-full border border-line bg-surface-elevated px-4 py-2 font-medium text-brand hover:border-brand"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      {done ? (
        <div className="mt-10 rounded-2xl border border-line bg-surface-elevated p-6 shadow-sm">
          <p className="font-display text-2xl font-semibold text-ink">Message sent</p>
          <p className="mt-2 text-ink-muted">
            Thank you. If you included an email, we will reply there. Please allow a little time
            during weekly payout days.
          </p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-2xl border border-line bg-surface-elevated p-5 shadow-sm sm:p-6"
        >
          <label className="block text-sm font-medium text-ink">
            Name
            <input
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Email
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Phone <span className="font-normal text-ink-muted">(optional)</span>
            <input
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 123 4567"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Topic
            <select
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPICS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            Message
            <textarea
              className="mt-2 min-h-36 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
