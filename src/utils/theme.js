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

export function getBrandSvgMarkup(size = 24, rounded = true) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mm-navy-${size}" x1="12" y1="8" x2="116" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E3A8A"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <linearGradient id="mm-sun-${size}" x1="64" y1="22" x2="64" y2="78" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    ${rounded ? `<rect x="4" y="4" width="120" height="120" rx="28" fill="url(#mm-navy-${size})"/><rect x="5" y="5" width="118" height="118" rx="27" stroke="#F59E0B" stroke-opacity="0.4" stroke-width="2"/>` : ''}
    <rect x="61" y="18" width="6" height="13" rx="3" fill="#FBBF24"/>
    <rect x="61" y="18" width="6" height="12" rx="3" fill="#FBBF24" transform="rotate(-34 64 62)"/>
    <rect x="61" y="18" width="6" height="12" rx="3" fill="#FBBF24" transform="rotate(34 64 62)"/>
    <rect x="61" y="21" width="6" height="10" rx="3" fill="#F97316" transform="rotate(-68 64 62)"/>
    <rect x="61" y="21" width="6" height="10" rx="3" fill="#F97316" transform="rotate(68 64 62)"/>
    <circle cx="64" cy="61" r="20" fill="url(#mm-sun-${size})"/>
    <path d="M22 72C36 65 51 67 64 76C77 67 92 65 106 72V99C92 91 77 93 64 102C51 93 36 91 22 99V72Z" fill="#0F172A"/>
    <path d="M27 73.5C39 67.5 52 70 62.5 78.5V97.5C52 89.5 39 87.5 27 93.5V73.5Z" fill="#FFFFFF"/>
    <path d="M101 73.5C89 67.5 76 70 65.5 78.5V97.5C76 89.5 89 87.5 101 93.5V73.5Z" fill="#E2E8F0"/>
    <rect x="62.5" y="77" width="3" height="22" rx="1.5" fill="#F59E0B"/>
  </svg>`;
}
