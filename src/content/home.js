/**
 * Mentari Mod Modern Edition - Login Page UI Theme
 * Menyesuaikan tampilan halaman login Mentari UNPAM secara adaptif (Mode Terang / Gelap).
 */

import { ThemeHelper } from '../utils/theme.js';

class HomeTheme {
  constructor() {
    this.currentTheme = 'light';
    this._init();
  }

  async _init() {
    const theme = await ThemeHelper.getEffectiveTheme();
    this._applyStyles(theme);

    ThemeHelper.watchTheme((newTheme) => {
      this._applyStyles(newTheme);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('mentari-route-change', () => {
        this._applyStyles(this.currentTheme);
      });
    }
  }

  _applyStyles(theme = 'light') {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';
    const isLoginRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/login');
    let style = document.getElementById('mentari-home-theme');

    if (!isLoginRoute) {
      if (style) style.remove();
      return;
    }

    if (!style) {
      style = document.createElement('style');
      style.id = 'mentari-home-theme';
      document.head.appendChild(style);
    }

    const isLight = this.currentTheme === 'light';

    if (isLight) {
      style.textContent = `
        /* Adaptive Light Glass container */
        .MuiDrawer-paperAnchorRight.MuiDrawer-paper {
          background: rgba(255, 255, 255, 0.94) !important;
          height: 94% !important;
          top: 3% !important;
          backdrop-filter: blur(18px) saturate(160%) !important;
          border-left: 2px solid #1e3a8a !important;
          width: 420px !important;
          box-shadow: -12px 0 40px rgba(15, 23, 42, 0.14) !important;
          color: #0f172a !important;
          border-radius: 20px 0 0 20px !important;
        }

        .MuiTypography-h4 {
          font-weight: 800 !important;
          color: #0f172a !important;
          border-left: 4px solid #f59e0b !important;
          padding-left: 14px !important;
        }

        .MuiOutlinedInput-root {
          background: #f8fafc !important;
          border-radius: 12px !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }

        .MuiOutlinedInput-root.Mui-focused {
          border-color: #1e3a8a !important;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.16) !important;
        }

        .MuiButton-containedPrimary {
          background: #1e3a8a !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          height: 48px !important;
          transition: all 0.2s ease !important;
        }

        .MuiButton-containedPrimary:hover {
          background: #1e40af !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 20px rgba(30, 58, 138, 0.25) !important;
        }
      `;
    } else {
      style.textContent = `
        /* Cyber Metallic Dark Glass container */
        .MuiDrawer-paperAnchorRight.MuiDrawer-paper {
          background: rgba(22, 24, 28, 0.88) !important;
          height: 94% !important;
          top: 3% !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border-left: 2px solid #d4af37 !important;
          width: 420px !important;
          box-shadow: -15px 0 50px rgba(0, 0, 0, 0.5) !important;
          color: #e5e5e5 !important;
          border-radius: 20px 0 0 20px !important;
        }

        .MuiTypography-h4 {
          font-weight: 800 !important;
          color: #fff !important;
          border-left: 4px solid #d4af37 !important;
          padding-left: 14px !important;
        }

        .MuiOutlinedInput-root {
          background: rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }

        .MuiOutlinedInput-root.Mui-focused {
          border-color: #d4af37 !important;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2) !important;
        }

        .MuiButton-containedPrimary {
          background: #d4af37 !important;
          color: #121212 !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          height: 48px !important;
          transition: all 0.2s ease !important;
        }

        .MuiButton-containedPrimary:hover {
          background: #e6be40 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.35) !important;
        }
      `;
    }
  }
}

if (typeof window !== 'undefined') {
  new HomeTheme();
}
