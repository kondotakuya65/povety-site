"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatNgn } from "@/lib/helpRequests";

type ConfirmRes = {
  donation: {
    id: string;
    help_request_id: string;
    status: string;
    net_to_request: number;
    gross_amount: number;
  };
};

export default function DonateCallbackClient() {
  const router = useRouter();
  const search = useSearchParams();
  const reference = search.get("reference") || search.get("trxref");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmRes["donation"] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!reference) {
      setError("Missing payment reference");
      return;
    }
    api<ConfirmRes>("/api/donations/confirm", {
      method: "POST",
      body: JSON.stringify({ reference }),
    })
      .then((res) => setResult(res.donation))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not confirm payment"));
  }, [reference, router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">Donate</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Payment status</h1>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {!error && !result ? <p className="mt-6 text-ink-muted">Confirming payment…</p> : null}

      {result ? (
        <div className="mt-8 border border-line bg-surface-elevated p-5">
          <p className="font-medium text-brand">Gift held successfully</p>
          <p className="mt-2 text-sm text-ink-muted">
            {formatNgn(result.net_to_request)} is held for this request (status: {result.status}).
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/requests/${result.help_request_id}`}
              className="bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep"
            >
              Back to request
            </Link>
            <Link href="/account" className="border border-line px-4 py-2.5 font-semibold text-ink-muted">
              My account
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
