"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  topic_label: string;
  body: string;
  status: string;
  created_at: string | null;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
];

export default function AdminMessagesPage() {
  const [status, setStatus] = useState("new");
  const [items, setItems] = useState<Message[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    const res = await api<{ items: Message[]; new_count: number }>(
      `/api/admin/contact-messages${query}`,
    );
    setItems(res.items);
    setNewCount(res.new_count);
  }, []);

  useEffect(() => {
    load(status).catch((err) =>
      setError(err instanceof ApiError ? err.message : "Could not load messages"),
    );
  }, [load, status]);

  async function mark(item: Message, next: "new" | "read") {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await api<Message>(`/api/admin/contact-messages/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setItems((rows) => {
        if (status && updated.status !== status) {
          return rows.filter((row) => row.id !== updated.id);
        }
        return rows.map((row) => (row.id === updated.id ? updated : row));
      });
      setNewCount((count) =>
        next === "read" ? Math.max(0, count - 1) : count + (item.status === "read" ? 1 : 0),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update message");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-mid">Inbox</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-ink">Contact messages</h1>
        <p className="mt-2 text-ink-muted">
          {newCount} new. Reply from your own mailbox — the sender email is on each card.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => setStatus(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === item.value
                ? "bg-brand text-white"
                : "border border-line bg-surface-elevated text-ink-muted hover:border-brand"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-line bg-surface-elevated p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-ink">{item.name}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {item.topic_label}
                  {item.created_at
                    ? ` · ${new Date(item.created_at).toLocaleString("en-NG")}`
                    : ""}
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase text-brand">
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-sm">
              <a className="text-brand hover:underline" href={`mailto:${item.email}`}>
                {item.email}
              </a>
              {item.phone ? <span className="text-ink-muted"> · {item.phone}</span> : null}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{item.body}</p>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => mark(item, item.status === "new" ? "read" : "new")}
              className="mt-4 text-sm font-semibold text-brand hover:underline disabled:opacity-60"
            >
              {item.status === "new" ? "Mark as read" : "Mark as new"}
            </button>
          </article>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface-elevated px-5 py-10 text-center text-ink-muted">
          No messages in this filter.
        </p>
      ) : null}
    </div>
  );
}
