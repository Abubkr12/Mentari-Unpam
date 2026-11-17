/**
 * Mentari Mod Modern Edition - Adaptive Theme & Brand Identity Helper
 * Mendeteksi tema sistem/browser (prefers-color-scheme) secara otomatis saat baru dipasang
 * dan menyinkronkan preferensi tema ke seluruh modul ekstensi.
 */

import { Storage } from './storage.js';

export const ThemeHelper = {
  detectSystemTheme() {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {}
    return 'light';
  },

  async getEffectiveTheme() {
    try {
      const res = await Storage.get('mentari_theme', { mentari_theme: null });
      const saved = res?.mentari_theme;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {}
    return this.detectSystemTheme();
  },

  async setManualTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    await Storage.set({ mentari_theme: theme });
    try {
      window.dispatchEvent(new CustomEvent('mentari-theme-changed', { detail: { theme } }));
    } catch {}
  },

  watchTheme(callback) {
    if (typeof callback !== 'function') return;

    // 1. Pantau perubahan tema OS / Browser jika user belum mengunci tema manual
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onMediaChange = async () => {
          const res = await Storage.get('mentari_theme', { mentari_theme: null });
          if (!res?.mentari_theme) {
            callback(this.detectSystemTheme());
          }
        };
        if (mq.addEventListener) mq.addEventListener('change', onMediaChange);
        else if (mq.addListener) mq.addListener(onMediaChange);
      }
    } catch {}

    // 2. Pantau event internal antar content script
    try {
      window.addEventListener('mentari-theme-changed', (e) => {
        if (e.detail?.theme) callback(e.detail.theme);
      });
    } catch {}

    // 3. Pantau perubahan chrome.storage lintas tab/popup
    try {
      if (Storage.isContextValid() && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.mentari_theme?.newValue) {
            callback(changes.mentari_theme.newValue);
          }
        });
      }
    } catch {}
  }
};

export function getBrandSvgMarkup(size = 20) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">
    <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
  </svg>`;
}

export function getBrandBadgeMarkup(size = 52) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mm-badge-navy-${size}" x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E3A8A"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <linearGradient id="mm-badge-amber-${size}" x1="64" y1="14" x2="64" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="61" fill="url(#mm-badge-navy-${size})"/>
    <circle cx="64" cy="64" r="54.5" fill="#F59E0B"/>
    <circle cx="64" cy="64" r="50.5" fill="#FFFDF8"/>
    <path d="M64 15L73.5 50.5L111 59L73.5 67.5L64 111L54.5 67.5L17 59L54.5 50.5Z" fill="#1E3A8A"/>
    <g fill="url(#mm-badge-amber-${size})">
      <path d="M18.03 49.23 A47 47 0 0 1 25.98 31.37 L44.18 44.60 A24.5 24.5 0 0 0 40.04 53.91 Z"/>
      <path d="M30.77 25.77 A47 47 0 0 1 47.93 14.83 L55.62 35.98 A24.5 24.5 0 0 0 46.68 41.68 Z"/>
      <path d="M80.07 14.83 A47 47 0 0 1 97.23 25.77 L81.32 41.68 A24.5 24.5 0 0 0 72.38 35.98 Z"/>
      <path d="M102.02 31.37 A47 47 0 0 1 109.97 49.23 L87.96 53.91 A24.5 24.5 0 0 0 83.82 44.60 Z"/>
    </g>
    <path d="M27 84.5C38 77.5 51.5 79 64 87V102C51.5 94.5 38.5 93 29 99L27 84.5Z" fill="#0F172A"/>
    <path d="M101 84.5C90 77.5 76.5 79 64 87V102C76.5 94.5 89.5 93 99 99L101 84.5Z" fill="#3B5998"/>
    <circle cx="64" cy="59" r="21" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="3.2"/>
    <circle cx="64" cy="59" r="16" fill="#FDE68A"/>
    <g fill="#D97706">
      <path d="M62.5 57.5C58 53 54 48 53.5 46.5C56 46 60.5 50.5 62.5 57.5Z"/>
      <path d="M65.5 57.5C70 53 74 48 74.5 46.5C72 46 67.5 50.5 65.5 57.5Z"/>
      <path d="M62.5 60.5C58 65 54 70 53.5 71.5C56 72 60.5 67.5 62.5 60.5Z"/>
      <path d="M65.5 60.5C70 65 74 70 74.5 71.5C72 72 67.5 67.5 65.5 60.5Z"/>
    </g>
    <g fill="#FFFFFF">
      <path d="M64 44.5C67 47.5 67 51.5 64 54.5C61 51.5 61 47.5 64 44.5Z"/>
      <path d="M64 73.5C61 70.5 61 66.5 64 63.5C67 66.5 67 70.5 64 73.5Z"/>
      <path d="M49.5 59C52.5 56 56.5 56 59.5 59C56.5 62 52.5 62 49.5 59Z"/>
      <path d="M78.5 59C75.5 62 71.5 62 68.5 59C71.5 56 75.5 56 78.5 59Z"/>
    </g>
  </svg>`;
}
