/**
 * Mentari Mod Modern Edition - Onboarding & Multi-API Key Manager
 * Mengelola sambutan pemasangan pertama kali (once-only) dan Google Gemini API Key pool
 * dalam Closed Shadow DOM dengan deteksi tema adaptif OS/browser (Light & Dark).
 */

import { Storage } from '../utils/storage.js';
import { Toast } from '../utils/toast.js';
import { ThemeHelper, getBrandSvgMarkup, getBrandBadgeMarkup } from '../utils/theme.js';
import {
  ACTIVE_FREE_MODELS,
  VALID_FREE_MODEL_IDS,
  DEFAULT_FREE_MODEL,
  THINKING_LEVEL_META,
  getSupportedThinkingLevels,
  resolveThinkingLevelForModel
} from '../utils/models.js';

class ApiKeyManager {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
    this.currentView = 'apikey'; // 'welcome' | 'apikey'
    this.currentTheme = ThemeHelper.detectSystemTheme();
    this._windowFocusGuard = null;
    this._init();
  }

  async _init() {
    await Storage.autoMigrateLegacyStorage();
    this.currentTheme = await ThemeHelper.getEffectiveTheme();

    ThemeHelper.watchTheme((newTheme) => {
      this.currentTheme = newTheme;
      this._applyTheme();
    });

    window.addEventListener('mentari-update-api-key', () => {
      this.openModal('apikey');
    });

    const store = await Storage.get([
      'geminiApiKey',
      'geminiApiKeys',
      'mentari_onboarding_completed'
    ]);
    const hasKey = Boolean(
      store.geminiApiKey ||
      (Array.isArray(store.geminiApiKeys) && store.geminiApiKeys.length > 0)
    );
    const isOnboarded = store.mentari_onboarding_completed === true;

    if (hasKey && !isOnboarded) {
      await Storage.set({ mentari_onboarding_completed: true });
      return;
    }

    if (!isOnboarded && !hasKey) {
      setTimeout(() => this.openModal('welcome'), 900);
    } else if (!hasKey) {
      setTimeout(() => this.openModal('apikey'), 1100);
    }
  }

  _maskKey(key) {
    if (!key || typeof key !== 'string') return '••••••••';
    if (key.length <= 12) return key.slice(0, 4) + '...' + key.slice(-2);
    return key.slice(0, 7) + '...' + key.slice(-4);
  }

  _applyTheme() {
    if (!this.shadow) return;
    const overlay = this.shadow.querySelector('.overlay');
    const modal = this.shadow.querySelector('.modal');
    const isLight = this.currentTheme === 'light';
    overlay?.classList.toggle('theme-light', isLight);
    modal?.classList.toggle('theme-light', isLight);
  }

  _buildModalDOM() {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = 'mentari-api-key-host';
    this.host.style.cssText = 'position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: auto !important; display: none;';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; }

      @keyframes modalReveal {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes emblemSettle {
        from { opacity: 0; transform: scale(0.86); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes stepSlideIn {
        from { opacity: 0; transform: translateX(12px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes rowFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.14);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        z-index: 2147483647 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.24s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.28s cubic-bezier(0.16, 1, 0.3, 1), -webkit-backdrop-filter 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.24s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 16px;
      }
      .overlay.theme-light {
        background: rgba(255, 255, 255, 0.08);
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .modal {
        width: 488px;
        max-width: 100%;
        background: #141519;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.48);
        overflow: hidden;
        color: #f1f5f9;
        max-height: calc(100vh - 32px);
        max-height: calc(100dvh - 32px);
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .overlay.open .modal {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      /* Light Theme Surface */
      .modal.theme-light {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 24px 56px rgba(15, 23, 42, 0.16);
        color: #0f172a;
      }

      .header {
        padding: 16px 22px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #18191e;
        flex-shrink: 0;
      }
      .modal.theme-light .header {
        background: #f8fafc;
        border-bottom-color: #e2e8f0;
      }

      .header-title {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .modal.theme-light .header-title {
        color: #0f172a;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 6px;
        display: flex;
        border-radius: 8px;
        transition: background-color 0.18s, color 0.18s;
      }
      .close-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }
      .modal.theme-light .close-btn {
        color: #64748b;
      }
      .modal.theme-light .close-btn:hover {
        color: #0f172a;
        background: #e2e8f0;
      }

      /* Constrain nested flex views so body scrolls while footer stays pinned. */
      .view-section {
        display: none;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .view-section.active {
        display: flex;
        animation: stepSlideIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .welcome-body {
        padding: 28px 24px 22px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
      }
      .welcome-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .welcome-emblem {
        flex-shrink: 0;
        width: 52px;
        height: 52px;
        animation: emblemSettle 0.36s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .welcome-headline {
        font-size: 19px;
        font-weight: 750;
        letter-spacing: -0.02em;
        line-height: 1.25;
        color: #ffffff;
      }
      .modal.theme-light .welcome-headline {
        color: #0f172a;
      }
      .welcome-sub {
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.5;
        color: #94a3b8;
      }
      .modal.theme-light .welcome-sub {
        color: #475569;
      }

      .welcome-list {
        display: flex;
        flex-direction: column;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .modal.theme-light .welcome-list {
        border-color: #e2e8f0;
      }

      .welcome-row {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 13px 2px;
        opacity: 0;
        animation: rowFadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .welcome-row:nth-child(1) { animation-delay: 60ms; }
      .welcome-row:nth-child(2) { animation-delay: 120ms; }
      .welcome-row:nth-child(3) { animation-delay: 180ms; }
      .welcome-row + .welcome-row {
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .modal.theme-light .welcome-row + .welcome-row {
        border-top-color: #f1f5f9;
      }

      .row-index {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        font-weight: 700;
        color: #f59e0b;
        padding-top: 2px;
        flex-shrink: 0;
      }
      .modal.theme-light .row-index {
        color: #1e3a8a;
      }
      .row-copy h4 {
        font-size: 13px;
        font-weight: 650;
        color: #f8fafc;
        margin-bottom: 2px;
      }
      .modal.theme-light .row-copy h4 {
        color: #0f172a;
      }
      .row-copy p {
        font-size: 12px;
        line-height: 1.45;
        color: #94a3b8;
      }
      .modal.theme-light .row-copy p {
        color: #475569;
      }

      .welcome-note {
        font-size: 11.5px;
        color: #64748b;
        line-height: 1.4;
      }

      /* API Key Body */
      .content {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
      }
      .content::-webkit-scrollbar,
      .welcome-body::-webkit-scrollbar,
      .keys-list::-webkit-scrollbar {
        width: 6px;
      }
      .content::-webkit-scrollbar-track,
      .welcome-body::-webkit-scrollbar-track,
      .keys-list::-webkit-scrollbar-track {
        background: transparent;
      }
      .content::-webkit-scrollbar-thumb,
      .welcome-body::-webkit-scrollbar-thumb,
      .keys-list::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.35);
        border-radius: 4px;
      }
      .modal.theme-light .content::-webkit-scrollbar-thumb,
      .modal.theme-light .welcome-body::-webkit-scrollbar-thumb,
      .modal.theme-light .keys-list::-webkit-scrollbar-thumb {
        background: rgba(100, 116, 139, 0.35);
      }
      .info-box {
        font-size: 12px;
        line-height: 1.5;
        color: #cbd5e1;
        background: #1b1c22;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.07);
      }
      .modal.theme-light .info-box {
        background: #f8fafc;
        border-color: #e2e8f0;
        color: #334155;
      }
      .info-box a {
        color: #f59e0b;
        text-decoration: none;
        font-weight: 600;
      }
      .modal.theme-light .info-box a {
        color: #1e3a8a;
      }
      .info-box a:hover { text-decoration: underline; }

      .quota-note {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
        font-size: 11px;
        color: #fbbf24;
      }
      .modal.theme-light .quota-note {
        border-top-color: #cbd5e1;
        color: #b45309;
      }

      .section-label {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal.theme-light .section-label {
        color: #475569;
      }

      .keys-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        padding-right: 4px;
        flex-shrink: 0;
      }
      .key-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1b1c22;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .modal.theme-light .key-item {
        background: #f8fafc;
        border-color: #e2e8f0;
      }
      .key-item.active {
        border-color: rgba(245, 158, 11, 0.45);
        background: rgba(245, 158, 11, 0.06);
      }
      .modal.theme-light .key-item.active {
        border-color: #1e3a8a;
        background: #eff6ff;
      }
      .key-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .key-code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: #f1f5f9;
      }
      .modal.theme-light .key-code {
        color: #0f172a;
      }
      .key-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
      }
      .key-badge.primary {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
      }
      .modal.theme-light .key-badge.primary {
        background: #dbeafe;
        color: #1e3a8a;
      }
      .key-badge.backup {
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
      }
      .modal.theme-light .key-badge.backup {
        background: #f1f5f9;
        color: #475569;
      }
      .key-actions { display: flex; align-items: center; gap: 6px; }
      .key-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 5px 8px;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .modal.theme-light .key-btn {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #334155;
      }
      .key-btn:hover { background: rgba(255, 255, 255, 0.12); }
      .modal.theme-light .key-btn:hover { background: #f1f5f9; }
      .key-btn.btn-delete:hover { color: #ef4444; border-color: rgba(239, 68, 68, 0.45); }

      .empty-keys {
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
        padding: 14px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        border: 1px dashed rgba(255, 255, 255, 0.12);
      }
      .modal.theme-light .empty-keys {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #64748b;
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-field {
        width: 100%;
        background: #1e1f26;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        padding: 10px 42px 10px 14px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.18s, box-shadow 0.18s;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        user-select: text !important;
        -webkit-user-select: text !important;
        pointer-events: auto !important;
      }
      .input-field:focus {
        border-color: #f59e0b;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
      }
      .modal.theme-light .input-field {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .modal.theme-light .input-field:focus {
        border-color: #1e3a8a;
        box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.16);
      }
      .toggle-vis {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 4px;
      }
      .toggle-vis:hover { color: #f59e0b; }
      .modal.theme-light .toggle-vis:hover { color: #1e3a8a; }

      .footer {
        padding: 14px 22px;
        background: #18191e;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .modal.theme-light .footer {
        background: #f8fafc;
        border-top-color: #e2e8f0;
      }
      .footer-right {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }

      .btn {
        padding: 9px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: background-color 0.18s, transform 0.18s, color 0.18s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-cancel {
        background: transparent;
        color: #94a3b8;
      }
      .btn-cancel:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
      }
      .modal.theme-light .btn-cancel {
        color: #475569;
      }
      .modal.theme-light .btn-cancel:hover {
        color: #0f172a;
        background: #e2e8f0;
      }

      .btn-save {
        background: #f59e0b;
        color: #0f172a;
      }
      .btn-save:hover {
        background: #fbbf24;
        transform: translateY(-1px);
      }
      .modal.theme-light .btn-save {
        background: #1e3a8a;
        color: #ffffff;
      }
      .modal.theme-light .btn-save:hover {
        background: #1e40af;
      }
      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .btn-outline {
        background: rgba(255, 255, 255, 0.06);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.14);
      }
      .btn-outline:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .modal.theme-light .btn-outline {
        background: #ffffff;
        color: #1e3a8a;
        border: 1px solid #cbd5e1;
      }
      .modal.theme-light .btn-outline:hover {
        background: #f1f5f9;
        border-color: #1e3a8a;
      }

      .model-setup-box {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 2px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .modal.theme-light .model-setup-box {
        border-top-color: #e2e8f0;
      }
      .select-model-field {
        width: 100%;
        background: #1e1f26;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        padding: 9px 12px;
        color: #ffffff;
        font-size: 12.5px;
        font-weight: 500;
        outline: none;
        cursor: pointer;
      }
      .select-model-field:focus {
        border-color: #f59e0b;
      }
      .select-model-field option {
        background: #1e1f26;
        color: #ffffff;
      }
      .modal.theme-light .select-model-field {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .modal.theme-light .select-model-field:focus {
        border-color: #1e3a8a;
      }
      .modal.theme-light .select-model-field option {
        background: #ffffff;
        color: #0f172a;
      }
      .model-setup-hint {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .modal.theme-light .model-setup-hint {
        color: #64748b;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="header-title" id="modal-header-title">
            <span style="color:#f59e0b;display:inline-flex;align-items:center;">${getBrandSvgMarkup(20)}</span>
            <span id="header-title-text">Koneksi Google Gemini AI</span>
          </div>
          <button class="close-btn" id="btn-close" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- VIEW 1: Sambutan Pemasangan Pertama (Once-Only) -->
        <div class="view-section" id="view-welcome">
          <div class="welcome-body">
            <div class="welcome-hero">
              <div class="welcome-emblem">${getBrandBadgeMarkup(52)}</div>
              <div>
                <h2 class="welcome-headline">Selamat Datang di Mentari Mod</h2>
                <p class="welcome-sub">Asisten perkuliahan UNPAM v2.1 untuk memantau forum, prasyarat kuis, serta otomatisasi evaluasi dengan Gemini AI.</p>
              </div>
            </div>

            <div class="welcome-list">
              <div class="welcome-row">
                <span class="row-index">01</span>
                <div class="row-copy">
                  <h4>Pelacakan Prasyarat Akurat</h4>
                  <p>Memisahkan kuis yang siap dikerjakan dari item yang masih tertahan forum atau post-test.</p>
                </div>
              </div>
              <div class="welcome-row">
                <span class="row-index">02</span>
                <div class="row-copy">
                  <h4>Asisten Forum & Ekspor Dokumen</h4>
                  <p>Menyusun draf tanggapan diskusi dan mengunduh materi ke format Word (.docx) atau Markdown.</p>
                </div>
              </div>
              <div class="welcome-row">
                <span class="row-index">03</span>
                <div class="row-copy">
                  <h4>Otomasi Cerdas Multi-Key</h4>
                  <p>Mendukung banyak API Key Gemini gratis dengan rotasi otomatis dan jeda pengerjaan natural.</p>
                </div>
              </div>
            </div>

            <p class="welcome-note">Tampilan otomatis mengikuti tema perangkat Anda. Sambutan ini hanya muncul sekali saat pemasangan awal.</p>
          </div>

          <div class="footer">
            <button class="btn btn-cancel" id="btn-skip-welcome" type="button">Lewati dulu</button>
            <div class="footer-right">
              <button class="btn btn-save" id="btn-start-setup" type="button">Lanjut Setup API Key</button>
            </div>
          </div>
        </div>

        <!-- VIEW 2: Pengaturan Multi-Key Gemini AI -->
        <div class="view-section" id="view-apikey">
          <div class="content">
            <div class="info-box">
              Dapatkan API Key gratis di Google AI Studio:<br>
              <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">
                https://aistudio.google.com/api-keys
              </a>
              <div style="margin-top:6px; font-size:11.5px;">
                <b>Multi-Key Failover:</b> Tambahkan lebih dari satu API Key. Saat key utama menyentuh limit kuota (HTTP 429), ekstensi beralih ke key cadangan secara otomatis.
              </div>
              <div class="quota-note">
                <b>Info Kuota:</b> Limit harian (RPD) di-reset setiap hari oleh Google. Key yang limit tidak perlu dihapus karena otomatis aktif kembali keesokan harinya.
              </div>
            </div>

            <div class="section-label">
              <span>Daftar API Key Tersimpan</span>
              <span id="keys-count-badge">0 Key</span>
            </div>

            <div class="keys-list" id="keys-list-container">
              <div class="empty-keys">Memuat daftar API Key...</div>
            </div>

            <div class="section-label" style="margin-top:4px;">
              <span>Tambah API Key Baru</span>
            </div>

            <div class="input-wrapper">
              <input type="password" id="input-api-key" class="input-field" placeholder="Masukkan AQ... atau AIza..." spellcheck="false" autocomplete="off">
              <button class="toggle-vis" id="btn-toggle-vis" type="button" aria-label="Lihat Key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>

            <div class="model-setup-box" id="model-setup-box">
              <div class="section-label">
                <span>Model AI Default (Free Tier)</span>
              </div>
              <select id="select-setup-model" class="select-model-field">
                ${ACTIVE_FREE_MODELS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}
              </select>
              <div class="section-label" style="margin-top:6px;">
                <span>Thinking Level (Kecepatan vs Kedalaman AI)</span>
              </div>
              <select id="select-setup-thinking" class="select-model-field"></select>
              <span class="model-setup-hint">Opsi level menyesuaikan yang didukung model terpilih. Makin rendah makin cepat, makin tinggi makin mendalam.</span>
            </div>
          </div>

          <div class="footer">
            <button class="btn btn-cancel" id="btn-cancel" type="button">Tutup</button>
            <div class="footer-right">
              <button class="btn btn-save" id="btn-add-key" type="button">Tambah & Uji Key</button>
              <button class="btn btn-save" id="btn-finish-setup" type="button" style="display:none;">Simpan & Selesai</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    // Isolasi penuh event fokus & keyboard dari MUI FocusTrap (khususnya di /login)
    const isolatedEvents = [
      'focusin', 'focusout', 'keydown', 'keypress', 'keyup',
      'paste', 'copy', 'cut', 'mousedown', 'pointerdown', 'input', 'beforeinput'
    ];
    isolatedEvents.forEach((evt) => {
      this.host.addEventListener(evt, (e) => e.stopPropagation(), false);
    });

    if (!this._windowFocusGuard) {
      this._windowFocusGuard = (e) => {
        if (!this.isOpen) return;
        const target = e.target;
        if (target === this.host || (target instanceof Node && this.host?.contains(target))) {
          e.stopImmediatePropagation();
        }
      };
      window.addEventListener('focusin', this._windowFocusGuard, true);
      window.addEventListener('focus', this._windowFocusGuard, true);
    }

    // Bind Controls
    const inputKey = this.shadow.getElementById('input-api-key');
    const btnAddKey = this.shadow.getElementById('btn-add-key');
    const btnFinishSetup = this.shadow.getElementById('btn-finish-setup');
    const selectSetupModel = this.shadow.getElementById('select-setup-model');
    const selectSetupThinking = this.shadow.getElementById('select-setup-thinking');
    const btnCancel = this.shadow.getElementById('btn-cancel');
    const btnClose = this.shadow.getElementById('btn-close');
    const btnToggleVis = this.shadow.getElementById('btn-toggle-vis');
    const btnStartSetup = this.shadow.getElementById('btn-start-setup');
    const btnSkipWelcome = this.shadow.getElementById('btn-skip-welcome');

    this._renderThinkingOptions = (modelId, preferredLevel = null) => {
      if (!selectSetupThinking) return;
      const supported = getSupportedThinkingLevels(modelId);
      const resolved = resolveThinkingLevelForModel(modelId, preferredLevel);
      selectSetupThinking.innerHTML = supported
        .map(lvl => `<option value="${lvl}">${THINKING_LEVEL_META[lvl]?.label || lvl}</option>`)
        .join('');
      selectSetupThinking.value = resolved;
      return resolved;
    };

    // Muat pilihan model & thinking level saat ini tanpa menimpa pengaturan user
    const syncModelSelect = async () => {
      const { gemini_model, gemini_thinking_level } = await Storage.get({
        gemini_model: DEFAULT_FREE_MODEL,
        gemini_thinking_level: null
      });
      const activeId = VALID_FREE_MODEL_IDS.includes(gemini_model) ? gemini_model : DEFAULT_FREE_MODEL;
      if (selectSetupModel) selectSetupModel.value = activeId;
      this._renderThinkingOptions(activeId, gemini_thinking_level);
    };
    syncModelSelect();

    if (selectSetupModel) {
      selectSetupModel.addEventListener('change', async () => {
        const chosen = selectSetupModel.value;
        if (VALID_FREE_MODEL_IDS.includes(chosen)) {
          const nextThinking = this._renderThinkingOptions(chosen, selectSetupThinking?.value);
          await Storage.set({ gemini_model: chosen, gemini_thinking_level: nextThinking });
          Toast.success(`Model AI default diatur ke: ${selectSetupModel.options[selectSetupModel.selectedIndex].text.split(' (')[0]} (${THINKING_LEVEL_META[nextThinking]?.shortLabel || nextThinking})`);
        }
      });
    }

    if (selectSetupThinking) {
      selectSetupThinking.addEventListener('change', async () => {
        const modelId = selectSetupModel?.value || DEFAULT_FREE_MODEL;
        const resolved = resolveThinkingLevelForModel(modelId, selectSetupThinking.value);
        await Storage.set({ gemini_thinking_level: resolved });
        Toast.success(`Thinking Level diatur ke: ${THINKING_LEVEL_META[resolved]?.label || resolved}`);
      });
    }

    try {
      if (Storage.isContextValid() && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && (changes.gemini_model?.newValue || changes.gemini_thinking_level?.newValue)) {
            const nextModel = changes.gemini_model?.newValue && VALID_FREE_MODEL_IDS.includes(changes.gemini_model.newValue)
              ? changes.gemini_model.newValue
              : (selectSetupModel?.value || DEFAULT_FREE_MODEL);
            if (selectSetupModel && selectSetupModel.value !== nextModel) {
              selectSetupModel.value = nextModel;
            }
            const nextLevel = changes.gemini_thinking_level?.newValue || selectSetupThinking?.value;
            this._renderThinkingOptions(nextModel, nextLevel);
          }
        });
      }
    } catch {}

    inputKey.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      inputKey.focus();
    });
    inputKey.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') btnAddKey.click();
    });
    ['keypress', 'keyup', 'paste', 'focusin'].forEach((evt) => {
      inputKey.addEventListener(evt, (e) => e.stopPropagation());
    });

    btnToggleVis.addEventListener('click', () => {
      inputKey.type = inputKey.type === 'password' ? 'text' : 'password';
    });

    const close = async () => {
      if (this.currentView === 'welcome') {
        await Storage.set({ mentari_onboarding_completed: true });
      }
      this.closeModal();
    };
    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    btnFinishSetup.addEventListener('click', async () => {
      const chosenModel = selectSetupModel?.value;
      const chosenThinking = selectSetupThinking?.value;
      const updates = { mentari_onboarding_completed: true };
      const finalModel = (chosenModel && VALID_FREE_MODEL_IDS.includes(chosenModel))
        ? chosenModel
        : DEFAULT_FREE_MODEL;
      updates.gemini_model = finalModel;
      updates.gemini_thinking_level = resolveThinkingLevelForModel(finalModel, chosenThinking);
      await Storage.set(updates);
      Toast.success('Konfigurasi AI selesai dan siap digunakan.');
      this.closeModal();
    });

    btnSkipWelcome.addEventListener('click', async () => {
      await Storage.set({ mentari_onboarding_completed: true });
      this.closeModal();
    });

    btnStartSetup.addEventListener('click', async () => {
      await Storage.set({ mentari_onboarding_completed: true });
      this._switchView('apikey');
    });

    btnAddKey.addEventListener('click', async () => {
      const keyVal = inputKey.value.trim();
      if (!keyVal) {
        Toast.warning('Silakan masukkan API Key Gemini Anda.');
        return;
      }

      const currentKeysRes = await new Promise((r) => chrome.runtime.sendMessage({ action: 'getGeminiApiKeys' }, r));
      if (currentKeysRes?.keys?.includes(keyVal)) {
        Toast.warning('API Key ini sudah tersimpan di dalam daftar.');
        return;
      }

      btnAddKey.disabled = true;
      btnAddKey.textContent = 'Memverifikasi...';

      chrome.runtime.sendMessage({
        action: 'addGeminiApiKey',
        apiKey: keyVal
      }, async (res) => {
        btnAddKey.disabled = false;
        btnAddKey.textContent = 'Tambah & Uji Key';

        if (res && res.valid) {
          inputKey.value = '';
          await Storage.set({ mentari_onboarding_completed: true });
          Toast.success('API Key valid tersimpan. Cek Model AI Default lalu klik Simpan & Selesai.');
          await this._loadAndRenderKeys();

          window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
            detail: { apiKey: keyVal }
          }));
        } else {
          Toast.error(res ? res.message : 'Verifikasi API Key gagal.');
        }
      });
    });

    this._applyTheme();
  }

  async _switchView(viewName) {
    this.currentView = viewName;
    if (!this.shadow) return;

    const welcomeEl = this.shadow.getElementById('view-welcome');
    const apikeyEl = this.shadow.getElementById('view-apikey');
    const titleText = this.shadow.getElementById('header-title-text');
    const selectSetupModel = this.shadow.getElementById('select-setup-model');

    if (viewName === 'welcome') {
      welcomeEl?.classList.add('active');
      apikeyEl?.classList.remove('active');
      if (titleText) titleText.textContent = 'Mentari Mod Modern Edition';
    } else {
      welcomeEl?.classList.remove('active');
      apikeyEl?.classList.add('active');
      if (titleText) titleText.textContent = 'Koneksi Google Gemini AI';
      try {
        const { gemini_model, gemini_thinking_level } = await Storage.get({
          gemini_model: DEFAULT_FREE_MODEL,
          gemini_thinking_level: null
        });
        const resolvedModel = VALID_FREE_MODEL_IDS.includes(gemini_model) ? gemini_model : DEFAULT_FREE_MODEL;
        if (selectSetupModel) {
          selectSetupModel.value = resolvedModel;
        }
        this._renderThinkingOptions?.(resolvedModel, gemini_thinking_level);
      } catch {}
      this._loadAndRenderKeys();
      const inputKey = this.shadow.getElementById('input-api-key');
      setTimeout(() => inputKey?.focus(), 140);
    }
  }

  _updateFooterState(keyCount) {
    if (!this.shadow) return;
    const btnCancel = this.shadow.getElementById('btn-cancel');
    const btnAddKey = this.shadow.getElementById('btn-add-key');
    const btnFinishSetup = this.shadow.getElementById('btn-finish-setup');

    if (keyCount > 0) {
      if (btnCancel) btnCancel.style.display = 'none';
      if (btnFinishSetup) btnFinishSetup.style.display = 'inline-flex';
      if (btnAddKey) {
        btnAddKey.className = 'btn btn-outline';
        btnAddKey.textContent = 'Tambah Key';
      }
    } else {
      if (btnCancel) btnCancel.style.display = 'inline-flex';
      if (btnFinishSetup) btnFinishSetup.style.display = 'none';
      if (btnAddKey) {
        btnAddKey.className = 'btn btn-save';
        btnAddKey.textContent = 'Tambah & Uji Key';
      }
    }
  }

  async _loadAndRenderKeys() {
    if (!this.shadow) return;
    const container = this.shadow.getElementById('keys-list-container');
    const countBadge = this.shadow.getElementById('keys-count-badge');
    if (!container) return;

    chrome.runtime.sendMessage({ action: 'getGeminiApiKeys' }, (res) => {
      const keys = res?.keys || [];
      const activeKey = res?.activeKey || keys[0] || '';

      if (countBadge) {
        countBadge.textContent = `${keys.length} Key`;
      }
      this._updateFooterState(keys.length);

      if (keys.length === 0) {
        container.innerHTML = `
          <div class="empty-keys">
            Belum ada API Key tersimpan. Masukkan key Gemini agar asisten dapat bekerja.
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      keys.forEach((key) => {
        const isPrimary = key === activeKey;
        const itemDiv = document.createElement('div');
        itemDiv.className = `key-item ${isPrimary ? 'active' : ''}`;

        itemDiv.innerHTML = `
          <div class="key-left">
            <span class="key-badge ${isPrimary ? 'primary' : 'backup'}">
              ${isPrimary ? 'Utama' : 'Cadangan'}
            </span>
            <span class="key-code" title="${key}">${this._maskKey(key)}</span>
          </div>
          <div class="key-actions">
            ${!isPrimary ? `
              <button class="key-btn btn-set-primary" data-key="${key}" title="Jadikan API Key Utama">Utamakan</button>
            ` : ''}
            <button class="key-btn btn-delete" data-key="${key}" title="Hapus API Key ini" aria-label="Hapus Key">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;

        const btnSet = itemDiv.querySelector('.btn-set-primary');
        if (btnSet) {
          btnSet.addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'setActiveGeminiApiKey',
              apiKey: key
            }, (setRes) => {
              if (setRes && setRes.success) {
                Toast.success('API Key utama berhasil diperbarui.');
                this._loadAndRenderKeys();
                window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
                  detail: { apiKey: key }
                }));
              }
            });
          });
        }

        const btnDel = itemDiv.querySelector('.btn-delete');
        if (btnDel) {
          btnDel.addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'removeGeminiApiKey',
              apiKey: key
            }, (delRes) => {
              if (delRes && delRes.success) {
                Toast.info('API Key telah dihapus.');
                this._loadAndRenderKeys();
                window.dispatchEvent(new CustomEvent('gemini-api-key-updated', {
                  detail: { apiKey: delRes.activeKey }
                }));
              }
            });
          });
        }

        container.appendChild(itemDiv);
      });
    });
  }

  async openModal(view = 'apikey') {
    this.currentTheme = await ThemeHelper.getEffectiveTheme();
    this._buildModalDOM();
    this.isOpen = true;
    this._applyTheme();
    if (this.host) {
      this.host.style.display = 'block';
    }
    await this._switchView(view);

    const overlay = this.shadow?.querySelector('.overlay');
    if (overlay) {
      void overlay.offsetWidth;
      overlay.classList.add('open');
    }
  }

  closeModal() {
    if (!this.shadow) return;
    this.isOpen = false;
    const overlay = this.shadow.querySelector('.overlay');
    if (overlay) overlay.classList.remove('open');
    setTimeout(() => {
      if (!this.isOpen && this.host) {
        this.host.style.display = 'none';
      }
    }, 260);
  }
}

export const apiKeyManager = new ApiKeyManager();
