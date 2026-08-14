import Link from "next/link";

type PublicSettings = {
  platform_fee_percent?: number;
  min_donation_ngn?: number;
  whatsapp_follow_url?: string;
  site_tagline?: string;
  maintenance_mode?: boolean;
};

async function getHealth(): Promise<{
  ok: boolean;
  body?: {
    status: string;
    service: string;
    environment: string;
    database?: string;
    time: string;
  };
  error?: string;
}> {
  const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, body };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Backend unreachable",
    };
  }
}

async function getPublicSettings(): Promise<PublicSettings> {
  const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backendUrl}/api/settings/public`, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as PublicSettings;
  } catch {
    return {};
  }
}

async function getLiveRequests(): Promise<
  Array<{ id: string; full_name: string; story: string; goal_ngn: number; raised_ngn: number; photo_url: string | null }>
> {
  const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backendUrl}/api/help-requests`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Array<{
      id: string;
      full_name: string;
      story: string;
      goal_ngn: number;
      raised_ngn: number;
      photo_url: string | null;
    }> };
    return data.items.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [health, settings, live] = await Promise.all([
    getHealth(),
    getPublicSettings(),
    getLiveRequests(),
  ]);
  const tagline = settings.site_tagline || "Mutual aid for Nigeria.";
  const fee = settings.platform_fee_percent ?? 0;
  const minDonation = settings.min_donation_ngn ?? 500;
  const whatsapp = settings.whatsapp_follow_url?.trim() || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {settings.maintenance_mode ? (
        <p className="mb-6 border border-line bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          Maintenance mode is on. Creating requests is temporarily disabled.
        </p>
      ) : null}

      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
        Prosperax
      </p>
      <h1 className="font-display max-w-2xl text-4xl font-semibold text-ink sm:text-5xl">
        {tagline}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-muted">
        Send help that is held safely until weekly payout. Platform fee: {fee}%. Minimum gift: ₦
        {Number(minDonation).toLocaleString("en-NG")}.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/requests"
          className="inline-block bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep"
        >
          Send help
        </Link>
        <Link
          href="/requests/new"
          className="inline-block border border-brand px-5 py-3 font-semibold text-brand hover:bg-brand-soft"
        >
          Request help
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-block border border-line px-5 py-3 font-semibold text-ink-muted hover:border-brand"
          >
            Follow on WhatsApp
          </a>
        ) : null}
      </div>

      {live.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">Live requests</h2>
            <Link href="/requests" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {live.map((item) => (
              <Link
                key={item.id}
                href={`/requests/${item.id}`}
                className="border border-line bg-surface-elevated p-4 hover:border-brand"
              >
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt={item.full_name} className="mb-3 h-32 w-full object-cover" />
                ) : null}
                <p className="font-semibold text-ink">{item.full_name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{item.story}</p>
                <p className="mt-2 text-sm text-brand">
                  ₦{Number(item.raised_ngn).toLocaleString("en-NG")} / ₦
                  {Number(item.goal_ngn).toLocaleString("en-NG")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 border border-line bg-surface-elevated p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Backend health</h2>
        {health.ok && health.body ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="font-semibold text-brand">{health.body.status}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Service</dt>
              <dd className="font-medium text-ink">{health.body.service}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Environment</dt>
              <dd className="font-medium text-ink">{health.body.environment}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Database</dt>
              <dd className="font-medium text-ink">{health.body.database ?? "n/a"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Time (UTC)</dt>
              <dd className="font-medium text-ink">{health.body.time}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-danger">
            Cannot reach backend at <code>/api/health</code>
            {health.error ? ` — ${health.error}` : ""}. Start the API on port 8000.
          </p>
        )}
      </div>
    </div>
  );
}
