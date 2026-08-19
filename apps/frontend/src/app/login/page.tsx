"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AuthUser, setSession } from "@/lib/auth";

type RequestRes = { ok: boolean; phone: string; expires_in: number; dev_otp?: string };
type VerifyRes = { token: string; user: AuthUser };

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<RequestRes>("/api/auth/otp/request", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ phone }),
      });
      setPhone(res.phone);
      setDevOtp(res.dev_otp ?? null);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<VerifyRes>("/api/auth/otp/verify", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ phone, code }),
      });
      setSession(res.token);
      router.push(res.user.role === "admin" ? "/admin" : "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        Sign in
      </p>
      <h1 className="font-display text-4xl font-semibold text-ink">Log in with your phone</h1>
      <p className="mt-3 text-ink-muted">We’ll send a one-time code. Nigerian numbers only.</p>

      {step === "phone" ? (
        <form onSubmit={requestCode} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Phone number
            <input
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 text-ink outline-none focus:border-brand"
              placeholder="0803 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-4">
          <p className="text-sm text-ink-muted">
            Code sent to <span className="font-medium text-ink">{phone}</span>
          </p>
          {devOtp ? (
            <p className="border border-line bg-brand-soft px-3 py-2 text-sm text-brand">
              Dev OTP: <strong>{devOtp}</strong>
            </p>
          ) : null}
          <label className="block text-sm font-medium text-ink">
            6-digit code
            <input
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 tracking-[0.3em] text-ink outline-none focus:border-brand"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-ink-muted hover:text-brand"
            onClick={() => {
              setStep("phone");
              setCode("");
              setDevOtp(null);
              setError(null);
            }}
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}
