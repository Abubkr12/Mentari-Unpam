/**
 * Mentari Mod Modern Edition - Core Token Interceptor & Course Dashboard
 * Dashboard pemantau forum aktif, kuis & evaluasi Mentari UNPAM dengan Closed Shadow DOM.
 */

import { Storage } from '../utils/storage.js';
import { UnpamAuth } from '../utils/unpam-auth.js';
import { Toast } from '../utils/toast.js';

const ALL_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Rekomendasi)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Cepat)' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash (Next-Gen)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (RPD 500)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (RPD 500)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Power)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Deep)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Reasoning)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Flagship)' }
];

class MentariDashboard {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
    this.courses = [];
    this.activeForums = [];
    this.evaluations = [];
    this.forumFilter = 'all';
    this.evalFilter = 'all';
    this.evalSearchQuery = '';
    this.evalTypeFilter = 'all';
    this.expandedCourses = new Set();
    this._userModifiedAccordion = false;
    this._currentFetchPromise = null;
    this._studentName = '';
    this._studentNim = '';
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Dashboard & Token Engine aktif.');

    // Pasang sniffer
    UnpamAuth.installLiveSniffer();

    // Dengarkan trigger pembuka pop up
    window.addEventListener('mentari-toggle-popup', () => {
      this.toggleModal();
    });

