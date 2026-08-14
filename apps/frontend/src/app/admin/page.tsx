"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";

type Ping = { ok: boolean; role: string; phone: string };

export default function AdminPage() {
  const router = useRouter();
  const [ping, setPing] = useState<Ping | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<Ping>("/api/admin/ping")
      .then(setPing)
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
        setError(err instanceof Error ? err.message : "Could not load admin");
      });
  }, [router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">Admin</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Review console</h1>
      <p className="mt-3 text-ink-muted">
        Help-request review and payouts come next. Settings are available now.
      </p>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {ping ? (
        <div className="mt-8 space-y-4">
          <div className="border border-line bg-surface-elevated p-5 text-sm">
            <p className="font-medium text-brand">Admin access confirmed</p>
            <p className="mt-2 text-ink-muted">{ping.phone}</p>
          </div>
          <Link
            href="/admin/settings"
            className="inline-block bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep"
          >
            Open settings
          </Link>
        </div>
      ) : !error ? (
        <p className="mt-8 text-ink-muted">Checking access…</p>
      ) : null}
    </div>
  );
}
