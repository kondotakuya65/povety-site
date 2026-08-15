"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { AuthUser, clearSession, getToken, isAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/money", label: "Payouts & refunds" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<AuthUser>("/api/auth/me")
      .then((me) => {
        if (!isAdmin(me)) {
          setError("Admin only.");
          return;
        }
        setUser(me);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-white shadow-sm"
                : "text-ink-muted hover:bg-brand-soft hover:text-brand-deep"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-danger">{error}</p>
        <Link href="/" className="mt-4 inline-block text-brand hover:underline">
          Back to site
        </Link>
      </div>
    );
  }

  if (!user) {
    return <div className="px-6 py-16 text-ink-muted">Loading admin…</div>;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-line bg-white lg:flex lg:flex-col">
        <div className="border-b border-line px-5 py-5">
          <BrandLogo size={34} />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-mid">
            Admin console
          </p>
        </div>
        {nav}
        <div className="mt-auto space-y-2 border-t border-line p-4 text-sm">
          <p className="truncate text-ink-muted">{user.phone}</p>
          <Link href="/" className="block text-brand hover:underline">
            View site
          </Link>
          <button type="button" onClick={logout} className="text-left text-ink-muted hover:text-danger">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-brand"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "Menu"}
            </button>
            <span className="font-display text-lg font-semibold text-brand-deep">Admin</span>
          </div>
          <p className="hidden text-sm text-ink-muted lg:block">Prosperax operations</p>
          <Link href="/" className="text-sm font-medium text-brand hover:underline lg:hidden">
            Site
          </Link>
        </header>

        {open ? (
          <div className="border-b border-line bg-white lg:hidden">{nav}</div>
        ) : null}

        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
