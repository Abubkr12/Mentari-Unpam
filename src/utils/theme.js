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

export function getBrandSvgMarkup(size = 22) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">
    <path d="M68 24C68 24 72 39 72 49C72 56.5 67 62 59.5 62C52 62 46.5 56 46.5 48.5L46.7 46.5C38.5 55.5 34 67.5 34 79.5C34 95.5 47.4 106 64 106C80.6 106 94 95.5 94 79.5C94 59 83.5 38.5 68 24ZM63 94C55.8 94 50 88.6 50 81.8C50 75.5 54.4 71 61.5 69.5C68.6 68 75.5 64.5 79.5 59.2C81.2 64.2 82 69.5 82 75C82 85.5 73.5 94 63 94Z"/>
  </svg>`;
}

export function getBrandBadgeMarkup(size = 52) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mm-badge-bg-${size}" x1="12" y1="8" x2="116" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E3A8A"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <linearGradient id="mm-badge-fg-${size}" x1="64" y1="24" x2="64" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#mm-badge-bg-${size})"/>
    <path d="M68 24C68 24 72 39 72 49C72 56.5 67 62 59.5 62C52 62 46.5 56 46.5 48.5L46.7 46.5C38.5 55.5 34 67.5 34 79.5C34 95.5 47.4 106 64 106C80.6 106 94 95.5 94 79.5C94 59 83.5 38.5 68 24ZM63 94C55.8 94 50 88.6 50 81.8C50 75.5 54.4 71 61.5 69.5C68.6 68 75.5 64.5 79.5 59.2C81.2 64.2 82 69.5 82 75C82 85.5 73.5 94 63 94Z" fill="url(#mm-badge-fg-${size})"/>
  </svg>`;
}
