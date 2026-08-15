"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatNgn, statusLabel } from "@/lib/helpRequests";

type DonationRow = {
  id: string;
  status: string;
  gross_amount: number;
  net_to_request: number;
  platform_fee_amount: number;
  paystack_reference: string;
  created_at: string | null;
  help_request: { id: string; full_name: string; status: string } | null;
  donor: { id: string; phone: string; email: string | null } | null;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "held", label: "Held" },
  { value: "paid_out", label: "Paid out" },
  { value: "refunded", label: "Refunded" },
];

export default function AdminDonationsContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("status") ?? "";
  const [status, setStatus] = useState(initial);
  const [items, setItems] = useState<DonationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    const res = await api<{ items: DonationRow[] }>(`/api/admin/donations${query}`);
    setItems(res.items);
  }, []);

  useEffect(() => {
    load(status).catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load donations"),
    );
  }, [load, status]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Money</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Donations</h1>
        <p className="mt-2 text-ink-muted">Track held gifts, payouts, and refunds per donation.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              status === filter.value
                ? "bg-brand text-white"
                : "border border-line bg-white text-ink-muted hover:border-brand"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-brand-mist/60 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Donor</th>
                <th className="px-4 py-3 font-semibold">Gross</th>
                <th className="px-4 py-3 font-semibold">Net</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleString("en-NG") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.help_request ? (
                      <Link href={`/requests/${item.help_request.id}`} className="font-medium text-brand hover:underline">
                        {item.help_request.full_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {item.donor?.phone ?? "—"}
                    {item.donor?.email ? (
                      <span className="mt-0.5 block text-xs">{item.donor.email}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{formatNgn(item.gross_amount)}</td>
                  <td className="px-4 py-3 text-ink">{formatNgn(item.net_to_request)}</td>
                  <td className="px-4 py-3 capitalize text-brand">{statusLabel(item.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.paystack_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-ink-muted">No donations in this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
