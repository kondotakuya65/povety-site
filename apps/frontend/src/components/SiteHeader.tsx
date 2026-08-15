"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { AUTH_EVENT, AuthUser, TOKEN_KEY, clearSession, getToken, isAdmin } from "@/lib/auth";

export default function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const me = await api<AuthUser>("/api/auth/me");
      setUser(me);
    } catch {
      // Invalid/expired token — clear quietly (avoid re-entrancy via AUTH_EVENT).
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser, pathname]);

  useEffect(() => {
    function onAuthChange() {
      void loadUser();
    }
    window.addEventListener(AUTH_EVENT, onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [loadUser]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    window.location.href = "/";
  }

  const linkClass = "text-ink-muted transition hover:text-brand";

  const navLinks = (
    <>
      <Link href="/requests" className={linkClass} onClick={() => setOpen(false)}>
        Browse
      </Link>
      <Link href="/how-it-works" className={linkClass} onClick={() => setOpen(false)}>
        How it works
      </Link>
      {!ready ? (
        <span className="text-ink-muted">…</span>
      ) : user ? (
        <>
          <Link href="/requests/new" className={linkClass} onClick={() => setOpen(false)}>
            Request help
          </Link>
          <Link href="/account" className={linkClass} onClick={() => setOpen(false)}>
            Account
          </Link>
          {isAdmin(user) ? (
            <Link href="/admin" className={linkClass} onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
          <button type="button" onClick={logout} className="text-left text-brand hover:text-brand-deep">
            Log out
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-brand px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-deep"
          onClick={() => setOpen(false)}
        >
          Log in
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface-elevated/92 shadow-[0_4px_24px_rgba(10,77,44,0.04)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="transition hover:opacity-90" aria-label="Prosperax home">
          <BrandLogo size={36} />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">{navLinks}</nav>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-brand md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-4 border-t border-line bg-white px-4 py-5 text-sm font-medium shadow-xl md:hidden"
        >
          {navLinks}
        </nav>
      ) : null}
    </header>
  );
}
