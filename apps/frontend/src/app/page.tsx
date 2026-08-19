import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import HeroBannerSlider from "@/components/HeroBannerSlider";
import { requestPhoto, storyExcerpt } from "@/lib/helpRequests";

const HERO_SLIDES = [
  {
    src: "/prosperax-hero.jpg",
    alt: "Neighbours gathering outdoors in warm evening light",
  },
  {
    src: "/prosperax-hero-2.jpg",
    alt: "Community walking and talking together on a Lagos street",
  },
  {
    src: "/prosperax-hero-3.jpg",
    alt: "Friends sharing a quiet supportive moment at home",
  },
  {
    src: "/prosperax-community.jpg",
    alt: "People offering care and solidarity around a table",
  },
];

function Icon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const icons = {
  arrow: (
    <Icon className="h-4 w-4">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
  heart: (
    <Icon className="h-6 w-6">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </Icon>
  ),
  people: (
    <Icon className="h-6 w-6">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  shield: (
    <Icon className="h-6 w-6">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  wallet: (
    <Icon className="h-6 w-6">
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h.01" />
    </Icon>
  ),
  document: (
    <Icon className="h-7 w-7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </Icon>
  ),
  lock: (
    <Icon className="h-7 w-7">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
  ),
  bank: (
    <Icon className="h-7 w-7">
      <path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" />
    </Icon>
  ),
};

type PublicSettings = {
  platform_fee_percent?: number;
  min_donation_ngn?: number;
  whatsapp_follow_url?: string;
  site_tagline?: string;
  maintenance_mode?: boolean;
};

type LiveRequest = {
  id: string;
  full_name: string;
  story: string;
  story_plain?: string;
  goal_ngn: number;
  raised_ngn: number;
  photo_url: string | null;
};

type PublicStats = {
  live_requests: number;
  total_given_ngn: number;
  people_helped: number;
  gift_count: number;
};

function backendBase() {
  return process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
}

async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const res = await fetch(`${backendBase()}/api/settings/public`, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as PublicSettings;
  } catch {
    return {};
  }
}

async function getPublicStats(): Promise<PublicStats> {
  try {
    const res = await fetch(`${backendBase()}/api/stats/public`, { cache: "no-store" });
    if (!res.ok) {
      return { live_requests: 0, total_given_ngn: 0, people_helped: 0, gift_count: 0 };
    }
    return (await res.json()) as PublicStats;
  } catch {
    return { live_requests: 0, total_given_ngn: 0, people_helped: 0, gift_count: 0 };
  }
}

async function getLiveRequests(): Promise<LiveRequest[]> {
  try {
    const res = await fetch(`${backendBase()}/api/help-requests`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: LiveRequest[] };
    return data.items;
  } catch {
    return [];
  }
}

function formatNgn(amount: number): string {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

function pickNeedOfDay(items: LiveRequest[]): LiveRequest | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const pa = a.goal_ngn > 0 ? a.raised_ngn / a.goal_ngn : 0;
    const pb = b.goal_ngn > 0 ? b.raised_ngn / b.goal_ngn : 0;
    return pb - pa;
  })[0];
}

