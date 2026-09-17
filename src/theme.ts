export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
  preference: ThemePreference;
  theme: ResolvedTheme;
}

const STORAGE_KEY = "keuanganku-theme";
const META_LIGHT = "#fff7ed";
const META_DARK = "#171210";

const listeners = new Set<(state: ThemeState) => void>();
const media = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return media.matches ? "dark" : "light";
}

function apply(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? META_DARK : META_LIGHT);
}

export function getThemePreference(): ThemePreference {
  return readPreference();
}

export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(readPreference());
}

export function setThemePreference(preference: ThemePreference) {
  if (preference !== "light" && preference !== "dark" && preference !== "system") return;
  localStorage.setItem(STORAGE_KEY, preference);
  apply(preference);
  notify();
}

export function subscribeTheme(callback: (state: ThemeState) => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  const preference = readPreference();
  const theme = resolveTheme(preference);
  listeners.forEach((callback) => callback({ preference, theme }));
}

export function initTheme(): ThemePreference {
  const preference = readPreference();
  apply(preference);
  media.addEventListener("change", () => {
    if (readPreference() === "system") {
      apply("system");
      notify();
    }
  });
  return preference;
}
