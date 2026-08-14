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

export default async function HomePage() {
  const [health, settings] = await Promise.all([getHealth(), getPublicSettings()]);
  const tagline = settings.site_tagline || "Mutual aid for Nigeria.";
  const fee = settings.platform_fee_percent ?? 0;
  const minDonation = settings.min_donation_ngn ?? 500;
  const whatsapp = settings.whatsapp_follow_url?.trim() || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {settings.maintenance_mode ? (
        <p className="mb-6 border border-line bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          Maintenance mode is on. Donate and create flows will soft-lock in later phases.
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
          href="/login"
          className="inline-block bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep"
        >
          Log in
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-block border border-brand px-5 py-3 font-semibold text-brand hover:bg-brand-soft"
          >
            Follow on WhatsApp
          </a>
        ) : null}
      </div>

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