export default async function HomePage() {
  const [settings, stats, live] = await Promise.all([
    getPublicSettings(),
    getPublicStats(),
    getLiveRequests(),
  ]);
  const tagline = settings.site_tagline || "Mutual aid for Nigeria.";
  const fee = settings.platform_fee_percent ?? 0;
  const minDonation = settings.min_donation_ngn ?? 500;
  const whatsapp = settings.whatsapp_follow_url?.trim() || "";
  const need = pickNeedOfDay(live);
  const teaser = live.slice(0, 3);

  return (
    <div>
      {settings.maintenance_mode ? (
        <p className="border-b border-line bg-brand-soft px-4 py-3 text-center text-sm text-brand">
          Maintenance mode is on. Creating requests is temporarily disabled.
        </p>
      ) : null}

      <HeroBannerSlider
        slides={HERO_SLIDES}
        tagline={tagline}
        whatsapp={whatsapp}
        primaryCta={
          <Link
            href="/requests"
            className="icon-button bg-white px-5 py-3 font-semibold text-[#0a4d2c] shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            {icons.heart} Send help {icons.arrow}
          </Link>
        }
        secondaryCta={
          <Link
            href="/requests/new"
            className="icon-button border border-white/50 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            Request help {icons.arrow}
          </Link>
        }
      />

      <section className="relative z-10 -mt-8 px-4 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface-elevated/95 shadow-2xl shadow-brand-deep/10 backdrop-blur sm:grid-cols-4">
          <div className="stat-item p-5 sm:p-7">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">{icons.people}</span>
            <p className="font-display text-3xl font-semibold text-brand">{stats.live_requests}</p>
            <p className="mt-1 text-sm text-ink-muted">Live needs</p>
          </div>
          <div className="stat-item border-l border-line p-5 sm:p-7">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">{icons.wallet}</span>
            <p className="font-display text-3xl font-semibold text-brand">
              {formatNgn(stats.total_given_ngn)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">Given through Prosperax</p>
          </div>
          <div className="stat-item border-t border-line p-5 sm:border-l sm:border-t-0 sm:p-7">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">{icons.shield}</span>
            <p className="font-display text-3xl font-semibold text-brand">{stats.people_helped}</p>
            <p className="mt-1 text-sm text-ink-muted">Goals fully met</p>
          </div>
          <div className="stat-item border-l border-t border-line p-5 sm:border-t-0 sm:p-7">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">{icons.heart}</span>
            <p className="font-display text-3xl font-semibold text-brand">{stats.gift_count}</p>
            <p className="mt-1 text-sm text-ink-muted">Gifts sent</p>
          </div>
        </div>
      </section>

      {need ? (
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
            Need of the day
          </p>
          <div className="mt-6 grid items-center gap-10 sm:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={requestPhoto(need.photo_url)}
              alt={need.full_name}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-xl shadow-brand-deep/10"
            />
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {need.full_name}
              </h2>
              <p className="mt-4 line-clamp-5 text-ink-muted">
                {storyExcerpt(need.story, need.story_plain)}
              </p>
              <p className="mt-6 text-sm font-medium text-brand">
                {formatNgn(need.raised_ngn)} raised of {formatNgn(need.goal_ngn)}
              </p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-brand-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-mid"
                  style={{
                    width: `${need.goal_ngn > 0 ? Math.min(100, (need.raised_ngn / need.goal_ngn) * 100) : 0}%`,
                  }}
                />
              </div>
              <Link
                href={`/requests/${need.id}`}
                className="icon-button mt-6 w-fit rounded-full bg-brand px-5 py-3 font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-deep"
              >
                Help {need.full_name.split(" ")[0]} {icons.arrow}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="visual-section border-y border-line">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-ink">How it works</h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Simple mutual aid: publish a need, neighbours give, Prosperax holds the money until
            weekly payout.
          </p>
          <div className="feature-flow mt-10">
            <article className="feature-card feature-step-1">
              <span className="feature-icon">{icons.document}</span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand-mid">Step 01</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">Share a need</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Create one open request with your story, photo, and bank details. Admin reviews before
                it goes live.
              </p>
            </article>
            <span className="feature-flow-arrow" aria-hidden="true">
              {icons.arrow}
            </span>
            <article className="feature-card feature-step-2">
              <span className="feature-icon">{icons.lock}</span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a32]">Step 02</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">Give with hold</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Donors pay via Paystack. Funds stay held — not spent — until the request is funded
                and ready for transfer.
              </p>
            </article>
            <span className="feature-flow-arrow" aria-hidden="true">
              {icons.arrow}
            </span>
            <article className="feature-card feature-step-3">
              <span className="feature-icon">{icons.bank}</span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/75">Step 03</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">Weekly payout</h3>
              <p className="mt-2 text-sm text-white/80">
                When the goal is met, Prosperax pays out weekly to the recipient. Unmet goals are
                refunded.
              </p>
            </article>
          </div>
          <Link href="/how-it-works" className="icon-button mt-8 w-fit font-semibold text-brand hover:text-brand-deep">
            Read the full flow {icons.arrow}
          </Link>
        </div>
      </section>

      {teaser.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid">
                Live now
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold text-ink">Help someone today</h2>
            </div>
            <Link href="/requests" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {teaser.map((item) => (
              <Link key={item.id} href={`/requests/${item.id}`} className="request-card group block overflow-hidden rounded-2xl bg-surface-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={requestPhoto(item.photo_url)}
                  alt={item.full_name}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="p-5">
                  <p className="font-display text-xl font-semibold text-ink group-hover:text-brand">
                    {item.full_name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {storyExcerpt(item.story, item.story_plain)}
                  </p>
                  <p className="mt-3 flex items-center justify-between text-sm font-semibold text-brand">
                    <span>{formatNgn(item.raised_ngn)} raised</span>
                    {icons.arrow}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-ink">No live needs yet</h2>
          <p className="mt-3 text-ink-muted">Be the first to request help, or check back soon.</p>
          <Link
            href="/requests/new"
            className="mt-6 inline-block bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep"
          >
            Request help
          </Link>
        </section>
      )}

      <section className="overflow-hidden bg-brand-deep text-white">
        <div className="mx-auto grid max-w-6xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-80 md:min-h-full">
            <Image
              src="/prosperax-community.jpg"
              alt="Nigerians supporting one another"
              fill
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/50 to-transparent md:bg-gradient-to-r md:from-transparent md:to-brand-deep/25" />
          </div>
          <div className="px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8ee3b1]">Built for trust</p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">Help that feels human. Money flow that stays clear.</h2>
          <ul className="mt-9 space-y-6">
            <li className="flex gap-4">
              <span className="trust-icon">{icons.heart}</span>
              <div>
              <h3 className="font-display text-xl font-semibold text-white">
                {fee === 0 ? "0% platform fee" : `${fee}% platform fee`}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {fee === 0
                  ? "Prosperax currently takes no platform cut. Paystack’s processing fees may still apply."
                  : `A ${fee}% Prosperax fee is taken from each gift. Paystack processing fees may also apply.`}{" "}
                Minimum gift: {formatNgn(minDonation)}.
              </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="trust-icon">{icons.lock}</span>
              <div>
              <h3 className="font-display text-xl font-semibold text-white">Held until payout</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Gifts are held in the merchant balance until weekly payout for funded requests. Donors
                can request a refund while funds are still held.
              </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="trust-icon">{icons.shield}</span>
              <div>
              <h3 className="font-display text-xl font-semibold text-white">Paystack secured</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Card and transfer payments run through Paystack. We never store your card details on
                Prosperax.
              </p>
              </div>
            </li>
          </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
