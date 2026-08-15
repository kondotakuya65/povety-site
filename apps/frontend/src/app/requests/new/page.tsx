"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoCropUpload from "@/components/PhotoCropUpload";
import RichTextEditor from "@/components/RichTextEditor";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function CreateHelpRequestPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [story, setStory] = useState("");
  const [storyText, setStoryText] = useState("");
  const [goal, setGoal] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [verificationType, setVerificationType] = useState<"nin" | "phone">("phone");
  const [verificationNin, setVerificationNin] = useState("");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (storyText.trim().length < 40) {
      setError("Please share a bit more of your story (at least 40 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("full_name", fullName);
      form.set("story", story);
      form.set("goal_ngn", goal);
      form.set("deadline_days", deadlineDays);
      form.set("verification_type", verificationType);
      if (verificationType === "nin") form.set("verification_nin", verificationNin);
      else form.set("verification_phone", verificationPhone);
      form.set("bank_code", bankCode);
      form.set("account_number", accountNumber);
      form.set("account_name", accountName);
      if (photo) form.set("photo", photo);

      const created = await api<{ id: string }>("/api/help-requests", {
        method: "POST",
        body: form,
      });
      router.push(`/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        Request help
      </p>
      <h1 className="font-display text-4xl font-semibold text-ink">Share your need</h1>
      <p className="mt-3 text-ink-muted">
        One open request at a time. An admin reviews before it goes live. See{" "}
        <Link href="/acceptable-use" className="text-brand hover:underline">
          acceptable use
        </Link>{" "}
        and{" "}
        <Link href="/how-it-works" className="text-brand hover:underline">
          how it works
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <section className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Your request</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">Tell people who you are</h2>
          </div>
          <label className="block text-sm font-medium text-ink">
            Full name
            <input
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label className="text-sm font-medium text-ink">Cover photo</label>
              <span className="text-xs text-ink-muted">Optional</span>
            </div>
            <PhotoCropUpload value={photo} onChange={setPhoto} onError={setError} />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label className="text-sm font-medium text-ink">Your story</label>
              <span className={`text-xs ${storyText.length > 5000 ? "text-danger" : "text-ink-muted"}`}>
                {storyText.length.toLocaleString()} / 5,000
              </span>
            </div>
            <RichTextEditor
              value={story}
              onChange={(html, text) => {
                setStory(html);
                setStoryText(text);
              }}
            />
            <p className="mt-2 text-xs text-ink-muted">
              Explain what happened, what the funds are for, and how this help will make a difference.
            </p>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Goal</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-ink">How much help do you need?</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Goal (NGN)
            <input
              type="number"
              min="1"
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Deadline
            <select
              className="mt-2 w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
            >
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </label>
          </div>
        </section>

        <fieldset className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <legend className="px-2 font-display text-xl font-semibold text-ink">Verification</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={verificationType === "phone"}
                onChange={() => setVerificationType("phone")}
              />
              Phone
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={verificationType === "nin"}
                onChange={() => setVerificationType("nin")}
              />
              NIN
            </label>
          </div>
          {verificationType === "nin" ? (
            <input
              className="w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 outline-none focus:border-brand"
              placeholder="11-digit NIN"
              value={verificationNin}
              onChange={(e) => setVerificationNin(e.target.value)}
              required
            />
          ) : (
            <input
              className="w-full rounded-xl border border-line bg-surface-elevated px-4 py-3 outline-none focus:border-brand"
              placeholder="Phone (defaults to login phone if blank)"
              value={verificationPhone}
              onChange={(e) => setVerificationPhone(e.target.value)}
            />
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <legend className="px-2 font-display text-xl font-semibold text-ink">Payout bank details</legend>
          <p className="text-sm text-ink-muted">Required before admin approval and weekly payout.</p>
          <input
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="Bank code"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            required
          />
          <input
            inputMode="numeric"
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            required
          />
          <input
            className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand"
            placeholder="Account holder name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
        </fieldset>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-brand px-5 py-3.5 font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-deep disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-sm text-ink-muted">
          Or <Link href="/requests" className="text-brand hover:underline">browse live requests</Link>.
        </p>
      </form>
    </div>
  );
}
