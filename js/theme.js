import { TYPES } from './store.js';

const systemDark = matchMedia('(prefers-color-scheme: dark)');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Texte posé sur une couleur de poste : blanc ou quasi-noir, celui qui contraste le plus.
const DARK = '#0d0d0f';
export function onColor(hex) {
  const l = luminance(hex);
  return 1.05 / (l + 0.05) >= (l + 0.05) / (luminance(DARK) + 0.05) ? '#ffffff' : DARK;
}

export function applyTheme(state) {
  const dark = state.dark ?? systemDark.matches;
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  for (const t of TYPES) {
    root.style.setProperty(`--c-${t}`, state.colors[t]);
    root.style.setProperty(`--on-c-${t}`, onColor(state.colors[t]));
  }
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0d0d0f' : '#f4f4f5';
}

export function followSystemTheme(getState) {
  systemDark.addEventListener('change', () => {
    if (getState().dark === null) applyTheme(getState());
  });
}
