"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type AdminUser = {
  id: string;
  phone: string;
  email: string | null;
  role: string;
  created_at: string | null;
  request_count: number;
  donation_count: number;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    const res = await api<{ items: AdminUser[] }>(`/api/admin/users${suffix}`);
    setItems(res.items);
  }, []);

  useEffect(() => {
    load("").catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load users"),
    );
  }, [load]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await load(q);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Management</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Users</h1>
        <p className="mt-2 text-ink-muted">
          Phone accounts on Prosperax. Admin role is controlled by <code>ADMIN_PHONE(S)</code> in env.
        </p>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search phone or email"
          className="min-w-64 flex-1 rounded-xl border border-line bg-white px-4 py-2.5 outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Search
        </button>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-brand-mist/60 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Requests</th>
                <th className="px-4 py-3 font-semibold">Donations</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{user.phone}</td>
                  <td className="px-4 py-3 text-ink-muted">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                        user.role === "admin"
                          ? "bg-brand-soft text-brand-deep"
                          : "bg-surface text-ink-muted"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{user.request_count}</td>
                  <td className="px-4 py-3 text-ink">{user.donation_count}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("en-NG") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-ink-muted">No users found.</p>
        ) : null}
      </div>
    </div>
  );
}
