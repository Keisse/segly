export type ThemeMode = "dark" | "light";

const THEME_KEY = "segly-theme";

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
}

export function setTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("segly-theme-change", { detail: theme }));
}

export function initializeTheme() {
  applyTheme(getTheme());
}