    // Dengarkan saat token berhasil ditangkap live oleh sniffer
    window.addEventListener('mentari-token-captured', () => {
      this._prefetchData();
    });
  }

  async toggleModal() {
    if (this.isOpen) {
      this.closeModal();
    } else {
      await this.openModal();
    }
  }

  async openModal() {
    if (!this.host) {
      this._buildDashboardDOM();
    }
    const overlay = this.shadow.querySelector('.overlay');
    overlay.classList.add('open');
    this.isOpen = true;
    this.expandedCourses.clear();
    this._userModifiedAccordion = false;

    // 1. Cache-First: tampilkan data cache seketika jika tersedia (zero loading delay)
    await this._renderFromCache();

    // 2. Refresh / muat data terbaru di background
    this._loadCoursesAndForums();
  }

  closeModal() {
    if (!this.shadow) return;
    const overlay = this.shadow.querySelector('.overlay');
    if (overlay) overlay.classList.remove('open');
    this.isOpen = false;
  }

  _buildDashboardDOM() {
    this.host = document.createElement('div');
    this.host.id = 'mentari-dashboard-host';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(10px);
        z-index: 2147483642;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .overlay.open {
        opacity: 1;
        visibility: visible;
      }
      .modal {
        width: 760px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #141418;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 18px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e5e5e5;
      }
      .header {
        padding: 16px 22px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        font-weight: 800;
        font-size: 15px;
      }
      .brand-badge {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 700;
      }
      .close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        display: flex;
        border-radius: 6px;
        transition: color 0.2s;
      }
      .close-btn:hover { color: #fff; }
      
      /* Tabs Bar */
      .tabs-bar {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.35);
        overflow-x: auto;
        flex-shrink: 0;
        gap: 4px;
      }
      .tab-btn {
        background: transparent;
        border: none;
        padding: 12px 16px;
        color: #999;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-bottom: 2px solid transparent;
      }
      .tab-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.03);
      }
      .tab-btn.active {
        color: #d4af37;
        border-bottom-color: #d4af37;
        background: rgba(212, 175, 55, 0.06);
      }
      .tab-content {
        flex-grow: 1;
        padding: 20px 22px;
        overflow-y: auto;
        display: none;
      }
      .tab-content.active { display: block; }

      /* Filter Pills */
      .filter-pills {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .filter-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #aaa;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
      }
      .filter-pill:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ddd;
      }
      .filter-pill.active {
        background: rgba(212, 175, 55, 0.2);
        border-color: rgba(212, 175, 55, 0.5);
        color: #d4af37;
      }
      .filter-pill .pill-count {
        background: rgba(255, 255, 255, 0.12);
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 10px;
        margin-left: 6px;
        font-weight: 700;
      }
      .filter-pill.active .pill-count {
        background: rgba(212, 175, 55, 0.35);
        color: #fff;
      }

      /* Forum Card */
      .forum-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        transition: all 0.2s;
      }
      .forum-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.3);
      }
      .forum-title {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
      }
      .forum-course {
        font-size: 11px;
        color: #999;
      }
      .btn-open-forum {
        background: #d4af37;
        color: #121212;
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
      }

      /* Status Badges */
      .badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        margin-left: 6px;
      }
      .badge-done {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
      }
      .badge-pending {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
      }
      .badge-locked {
        color: #6b7280;
        background: rgba(107, 114, 128, 0.15);
      }

      /* Evaluasi Tab & Accordion */
      .eval-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
        align-items: center;
      }
      .eval-search-wrap {
        flex: 1;
        min-width: 220px;
        position: relative;
        display: flex;
        align-items: center;
      }
      .eval-search-icon {
        position: absolute;
        left: 12px;
        color: #888;
        pointer-events: none;
      }
      .eval-search-input {
        width: 100%;
        background: #19191f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 8px 32px 8px 34px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s;
      }
      .eval-search-input:focus {
        border-color: #d4af37;
      }
      .eval-search-clear {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        display: none;
        line-height: 1;
      }
      .eval-search-clear:hover { color: #fff; }
      .eval-filter-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .eval-type-select {
        background: #19191f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      .eval-type-select:focus {
        border-color: #d4af37;
      }
      .eval-toggle-all-btn {
        background: rgba(255, 255, 255, 0.06);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .eval-toggle-all-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .eval-course-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .eval-course-card:hover {
        border-color: rgba(212, 175, 55, 0.2);
      }
      .eval-accordion-header {
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        user-select: none;
        background: rgba(255, 255, 255, 0.02);
        transition: background 0.15s;
      }
      .eval-accordion-header:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .eval-accordion-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        min-width: 0;
      }
      .eval-accordion-title span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .eval-accordion-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .eval-accordion-chevron {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        color: #888;
      }
      .eval-accordion-chevron.open {
        transform: rotate(180deg);
        color: #d4af37;
      }
      .eval-accordion-content {
        display: none;
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }
      .eval-accordion-content.open {
        display: block;
      }
      .eval-section-label {
        font-size: 11px;
        font-weight: 700;
        color: #d4af37;
        padding: 6px 0 4px;
        margin-top: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .eval-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        transition: all 0.2s;
      }
      .eval-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.2);
      }
      .eval-item-info {
        flex: 1;
        min-width: 0;
      }
      .eval-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #ddd;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .eval-item-meta {
        font-size: 10px;
        color: #777;
        margin-top: 2px;
      }
      .eval-btn-action {
        background: rgba(212, 175, 55, 0.15);
        color: #d4af37;
        border: 1px solid rgba(212, 175, 55, 0.35);
        padding: 5px 12px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .eval-btn-action:hover {
        background: rgba(212, 175, 55, 0.3);
      }
      .eval-btn-done {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.3);
        cursor: default;
      }
      .eval-btn-locked {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
        border-color: rgba(107, 114, 128, 0.2);
        cursor: not-allowed;
      }
      .eval-type-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .eval-summary {
        background: rgba(212, 175, 55, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      .eval-stat {
        text-align: center;
      }
      .eval-stat-value {
        font-size: 20px;
        font-weight: 800;
        color: #d4af37;
      }
      .eval-stat-label {
        font-size: 10px;
        color: #999;
        margin-top: 2px;
      }

      /* Settings */
      .settings-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .settings-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        gap: 16px;
      }
      .settings-info h4 { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 2px; }
      .settings-info p { font-size: 11px; color: #888; }
      .select-field {
        background: #1e1e24;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        outline: none;
        cursor: pointer;
      }
      .select-field:focus { border-color: #d4af37; }
      .btn-config {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-config:hover { background: rgba(255, 255, 255, 0.15); }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 40px 16px;
        color: #888;
      }
      .empty-state-icon {
        margin-bottom: 12px;
        opacity: 0.4;
      }
      .loading-text {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 13px;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff7b00">
              <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
            Mentari Mod
            <span class="brand-badge">Modern Edition</span>
          </div>
          <button class="close-btn" id="btn-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="tabs-bar">
          <button class="tab-btn active" data-tab="tab-forums">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Forum Aktif
          </button>
          <button class="tab-btn" data-tab="tab-evaluations">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Kuis & Evaluasi
          </button>
          <button class="tab-btn" data-tab="tab-courses">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Mata Kuliah
          </button>
          <button class="tab-btn" data-tab="tab-settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Pengaturan
          </button>
        </div>

        <div class="tab-content active" id="tab-forums">
          <div id="forum-filter-bar"></div>
          <div id="forum-list-container">
            <div class="loading-text">Memuat forum aktif...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-evaluations">
          <div id="eval-filter-bar"></div>
          <div id="eval-summary-bar"></div>
          <div id="eval-controls-bar"></div>
          <div id="eval-list-container">
            <div class="loading-text">Memuat data kuis & evaluasi...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-courses">
          <div id="course-list-container">
            <div class="loading-text">Memuat daftar mata kuliah...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-settings">
          <div class="settings-group">
            <div class="settings-item">
              <div class="settings-info">
                <h4>Pilihan Model Gemini AI Aktif</h4>
                <p>Ubah model yang digunakan untuk menjawab kuis dan forum kapan saja.</p>
              </div>
              <select id="select-active-model" class="select-field">
                ${ALL_MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Konfigurasi Gemini API Key</h4>
                <p>Atur atau perbarui Google Gemini API Key (format AQ. atau AIza...).</p>
              </div>
              <button class="btn-config" id="btn-open-api-settings">Ubah API Key</button>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Sinkronisasi Ulang Akun</h4>
                <p>Pindai ulang token login dari sesi aktif Mentari UNPAM.</p>
              </div>
              <button class="btn-config" id="btn-refresh-token">Refresh Token</button>
            </div>

            <div class="settings-item">
              <div class="settings-info">
                <h4>Otomatisasi Selesai Kuis</h4>
                <p>Otomatis mengonfirmasi submit selesai kuis setelah semua soal terjawab.</p>
              </div>
              <input type="checkbox" id="toggle-auto-finish" style="cursor:pointer; width:18px; height:18px;">
            </div>
          </div>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    const close = () => this.closeModal();
    this.shadow.getElementById('btn-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
      const link = e.target.closest('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !link.hasAttribute('download')) {
          e.preventDefault();
          close();
          window.location.href = href;
        }
      }
    });

    // Tab switching
    const tabBtns = this.shadow.querySelectorAll('.tab-btn');
    const tabContents = this.shadow.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        this.shadow.getElementById(targetId)?.classList.add('active');
      });
    });

    // Model selection on the fly
    const selectModel = this.shadow.getElementById('select-active-model');
    const validModelIds = ALL_MODELS.map(m => m.id);
    Storage.get('gemini_model').then(({ gemini_model }) => {
      if (gemini_model && validModelIds.includes(gemini_model)) {
        selectModel.value = gemini_model;
      } else {
        selectModel.value = 'gemini-2.5-flash';
        Storage.set({ gemini_model: 'gemini-2.5-flash' });
      }
    });

    selectModel.addEventListener('change', () => {
      const chosen = selectModel.value;
      if (chosen && validModelIds.includes(chosen)) {
        Storage.set({ gemini_model: chosen });
        Toast.success(`Model Gemini diubah ke: ${selectModel.options[selectModel.selectedIndex].text}`);
      }
    });

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.gemini_model) {
          const newModel = changes.gemini_model.newValue;
          if (newModel && validModelIds.includes(newModel) && selectModel.value !== newModel) {
            selectModel.value = newModel;
          }
        }
      });
    }

    // Settings trigger
    this.shadow.getElementById('btn-open-api-settings').addEventListener('click', () => {
      this.closeModal();
      window.dispatchEvent(new CustomEvent('mentari-update-api-key'));
    });

    // Refresh token trigger
    this.shadow.getElementById('btn-refresh-token').addEventListener('click', async () => {
      UnpamAuth._cachedToken = null;
      const token = await UnpamAuth.getAuthToken();
      if (token) {
        Toast.success('Token berhasil dipindai ulang!');
        await this._loadCoursesAndForums();
      } else {
        Toast.warning('Pastikan kamu sudah login ke mentari.unpam.ac.id.');
      }
    });

    // Auto finish toggle
    const toggleAutoFinish = this.shadow.getElementById('toggle-auto-finish');
    Storage.get('mentari_auto_finish_quiz').then(({ mentari_auto_finish_quiz }) => {
      toggleAutoFinish.checked = !!mentari_auto_finish_quiz;
    });
    toggleAutoFinish.addEventListener('change', () => {
      Storage.set({ mentari_auto_finish_quiz: toggleAutoFinish.checked });
      Toast.info(`Auto finish kuis: ${toggleAutoFinish.checked ? 'Aktif' : 'Nonaktif'}`);
    });
  }

  // ─── Cache ────────────────────────────────────────────────────────────────────

  async _renderFromCache() {
    try {
      const token = await UnpamAuth.getAuthToken();
      const userId = UnpamAuth.getUserIdentifier(token);
      const cacheKey = `mentari_cached_data_${userId}`;

      const stored = await Storage.get([cacheKey, 'mentari_cached_courses', 'mentari_cached_forums']);
      const userCache = stored[cacheKey];

      const cachedCourses = userCache?.courses || stored.mentari_cached_courses || [];
      const cachedForums = userCache?.forums || stored.mentari_cached_forums || [];
      const cachedEvals = userCache?.evaluations || [];

      if (cachedCourses.length > 0) {
        this.courses = cachedCourses;
        this._renderCourses(cachedCourses);
      }
      if (cachedForums.length > 0) {
        this.activeForums = cachedForums;
        this._renderForums(cachedForums, cachedCourses);
      }
      if (cachedEvals.length > 0) {
        this.evaluations = cachedEvals;
        this._renderEvaluations(cachedEvals);
      }
    } catch (e) {
      console.log('[Mentari Mod] Info cache status:', e.message);
    }
  }

  // ─── Render: Courses ──────────────────────────────────────────────────────────

  _renderCourses(list) {
    const courseContainer = this.shadow?.getElementById('course-list-container');
    if (!courseContainer || !list) return;

    if (list.length === 0) {
      courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif.</div>';
      return;
    }

    courseContainer.innerHTML = '';
    list.forEach(c => {
      const courseCode = c.kode_course || c.kode || c.course_code || c.id;
      const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah';
      const sks = c.sks || '-';

      const item = document.createElement('div');
      item.className = 'forum-card';
      item.innerHTML = `
        <div>
          <div class="forum-title">${courseTitle}</div>
          <div class="forum-course">Kode: ${courseCode} | SKS: ${sks}</div>
        </div>
        <a class="btn-open-forum" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}">Buka Kelas</a>
      `;
      courseContainer.appendChild(item);
    });
  }

  // ─── Render: Forums with Filter ───────────────────────────────────────────────

  /**
   * Cek apakah item forum sudah diselesaikan:
   * Prioritas 1: sub.completion (Flag resmi LMS database Mentari)
   * Prioritas 2: f.answered (Deteksi balasan reply mahasiswa >= 2 di forum)
   */
  _isForumDone(f) {
    return Boolean(f.completion === true || f.answered === true);
  }

  _renderForumFilterPills(forums) {
    const filterBar = this.shadow?.getElementById('forum-filter-bar');
    if (!filterBar) return;

    const total = forums.length;
    const doneCount = forums.filter(f => this._isForumDone(f)).length;
    const pendingCount = total - doneCount;

    filterBar.innerHTML = '';
    const pills = document.createElement('div');
    pills.className = 'filter-pills';
    pills.innerHTML = `
      <button class="filter-pill ${this.forumFilter === 'all' ? 'active' : ''}" data-filter="all">
        Semua<span class="pill-count">${total}</span>
      </button>
      <button class="filter-pill ${this.forumFilter === 'pending' ? 'active' : ''}" data-filter="pending">
        Belum Dijawab<span class="pill-count">${pendingCount}</span>
      </button>
      <button class="filter-pill ${this.forumFilter === 'done' ? 'active' : ''}" data-filter="done">
        Sudah Dijawab<span class="pill-count">${doneCount}</span>
      </button>
    `;

    pills.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.forumFilter = pill.dataset.filter;
        this._renderForums(this.activeForums, this.courses);
      });
    });

    filterBar.appendChild(pills);
  }

  _renderForums(forumItems, coursesFallback = []) {
    const forumContainer = this.shadow?.getElementById('forum-list-container');
    if (!forumContainer) return;

    // Render filter pills
    if (forumItems && forumItems.length > 0) {
      this._renderForumFilterPills(forumItems);
    }

    forumContainer.innerHTML = '';

    if (!forumItems || forumItems.length === 0) {
      if (coursesFallback && coursesFallback.length > 0) {
        coursesFallback.forEach(c => {
          const courseCode = c.kode_course || c.kode || c.course_code || c.id;
          const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah';
          const item = document.createElement('div');
          item.className = 'forum-card';
          item.innerHTML = `
            <div>
              <div class="forum-title">${courseTitle}</div>
              <div class="forum-course">Buka kelas untuk memeriksa forum diskusi</div>
            </div>
            <a class="btn-open-forum" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}">Lihat Kelas</a>
          `;
          forumContainer.appendChild(item);
        });
      } else {
        forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
      }
      return;
    }

    // Sort: yang belum dijawab selalu tampil paling atas
    const sorted = [...forumItems].sort((a, b) => {
      const aDone = this._isForumDone(a) ? 1 : 0;
      const bDone = this._isForumDone(b) ? 1 : 0;
      return aDone - bDone;
    });

    // Apply filter
    let filtered = sorted;
    if (this.forumFilter === 'pending') {
      filtered = sorted.filter(f => !this._isForumDone(f));
    } else if (this.forumFilter === 'done') {
      filtered = sorted.filter(f => this._isForumDone(f));
    }

    if (filtered.length === 0) {
      const filterLabel = this.forumFilter === 'pending' ? 'belum dijawab' : 'sudah dijawab';
      forumContainer.innerHTML = `<div class="empty-state">Tidak ada forum yang ${filterLabel}.</div>`;
      return;
    }

    filtered.forEach(f => {
      const item = document.createElement('div');
      item.className = 'forum-card';
      const isDone = this._isForumDone(f);
      const statusBadge = isDone
        ? '<span class="badge badge-done">Sudah Dijawab</span>'
        : '<span class="badge badge-pending">Belum Dijawab</span>';

      item.innerHTML = `
        <div>
          <div class="forum-title" style="display:flex; align-items:center; gap:4px;">
            ${f.courseTitle}
            ${statusBadge}
          </div>
          <div class="forum-course">${f.sectionName} &bull; ${f.forumName}</div>
        </div>
        <a class="btn-open-forum" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(f.courseCode)}/forum/${f.forumId}">Buka Forum</a>
      `;
      forumContainer.appendChild(item);
    });
  }

  // ─── Render: Evaluations ──────────────────────────────────────────────────────

  _renderEvalFilterPills(evals) {
    const filterBar = this.shadow?.getElementById('eval-filter-bar');
    if (!filterBar) return;

    const total = evals.length;
    const pendingCount = evals.filter(e => !e.completion && !e.locked).length;
    const doneCount = evals.filter(e => e.completion).length;

    filterBar.innerHTML = '';
    const pills = document.createElement('div');
    pills.className = 'filter-pills';
    pills.innerHTML = `
      <button class="filter-pill ${this.evalFilter === 'all' ? 'active' : ''}" data-filter="all">
        Semua<span class="pill-count">${total}</span>
      </button>
      <button class="filter-pill ${this.evalFilter === 'pending' ? 'active' : ''}" data-filter="pending">
        Belum Dikerjakan<span class="pill-count">${pendingCount}</span>
      </button>
      <button class="filter-pill ${this.evalFilter === 'done' ? 'active' : ''}" data-filter="done">
        Sudah Selesai<span class="pill-count">${doneCount}</span>
      </button>
    `;

    pills.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.evalFilter = pill.dataset.filter;
        this._renderEvaluations(this.evaluations, false);
      });
    });

    filterBar.appendChild(pills);
  }

  _renderEvalSummary(evals) {
    const summaryBar = this.shadow?.getElementById('eval-summary-bar');
    if (!summaryBar) return;

    const preTests = evals.filter(e => e.type === 'PRE_TEST');
    const postTests = evals.filter(e => e.type === 'POST_TEST');
    const kuesioners = evals.filter(e => e.type === 'KUESIONER');

    const preDone = preTests.filter(e => e.completion).length;
    const postDone = postTests.filter(e => e.completion).length;
    const kuesDone = kuesioners.filter(e => e.completion).length;

    summaryBar.innerHTML = `
      <div class="eval-summary">
        <div class="eval-stat">
          <div class="eval-stat-value">${preDone}/${preTests.length}</div>
          <div class="eval-stat-label">Pre-Test</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${postDone}/${postTests.length}</div>
          <div class="eval-stat-label">Post-Test</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${kuesDone}/${kuesioners.length}</div>
          <div class="eval-stat-label">Kuesioner</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value">${preDone + postDone + kuesDone}/${evals.length}</div>
          <div class="eval-stat-label">Total</div>
        </div>
      </div>
    `;
  }

  _renderEvalControls(evals) {
    const controlsBar = this.shadow?.getElementById('eval-controls-bar');
    if (!controlsBar) return;

    let controlsWrap = controlsBar.querySelector('.eval-controls');
    if (!controlsWrap) {
      controlsBar.innerHTML = `
        <div class="eval-controls">
          <div class="eval-search-wrap">
            <svg class="eval-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="eval-search-input" id="eval-search-input" placeholder="Cari kuis, evaluasi, mata kuliah, pertemuan..." value="${this.evalSearchQuery}">
            <button class="eval-search-clear" id="eval-search-clear" title="Hapus pencarian">&times;</button>
          </div>
          <div class="eval-filter-actions">
            <select class="eval-type-select" id="eval-type-select">
              <option value="all">Semua Tipe</option>
              <option value="PRE_TEST">Pre-Test</option>
              <option value="POST_TEST">Post-Test</option>
              <option value="KUESIONER">Kuesioner</option>
            </select>
            <button class="eval-toggle-all-btn" id="eval-toggle-all-btn" title="Buka / Tutup Semua Accordion">
              <svg id="eval-toggle-all-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
              </svg>
              <span id="eval-toggle-all-text">Buka Semua</span>
            </button>
            <button class="eval-toggle-all-btn" id="eval-autopilot-btn" title="Auto-Pilot Kuis Batch (1 Tab Murni)" style="background:rgba(212,175,55,0.18); border-color:rgba(212,175,55,0.45); color:#fbbf24; font-weight:700;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Auto-Pilot Kuis</span>
            </button>
          </div>
        </div>
      `;

      const searchInput = controlsBar.querySelector('#eval-search-input');
      const clearBtn = controlsBar.querySelector('#eval-search-clear');
      const typeSelect = controlsBar.querySelector('#eval-type-select');
      const toggleAllBtn = controlsBar.querySelector('#eval-toggle-all-btn');
      const autoPilotBtn = controlsBar.querySelector('#eval-autopilot-btn');

      if (this.evalSearchQuery) {
        clearBtn.style.display = 'block';
      }

      searchInput.addEventListener('input', (e) => {
        this.evalSearchQuery = e.target.value.trim().toLowerCase();
        clearBtn.style.display = this.evalSearchQuery ? 'block' : 'none';
        this._renderEvaluations(this.evaluations, false);
      });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.evalSearchQuery = '';
        this.expandedCourses.clear();
        clearBtn.style.display = 'none';
        searchInput.focus();
        this._renderEvaluations(this.evaluations, false);
      });

      typeSelect.value = this.evalTypeFilter;
      typeSelect.addEventListener('change', (e) => {
        this.evalTypeFilter = e.target.value;
        this._renderEvaluations(this.evaluations, false);
      });

      toggleAllBtn.addEventListener('click', () => {
        this._handleToggleAllCourses();
      });

      if (autoPilotBtn) {
        autoPilotBtn.addEventListener('click', () => {
          this._openAutoPilotModal();
        });
      }
    }

    this._updateToggleAllBtn();
  }

  _handleToggleAllCourses() {
    if (!this._visibleCourseCodes || this._visibleCourseCodes.length === 0) return;

    const allExpanded = this._visibleCourseCodes.every(code => this.expandedCourses.has(code));
    if (allExpanded) {
      this._visibleCourseCodes.forEach(code => this.expandedCourses.delete(code));
    } else {
      this._visibleCourseCodes.forEach(code => this.expandedCourses.add(code));
    }
    this._userModifiedAccordion = true;
    this._renderEvaluations(this.evaluations, false);
  }

  _updateToggleAllBtn() {
    const toggleBtn = this.shadow?.getElementById('eval-toggle-all-btn');
    const toggleText = this.shadow?.getElementById('eval-toggle-all-text');
    const toggleIcon = this.shadow?.getElementById('eval-toggle-all-icon');
    if (!toggleBtn || !toggleText || !this._visibleCourseCodes) return;

    const hasCourses = this._visibleCourseCodes.length > 0;
    const allExpanded = hasCourses && this._visibleCourseCodes.every(code => this.expandedCourses.has(code));

    toggleText.textContent = allExpanded ? 'Tutup Semua' : 'Buka Semua';
    if (toggleIcon) {
      toggleIcon.innerHTML = allExpanded
        ? '<path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>'
        : '<path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>';
    }
  }

  _openAutoPilotModal() {
    if (!this.evaluations || this.evaluations.length === 0) {
      Toast.warning('Belum ada data kuis & evaluasi. Silakan refresh tab terlebih dahulu.');
      return;
    }

    // Hapus overlay lama jika ada
    const existing = this.shadow.getElementById('mentari-autopilot-modal-overlay');
    if (existing) existing.remove();

    // Dapatkan daftar courses yang memiliki kuis belum selesai
    const pendingEvals = this.evaluations.filter(e => !e.completion && !e.locked && (e.type === 'PRE_TEST' || e.type === 'POST_TEST'));
    const coursesWithPending = [];
    const courseMap = {};

    pendingEvals.forEach(e => {
      if (!courseMap[e.courseCode]) {
        courseMap[e.courseCode] = {
          code: e.courseCode,
          title: e.courseTitle,
          count: 0
        };
        coursesWithPending.push(courseMap[e.courseCode]);
      }
      courseMap[e.courseCode].count++;
    });

    let selectedMode = 'both';

    const overlay = document.createElement('div');
    overlay.id = 'mentari-autopilot-modal-overlay';
    overlay.className = 'ap-overlay';

    overlay.innerHTML = `
      <style>
        .ap-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(14px);
          z-index: 2147483645;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: apFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes apFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .ap-modal {
          width: 630px;
          max-width: 94vw;
          max-height: 90vh;
          background: #131317;
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #f1f1f1;
        }
        .ap-header {
          padding: 18px 24px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ap-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: 0.3px;
        }
        .ap-header-title svg {
          color: #d4af37;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.5));
        }
        .ap-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #999;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ap-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .ap-content {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ap-content::-webkit-scrollbar {
          width: 5px;
        }
        .ap-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .ap-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.16);
          border-radius: 4px;
        }
        .ap-content::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.4);
        }
        .ap-banner {
          background: rgba(212, 175, 55, 0.07);
          border: 1px solid rgba(212, 175, 55, 0.28);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ap-banner-icon {
          color: #fbbf24;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .ap-banner-text {
          font-size: 12px;
          line-height: 1.55;
          color: #d1d5db;
        }
        .ap-banner-text b {
          color: #fbbf24;
        }
        .ap-field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ap-select {
          width: 100%;
          background: #1b1b20;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: #f3f4f6;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .ap-select:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
        }
        .ap-select option {
          background: #18181c;
          color: #fff;
          padding: 8px;
        }
        .ap-mode-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .ap-mode-card {
          background: #18181d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          padding: 12px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
          transition: all 0.2s;
          user-select: none;
        }
        .ap-mode-card:hover {
          border-color: rgba(212, 175, 55, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }
        .ap-mode-card.active {
          background: rgba(212, 175, 55, 0.1);
          border-color: #fbbf24;
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.15);
        }
        .ap-mode-title {
          font-size: 12px;
          font-weight: 700;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .ap-mode-card.active .ap-mode-title {
          color: #fbbf24;
        }
        .ap-mode-sub {
          font-size: 10px;
          color: #888;
          line-height: 1.3;
        }
        .ap-cooldown-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-slider-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ap-slider {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
          outline: none;
          accent-color: #fbbf24;
          cursor: pointer;
        }
        .ap-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fbbf24;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
          transition: transform 0.15s;
        }
        .ap-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .ap-cooldown-badge {
          font-size: 12px;
          font-weight: 700;
          color: #111;
          background: #fbbf24;
          padding: 3px 9px;
          border-radius: 6px;
          white-space: nowrap;
          font-family: monospace;
        }
        .ap-presets {
          display: flex;
          gap: 6px;
        }
        .ap-preset-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #aaa;
          font-size: 11px;
          padding: 4px 9px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ap-preset-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .ap-preset-btn.active {
          background: rgba(212, 175, 55, 0.18);
          border-color: rgba(212, 175, 55, 0.45);
          color: #fbbf24;
        }
        .ap-queue-card {
          background: #17171c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ap-queue-header {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ap-queue-count-badge {
          font-size: 11px;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.25);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .ap-queue-list {
          max-height: 190px;
          overflow-y: auto;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ap-queue-list::-webkit-scrollbar {
          width: 5px;
        }
        .ap-queue-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .ap-queue-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }
        .ap-queue-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .ap-row-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .ap-row-num {
          font-family: monospace;
          font-size: 11px;
          color: #777;
          width: 18px;
          flex-shrink: 0;
        }
        .ap-type-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .ap-type-tag.pre {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }
        .ap-type-tag.post {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .ap-row-title {
          font-size: 12px;
          color: #e5e7eb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 330px;
        }
        .ap-row-status {
          font-size: 10px;
          color: #10b981;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .ap-skipped-box {
          margin-top: 6px;
          padding: 10px 12px;
          background: rgba(239, 68, 68, 0.07);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 8px;
          font-size: 11px;
          color: #fca5a5;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ap-skipped-header {
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f87171;
        }
        .ap-skipped-list {
          max-height: 80px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-left: 16px;
        }
        .ap-footer {
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }
        .ap-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #bbb;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ap-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .ap-btn-start {
          background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%);
          color: #111;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
        }
        .ap-btn-start:hover {
          background: linear-gradient(135deg, #e6be40 0%, #fbbf24 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
        }
        .ap-btn-start:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      </style>

      <div class="ap-modal">
        <div class="ap-header">
          <div class="ap-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Auto-Pilot Kuis Batch (Single-Tab)
          </div>
          <button class="ap-close-btn" id="btn-close-ap-modal" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="ap-content">
          <div class="ap-banner">
            <svg class="ap-banner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <div class="ap-banner-text">
              Otomatisasi kuis berurutan di <b>1 tab browser aktif</b> (hemat RAM & anti-freeze). Sesuai aturan akademik, <b>Post-Test otomatis dilewati jika Forum Diskusi belum selesai atau belum ada</b>.
            </div>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Lingkup Mata Kuliah</label>
            <select id="ap-course-select" class="ap-select">
              <option value="all">Semua Mata Kuliah (${pendingEvals.length} Kuis Belum Selesai)</option>
              ${coursesWithPending.map(c => `<option value="${c.code}">${c.title} (${c.count} Kuis)</option>`).join('')}
            </select>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Pilih Mode Pengerjaan</label>
            <div class="ap-mode-grid" id="ap-mode-container">
              <div class="ap-mode-card active" data-mode="both">
                <div class="ap-mode-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Keduanya
                </div>
                <div class="ap-mode-sub">Pre-Test lalu Post-Test</div>
              </div>
              <div class="ap-mode-card" data-mode="pre">
                <div class="ap-mode-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Hanya Pre-Test
                </div>
                <div class="ap-mode-sub">Tanpa syarat forum</div>
              </div>
              <div class="ap-mode-card" data-mode="post">
                <div class="ap-mode-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Hanya Post-Test
                </div>
                <div class="ap-mode-sub">Wajib forum tuntas</div>
              </div>
            </div>
          </div>

          <div class="ap-field-group ap-cooldown-wrap">
            <div class="ap-label">
              <span>Inter-Quiz Cooldown (Jeda Istirahat)</span>
              <span id="ap-cooldown-display" class="ap-cooldown-badge">15 detik</span>
            </div>
            <div class="ap-slider-row">
              <input type="range" id="ap-cooldown-slider" class="ap-slider" min="10" max="60" value="15" step="5">
              <div class="ap-presets">
                <button class="ap-preset-btn" data-val="10">10s</button>
                <button class="ap-preset-btn active" data-val="15">15s</button>
                <button class="ap-preset-btn" data-val="25">25s</button>
                <button class="ap-preset-btn" data-val="40">40s</button>
              </div>
            </div>
            <div style="font-size: 11px; color: #888;">
              Jeda istirahat acak di akhir kuis untuk mensimulasikan tempo manusia dan menghindari deteksi bot.
            </div>
          </div>

          <div class="ap-field-group">
            <div class="ap-queue-card">
              <div class="ap-queue-header">
                <span class="ap-label" style="color:#ddd; margin:0;">Pratinjau Antrean Eksekusi</span>
                <span id="ap-queue-count" class="ap-queue-count-badge">0 Kuis Terjadwal</span>
              </div>
              <div id="ap-queue-preview-list" class="ap-queue-list">
              </div>
            </div>
            <div id="ap-skipped-box" class="ap-skipped-box" style="display: none;">
            </div>
          </div>
        </div>

        <div class="ap-footer">
          <button class="ap-btn-cancel" id="btn-cancel-ap">Batal</button>
          <button class="ap-btn-start" id="btn-start-ap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Mulai Auto-Pilot (1 Tab)
          </button>
        </div>
      </div>
    `;

    this.shadow.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#btn-close-ap-modal').addEventListener('click', close);
    overlay.querySelector('#btn-cancel-ap').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const courseSelect = overlay.querySelector('#ap-course-select');
    const modeCards = overlay.querySelectorAll('.ap-mode-card');
    const cooldownSlider = overlay.querySelector('#ap-cooldown-slider');
    const cooldownDisplay = overlay.querySelector('#ap-cooldown-display');
    const presetBtns = overlay.querySelectorAll('.ap-preset-btn');
    const queueList = overlay.querySelector('#ap-queue-preview-list');
    const queueCount = overlay.querySelector('#ap-queue-count');
    const skippedBox = overlay.querySelector('#ap-skipped-box');
    const btnStart = overlay.querySelector('#btn-start-ap');

    const updateCooldown = (val) => {
      cooldownSlider.value = val;
      cooldownDisplay.textContent = `${val} detik`;
      presetBtns.forEach(b => {
        if (parseInt(b.dataset.val, 10) === parseInt(val, 10)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    };

    cooldownSlider.addEventListener('input', (e) => {
      updateCooldown(e.target.value);
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        updateCooldown(btn.dataset.val);
      });
    });

    const calculateQueue = () => {
      const selectedCourse = courseSelect.value;

      let candidates = this.evaluations.filter(e => !e.completion && !e.locked);
      if (selectedCourse !== 'all') {
        candidates = candidates.filter(e => e.courseCode === selectedCourse);
      }

      const preCandidates = candidates.filter(e => e.type === 'PRE_TEST');
      const postCandidates = candidates.filter(e => e.type === 'POST_TEST');

      const validQueue = [];
      const skippedList = [];

      // 1. Tambahkan Pre-Test
      if (selectedMode === 'both' || selectedMode === 'pre') {
        preCandidates.forEach(item => {
          validQueue.push({
            id: item.subId,
            courseCode: item.courseCode,
            courseTitle: item.courseTitle,
            sectionName: item.sectionName,
            type: 'PRE_TEST',
            name: item.name,
            url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(item.courseCode)}/exam/${item.subId}`,
            status: 'pending'
          });
        });
      }

      // 2. Evaluasi Post-Test (Validasi mutlak Forum Diskusi)
      if (selectedMode === 'both' || selectedMode === 'post') {
        postCandidates.forEach(item => {
          const matchingForum = (this.activeForums || []).find(f => 
            f.courseCode === item.courseCode && 
            (f.sectionName === item.sectionName || (f.sectionName && item.sectionName && f.sectionName.toLowerCase().trim() === item.sectionName.toLowerCase().trim()))
          );

          const isForumDone = matchingForum && (matchingForum.completion === true || matchingForum.answered === true);

          if (isForumDone) {
            validQueue.push({
              id: item.subId,
              courseCode: item.courseCode,
              courseTitle: item.courseTitle,
              sectionName: item.sectionName,
              type: 'POST_TEST',
              name: item.name,
              url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(item.courseCode)}/exam/${item.subId}`,
              status: 'pending'
            });
          } else {
            const reason = matchingForum ? 'Forum Diskusi belum dijawab/diselesaikan' : 'Forum Diskusi belum ada/dibuat dosen';
            skippedList.push({
              item,
              reason
            });
          }
        });
      }

      // Render Queue Preview
      queueCount.textContent = `${validQueue.length} Kuis Terjadwal`;
      if (validQueue.length === 0) {
        queueList.innerHTML = `<div style="color:#777; text-align:center; padding:16px; font-size:12px;">Tidak ada kuis yang memenuhi syarat untuk dijalankan pada mode ini.</div>`;
        btnStart.disabled = true;
      } else {
        btnStart.disabled = false;
        queueList.innerHTML = validQueue.map((q, idx) => `
          <div class="ap-queue-row">
            <div class="ap-row-left">
              <span class="ap-row-num">${idx + 1}.</span>
              <span class="ap-type-tag ${q.type === 'PRE_TEST' ? 'pre' : 'post'}">
                ${q.type === 'PRE_TEST' ? 'Pre-Test' : 'Post-Test'}
              </span>
              <span class="ap-row-title" title="${q.courseTitle} - ${q.sectionName}">
                <b>${q.sectionName}:</b> ${q.courseTitle}
              </span>
            </div>
            <span class="ap-row-status">${q.type === 'POST_TEST' ? 'Forum Selesai' : 'Siap'}</span>
          </div>
        `).join('');
      }

      // Render Skipped Box
      if (skippedList.length > 0) {
        skippedBox.style.display = 'flex';
        skippedBox.innerHTML = `
          <div class="ap-skipped-header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ${skippedList.length} Post-Test dilewati (Prasyarat Forum Diskusi belum terpenuhi):
          </div>
          <div class="ap-skipped-list">
            ${skippedList.map(s => `
              <div>• <b>${s.item.sectionName}</b> (${s.item.courseTitle}): <span style="opacity:0.85;">${s.reason}</span></div>
            `).join('')}
          </div>
        `;
      } else {
        skippedBox.style.display = 'none';
      }

      return validQueue;
    };

    let activeValidQueue = calculateQueue();

    courseSelect.addEventListener('change', () => {
      activeValidQueue = calculateQueue();
    });

    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
        activeValidQueue = calculateQueue();
      });
    });

    // Start Auto-Pilot Button
    btnStart.addEventListener('click', async () => {
      if (!activeValidQueue || activeValidQueue.length === 0) {
        Toast.warning('Tidak ada antrean kuis yang valid.');
        return;
      }

      const cooldown = parseInt(cooldownSlider.value, 10) || 15;

      // Simpan state Auto-Pilot ke chrome.storage.local
      await Storage.set({
        mentari_auto_pilot_state: {
          active: true,
          currentIndex: 0,
          cooldownSec: cooldown,
          queue: activeValidQueue,
          startedAt: Date.now(),
          paused: false,
          total: activeValidQueue.length
        }
      });

      Toast.success(`Auto-Pilot Kuis aktif! Memulai kuis 1/${activeValidQueue.length}...`);
      close();

      // Navigasi instan di tab yang sama
      setTimeout(() => {
        window.location.href = activeValidQueue[0].url;
      }, 500);
    });
  }

  _renderEvaluations(evalItems, updateControls = true) {
    const evalContainer = this.shadow?.getElementById('eval-list-container');
    if (!evalContainer) return;

    // Render filter pills, summary, dan controls
    if (evalItems && evalItems.length > 0) {
      this._renderEvalFilterPills(evalItems);
      this._renderEvalSummary(evalItems);
      if (updateControls) {
        this._renderEvalControls(evalItems);
      }
    }

    evalContainer.innerHTML = '';

    if (!evalItems || evalItems.length === 0) {
      evalContainer.innerHTML = '<div class="empty-state">Tidak ada kuis atau evaluasi ditemukan.</div>';
      this._visibleCourseCodes = [];
      this._updateToggleAllBtn();
      return;
    }

    // 1. Filter status pengerjaan
    let filtered = evalItems;
    if (this.evalFilter === 'pending') {
      filtered = filtered.filter(e => !e.completion && !e.locked);
    } else if (this.evalFilter === 'done') {
      filtered = filtered.filter(e => e.completion);
    }

    // 2. Filter tipe kuis/evaluasi
    if (this.evalTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === this.evalTypeFilter);
    }

    // 3. Filter pencarian teks bebas (courseTitle, quiz name, section, code, type keyword)
    if (this.evalSearchQuery) {
      const q = this.evalSearchQuery;
      const typeKeywords = {
        PRE_TEST: 'pre-test pre test pretest',
        POST_TEST: 'post-test post test posttest',
        KUESIONER: 'kuesioner kuisioner evaluasi survei angket'
      };
      filtered = filtered.filter(e => {
        const title = (e.courseTitle || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        const sec = (e.sectionName || '').toLowerCase();
        const code = (e.courseCode || '').toLowerCase();
        const kw = typeKeywords[e.type] || '';
        return title.includes(q) || name.includes(q) || sec.includes(q) || code.includes(q) || kw.includes(q);
      });
    }

    if (filtered.length === 0) {
      this._visibleCourseCodes = [];
      this._updateToggleAllBtn();

      if (this.evalSearchQuery || this.evalTypeFilter !== 'all') {
        evalContainer.innerHTML = `
          <div class="empty-state">
            <p>Tidak ada evaluasi yang cocok dengan pencarian atau filter tipe.</p>
            <button class="btn-config" id="btn-reset-eval-filters" style="margin-top:12px;">Reset Filter & Pencarian</button>
          </div>
        `;
        evalContainer.querySelector('#btn-reset-eval-filters')?.addEventListener('click', () => {
          this.evalSearchQuery = '';
          this.evalTypeFilter = 'all';
          this.evalFilter = 'all';
          this.expandedCourses.clear();
          const input = this.shadow?.getElementById('eval-search-input');
          if (input) input.value = '';
          const clear = this.shadow?.getElementById('eval-search-clear');
          if (clear) clear.style.display = 'none';
          const sel = this.shadow?.getElementById('eval-type-select');
          if (sel) sel.value = 'all';
          this._renderEvaluations(this.evaluations, true);
        });
      } else {
        const filterLabel = this.evalFilter === 'pending' ? 'belum dikerjakan' : 'sudah selesai';
        evalContainer.innerHTML = `<div class="empty-state">Tidak ada evaluasi yang ${filterLabel}.</div>`;
      }
      return;
    }

    // Group by course
    const grouped = {};
    filtered.forEach(e => {
      if (!grouped[e.courseCode]) {
        grouped[e.courseCode] = { courseTitle: e.courseTitle, items: [] };
      }
      grouped[e.courseCode].items.push(e);
    });

    const courseCodes = Object.keys(grouped);
    this._visibleCourseCodes = courseCodes;

    // Expansion default: Awalnya ketutup semua agar rapi dan fokus.
    // Hanya jika ada pencarian aktif yang cocok, buka otomatis yang sesuai.
    if (this.evalSearchQuery) {
      courseCodes.forEach(code => this.expandedCourses.add(code));
    }

    const typeIcons = {
      PRE_TEST: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      POST_TEST: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      KUESIONER: `<svg class="eval-type-icon" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
    };

    const typeLabels = {
      PRE_TEST: 'Pre-Test',
      POST_TEST: 'Post-Test',
      KUESIONER: 'Kuesioner'
    };

    for (const courseCode of courseCodes) {
      const group = grouped[courseCode];
      const pendingInCourse = group.items.filter(e => !e.completion && !e.locked).length;
      const isExpanded = this.expandedCourses.has(courseCode);

      const card = document.createElement('div');
      card.className = 'eval-course-card';
      card.dataset.course = courseCode;

      const header = document.createElement('div');
      header.className = 'eval-accordion-header';
      header.dataset.course = courseCode;
      header.innerHTML = `
        <div class="eval-accordion-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span title="${group.courseTitle}">${group.courseTitle}</span>
        </div>
        <div class="eval-accordion-meta">
          ${pendingInCourse > 0 
            ? `<span class="badge badge-pending">${pendingInCourse} Belum</span>` 
            : `<span class="badge badge-done">Selesai Semua</span>`
          }
          <span class="badge" style="background:rgba(255,255,255,0.06); color:#aaa;">${group.items.length} Item</span>
          <svg class="eval-accordion-chevron ${isExpanded ? 'open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;

      const content = document.createElement('div');
      content.className = `eval-accordion-content ${isExpanded ? 'open' : ''}`;

      // Group items by section
      const bySection = {};
      group.items.forEach(item => {
        const secKey = item.sectionName || 'Lainnya';
        if (!bySection[secKey]) bySection[secKey] = [];
        bySection[secKey].push(item);
      });

      for (const secName of Object.keys(bySection)) {
        const secLabel = document.createElement('div');
        secLabel.className = 'eval-section-label';
        secLabel.textContent = secName;
        content.appendChild(secLabel);

        bySection[secName].forEach(e => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'eval-item';

          let btnHtml = '';
          if (e.completion) {
            btnHtml = `<span class="eval-btn-action eval-btn-done">Selesai</span>`;
          } else if (e.locked) {
            btnHtml = `<span class="eval-btn-action eval-btn-locked" title="${e.lockReason || 'Terkunci'}">Terkunci</span>`;
          } else {
            const url = e.type === 'KUESIONER'
              ? `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/kuesioner/${e.subId}`
              : `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/exam/${e.subId}`;
            btnHtml = `<a class="eval-btn-action" target="_self" href="${url}">Kerjakan</a>`;
          }

          itemDiv.innerHTML = `
            <div class="eval-item-info">
              <div class="eval-item-title">
                ${typeIcons[e.type] || ''}
                ${typeLabels[e.type] || e.type}
                ${e.completion ? '<span class="badge badge-done">Selesai</span>' : (e.locked ? '<span class="badge badge-locked">Terkunci</span>' : '<span class="badge badge-pending">Belum</span>')}
              </div>
              <div class="eval-item-meta">${e.name} &bull; ${secName}</div>
            </div>
            ${btnHtml}
          `;
          content.appendChild(itemDiv);
        });
      }

      // Single-Open (Exclusive Accordion): hanya 1 mata kuliah yang terbuka dalam satu waktu
      header.addEventListener('click', () => {
        this._userModifiedAccordion = true;
        const isCurrentlyOpen = content.classList.contains('open');

        // Tutup semua accordion mata kuliah lain terlebih dahulu
        evalContainer.querySelectorAll('.eval-course-card').forEach(otherCard => {
          otherCard.querySelector('.eval-accordion-content')?.classList.remove('open');
          otherCard.querySelector('.eval-accordion-chevron')?.classList.remove('open');
        });
        this.expandedCourses.clear();

        // Jika mata kuliah yang diklik sebelumnya sedang tertutup, buka hanya mata kuliah ini
        if (!isCurrentlyOpen) {
          content.classList.add('open');
          header.querySelector('.eval-accordion-chevron')?.classList.add('open');
          this.expandedCourses.add(courseCode);
        }

        this._updateToggleAllBtn();
      });

      card.appendChild(header);
      card.appendChild(content);
      evalContainer.appendChild(card);
    }

    this._updateToggleAllBtn();
  }

  // ─── Session Warning ──────────────────────────────────────────────────────────

  _showSessionWarning(msg) {
    const forumContainer = this.shadow?.getElementById('forum-list-container');
    if (!forumContainer || this.shadow?.getElementById('mentari-session-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'mentari-session-banner';
    banner.style.cssText = `
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      color: #fbbf24;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;
    banner.innerHTML = `
      <span>${msg}</span>
      <button id="btn-sync-token-banner" style="background:#f59e0b; color:#121212; border:none; border-radius:6px; padding:4px 10px; font-weight:700; cursor:pointer; font-size:11px; white-space:nowrap;">Pindai Ulang</button>
    `;

    forumContainer.prepend(banner);
    banner.querySelector('#btn-sync-token-banner')?.addEventListener('click', async () => {
      const btn = banner.querySelector('#btn-sync-token-banner');
      if (btn) btn.textContent = 'Memindai...';
      window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
      await new Promise(r => setTimeout(r, 600));
      banner.remove();
      await this._loadCoursesAndForums();
    });
  }

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  async _prefetchData() {
    if (this.isOpen) {
      this._loadCoursesAndForums();
    } else {
      this._fetchDataInternal(true);
    }
  }

  async _loadCoursesAndForums() {
    return this._fetchDataInternal(false);
  }

  /**
   * Mengambil nama lengkap & NIM mahasiswa dari berbagai sumber handal (localStorage, DOM, JWT)
   */
  async _resolveStudentIdentity(token) {
    if (this._studentName && this._studentNim) return;

    // 1. Coba baca dari mentari_user_info di localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const rawInfo = localStorage.getItem('mentari_user_info') || localStorage.getItem('user');
        if (rawInfo) {
          const parsed = JSON.parse(rawInfo);
          this._studentName = parsed.nama || parsed.name || parsed.fullname || parsed.full_name || this._studentName;
          this._studentNim = parsed.nim || parsed.username || this._studentNim;
        }
      }
    } catch {}

    // 2. Coba baca dari elemen DOM profil Mentari (Navbar)
    try {
      if (!this._studentName && typeof document !== 'undefined') {
        const profileEl = document.querySelector('.MuiAvatar-root')?.parentElement;
        if (profileEl) {
          const t = profileEl.textContent.trim();
          if (t && t.length > 2 && !t.includes('Login')) {
            this._studentName = t;
          }
        }
      }
    } catch {}

    // 3. Coba baca dari JWT payload
    if (token) {
      const payload = UnpamAuth.decodeJwtPayload(token);
      if (payload) {
        if (!this._studentName) {
          this._studentName = payload.fullname || payload.full_name || payload.name || payload.nama || '';
        }
        if (!this._studentNim) {
          this._studentNim = payload.nim || payload.username || '';
        }
      }
    }
  }

  async _fetchDataInternal(silent = false) {
    if (this._currentFetchPromise) {
      return this._currentFetchPromise;
    }

    this._currentFetchPromise = (async () => {
      const forumContainer = this.shadow?.getElementById('forum-list-container');
      const courseContainer = this.shadow?.getElementById('course-list-container');

      try {
        let options = await UnpamAuth.getFetchOptions();

        if (!options.headers['Authorization']) {
          window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
          await new Promise(r => setTimeout(r, 600));
          options = await UnpamAuth.getFetchOptions();
        }

        if (!options.headers['Authorization']) {
          if (!silent && forumContainer && (!this.courses || this.courses.length === 0)) {
            const notFoundHtml = `
              <div style="text-align:center; padding:32px 16px; color:#f59e0b; line-height:1.6;">
                <div style="font-weight:700; font-size:14px; margin-bottom:6px;">Sesi Login Belum Terdeteksi</div>
                <div style="font-size:12px; color:#aaa; max-width:400px; margin:0 auto 14px;">
                  Silakan klik menu perkuliahan/dashboard di halaman Mentari atau refresh halaman agar ekstensi dapat menyadap token aktif kamu secara otomatis.
                </div>
                <button class="btn-config" id="btn-retry-scan" style="margin:0 auto;">Pindai Sesi Sekarang</button>
              </div>
            `;
            forumContainer.innerHTML = notFoundHtml;
            if (courseContainer) courseContainer.innerHTML = notFoundHtml;

            const handleRetry = async () => {
              UnpamAuth._cachedToken = null;
              await this._loadCoursesAndForums();
            };
            forumContainer.querySelector('#btn-retry-scan')?.addEventListener('click', handleRetry);
            courseContainer?.querySelector('#btn-retry-scan')?.addEventListener('click', handleRetry);
          }
          return;
        }

        // Ambil identitas mahasiswa dari berbagai sumber handal
        const rawToken = await UnpamAuth.getAuthToken();
        await this._resolveStudentIdentity(rawToken);

        const res = await fetch('https://mentari.unpam.ac.id/api/user-course?page=1&limit=50', options);

        if (res.status === 401) {
          const currentToken = await UnpamAuth.getAuthToken();
          if (currentToken && !UnpamAuth.isTokenValid(currentToken)) {
            UnpamAuth.clearInvalidToken();
          }
          window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
          if (!silent) {
            this._showSessionWarning('Sesi login perlu disegarkan. Klik sembarang menu Mentari atau tombol Pindai Ulang.');
            if (courseContainer && (!this.courses || this.courses.length === 0)) {
              courseContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#f59e0b;">Sesi perlu disegarkan. Silakan klik tombol Pindai Ulang di tab Forum atau buka menu perkuliahan.</div>';
            }
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal memuat mata kuliah.`);
        }

        const resData = await res.json();
        const list = Array.isArray(resData) ? resData : (resData.data || []);
        this.courses = list;

        if (list.length === 0) {
          if (!silent) {
            if (forumContainer) forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
            if (courseContainer) courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif.</div>';
          }
          return;
        }

        // Render courses jika modal sedang terbuka
        if (this.isOpen) {
          this._renderCourses(list);
        }

        // ─── Scan setiap mata kuliah secara efisien ─────────────────────────
        const forumItems = [];
        const evalItems = [];
        const chunkSize = 3;

        for (let i = 0; i < list.length; i += chunkSize) {
          const chunk = list.slice(i, i + chunkSize);
          await Promise.allSettled(chunk.map(async (c) => {
            const courseCode = c.kode_course || c.kode || c.course_code || c.id;
            const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah';
            try {
              const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(courseCode)}`, options);
              if (!cRes.ok) return;
              const cData = await cRes.json();
              const sections = Array.isArray(cData) ? cData : (cData.data || []);

              // Scan seluruh section secara dinamis (tanpa batas pertemuan)
              for (const section of sections) {
                const subSections = section.sub_section || [];
                const sectionName = section.nama_section || `Pertemuan ${section.urutan || ''}`;

                for (const sub of subSections) {
                  // ─── Forum Diskusi ─────────────────────────────────────
                  if (sub.kode_template === 'FORUM_DISKUSI' && sub.id) {
                    const isLmsCompleted = Boolean(sub.completion === true);
                    let isAnswered = isLmsCompleted;
                    let hasTopics = true; // Default true jika sudah selesai

                    // Hanya lakukan deep fetch replies jika BELUM selesai di LMS
                    // Ini menghemat ratusan request HTTP dan mencegah rate-limiting
                    if (!isLmsCompleted) {
                      try {
                        const topicRes = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${sub.id}`, options);
                        if (topicRes.ok) {
                          const topicData = await topicRes.json();
                          const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
                          hasTopics = topics.length > 0;

                          // Jika ada topik dan kita punya identitas mahasiswa, cek tanggapannya
                          if (hasTopics && (this._studentName || this._studentNim)) {
                            let totalReplies = 0;
                            const searchName = (this._studentName || '').toLowerCase();
                            const searchNim = (this._studentNim || '').toLowerCase();

                            for (const topic of topics) {
                              try {
                                const replyRes = await fetch(`https://mentari.unpam.ac.id/api/forum/reply/${topic.id}`, options);
                                if (replyRes.ok) {
                                  const replyData = await replyRes.json();
                                  const replies = replyData.replies || replyData.data || (Array.isArray(replyData) ? replyData : []);
                                  
                                  const myReplies = replies.filter(r => {
                                    const rName = (r.fullname || r.nama || '').toLowerCase();
                                    const rNim = (r.nim || r.username || '').toLowerCase();
                                    return (searchName && rName.includes(searchName)) || (searchNim && rNim === searchNim);
                                  });
                                  totalReplies += myReplies.length;
                                }
                              } catch {}

                              if (totalReplies >= 2) {
                                isAnswered = true;
                                break;
                              }
                            }
                          }
                        }
                      } catch {}
                    }

                    // Hanya tampilkan jika forum memiliki topik diskusi
                    if (hasTopics) {
                      forumItems.push({
                        courseCode,
                        courseTitle,
                        sectionName,
                        forumId: sub.id,
                        forumName: sub.nama_sub_section || sub.judul || 'Forum Diskusi',
                        completion: isLmsCompleted,
                        answered: isAnswered
                      });
                    }
                  }

                  // ─── Pre-Test, Post-Test, Kuesioner ────────────────────
                  if (['PRE_TEST', 'POST_TEST', 'KUESIONER'].includes(sub.kode_template) && sub.id) {
                    const isLocked = !!(sub.warningAlert && sub.warningAlert.length > 0);
                    evalItems.push({
                      courseCode,
                      courseTitle,
                      sectionName,
                      subId: sub.id,
                      type: sub.kode_template,
                      name: sub.nama_sub_section || sub.judul || sub.kode_template,
                      completion: Boolean(sub.completion === true),
                      locked: isLocked,
                      lockReason: sub.warningAlert || ''
                    });
                  }
                }
              }
            } catch (err) {}
          }));
        }

        this.activeForums = forumItems;
        this.evaluations = evalItems;

        // Render jika modal sedang terbuka
        if (this.isOpen) {
          this._renderForums(forumItems, list);
          this._renderEvaluations(evalItems);
        }

        // Simpan ke Cache berdasar identitas user (Multi-User safe)
        const currentToken = await UnpamAuth.getAuthToken();
        const userId = UnpamAuth.getUserIdentifier(currentToken);
        const cacheKey = `mentari_cached_data_${userId}`;

        Storage.set({
          [cacheKey]: {
            courses: list,
            forums: forumItems,
            evaluations: evalItems,
            updatedAt: Date.now()
          },
          mentari_cached_courses: list,
          mentari_cached_forums: forumItems
        });

      } catch (e) {
        if (!silent && forumContainer && (!this.courses || this.courses.length === 0)) {
          forumContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
          if (courseContainer) courseContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
        }
      } finally {
        this._currentFetchPromise = null;
      }
    })();

    return this._currentFetchPromise;
  }
}

if (typeof window !== 'undefined') {
  new MentariDashboard();
}