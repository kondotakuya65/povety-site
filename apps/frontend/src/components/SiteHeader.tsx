"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AuthUser, clearSession, getToken, isAdmin } from "@/lib/auth";

export default function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    api<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="border-b border-line/70 bg-surface-elevated/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-2xl font-semibold text-brand-deep">
          Prosperax
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {!ready ? (
            <span className="text-ink-muted">…</span>
          ) : user ? (
            <>
              <Link href="/account" className="text-ink-muted hover:text-brand">
                Account
              </Link>
              {isAdmin(user) ? (
                <Link href="/admin" className="text-ink-muted hover:text-brand">
                  Admin
                </Link>
              ) : null}
              <button type="button" onClick={logout} className="text-brand hover:text-brand-deep">
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="text-brand hover:text-brand-deep">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
