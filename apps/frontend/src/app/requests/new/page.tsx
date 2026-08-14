"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function CreateHelpRequestPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [story, setStory] = useState("");
  const [goal, setGoal] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [verificationType, setVerificationType] = useState<"nin" | "phone">("phone");
  const [verificationNin, setVerificationNin] = useState("");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError("Please upload a photo");
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
      form.set("photo", photo);

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
        One open request at a time. An admin reviews before it goes live.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-ink">
          Full name
          <input
            className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block w-full text-sm"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Story
          <textarea
            className="mt-2 min-h-36 w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Goal (NGN)
            <input
              type="number"
              min="1"
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Deadline
            <select
              className="mt-2 w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
            >
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">Verification</legend>
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
              className="w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
              placeholder="11-digit NIN"
              value={verificationNin}
              onChange={(e) => setVerificationNin(e.target.value)}
              required
            />
          ) : (
            <input
              className="w-full border border-line bg-surface-elevated px-3 py-2.5 outline-none focus:border-brand"
              placeholder="Phone (defaults to login phone if blank)"
              value={verificationPhone}
              onChange={(e) => setVerificationPhone(e.target.value)}
            />
          )}
        </fieldset>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
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
