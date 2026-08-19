"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolvedTheme, setThemePreference, THEME_KEY, type Theme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = resolvedTheme();
    applyTheme(current);
    setTheme(current);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onSystemChange() {
      if (localStorage.getItem(THEME_KEY)) return;
      const next = media.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    }
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemePreference(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-line text-brand transition hover:border-brand hover:bg-brand-soft ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {ready && theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v1.5M12 19.5V21M4.93 4.93l1.06 1.06M18.01 18.01l1.06 1.06M3 12h1.5M19.5 12H21M4.93 19.07l1.06-1.06M18.01 5.99l1.06-1.06" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5Z" />
        </svg>
      )}
    </button>
  );
}
