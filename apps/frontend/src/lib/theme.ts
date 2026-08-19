export const THEME_KEY = "prosperax-theme";

export type Theme = "light" | "dark";

export function readThemePreference(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function setThemePreference(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  applyTheme(theme);
}

export function resolvedTheme(): Theme {
  return readThemePreference() ?? systemTheme();
}
