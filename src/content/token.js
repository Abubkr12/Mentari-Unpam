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
    this.forumSearchQuery = '';
    this.expandedForumCourses = new Set();
    this._userModifiedForumAccordion = false;
    this.courseForumsMeta = {};
    this._lastSyncedAt = null;
    this._isRefreshingForums = false;
    this.evalFilter = 'all';
    this.evalSearchQuery = '';
    this.evalTypeFilter = 'all';
    this.expandedCourses = new Set();
    this._userModifiedAccordion = false;
    this._currentFetchPromise = null;
    this._studentName = '';
    this._studentNim = '';
    this.currentTheme = 'dark';
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Dashboard & Token Engine aktif.');

    // Muat preferensi tema dari storage
    try {
      const { mentari_theme } = await Storage.get('mentari_theme', { mentari_theme: 'dark' });
      if (mentari_theme === 'light' || mentari_theme === 'dark') {
        this.currentTheme = mentari_theme;
      }
    } catch {}

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
    this._applyTheme(this.currentTheme);
    const overlay = this.shadow.querySelector('.overlay');
    overlay.classList.add('open');
    this.isOpen = true;
    this.expandedCourses.clear();
    this._userModifiedAccordion = false;
    this.expandedForumCourses.clear();
    this._userModifiedForumAccordion = false;

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

      /* Custom Modern Scrollbars */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.28);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.55);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
      }

      /* Modern Range Slider */
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 4px;
        outline: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #d4af37;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        transition: transform 0.15s ease, background-color 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: #f3cf55;
      }

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
        position: relative;
      }
      .header {
        padding: 16px 22px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        cursor: grab;
        user-select: none;
      }
      .header:active {
        cursor: grabbing;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .theme-toggle-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      .theme-toggle-btn:hover {
        color: #d4af37;
        background: rgba(255, 255, 255, 0.06);
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

      /* Forum Controls & Search */
      .forum-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        flex-wrap: wrap;
        align-items: center;
      }
      .forum-search-wrap {
        flex: 1;
        min-width: 220px;
        position: relative;
        display: flex;
        align-items: center;
      }
      .forum-search-icon {
        position: absolute;
        left: 12px;
        color: #888;
        pointer-events: none;
      }
      .forum-search-input {
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
      .forum-search-input:focus {
        border-color: #d4af37;
      }
      .forum-search-clear {
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
      .forum-search-clear:hover { color: #fff; }
      .forum-filter-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .forum-toggle-all-btn {
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
      .forum-toggle-all-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .forum-sync-time {
        font-size: 11px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 0 4px;
      }

      /* Forum Accordion Card & Items */
      .forum-course-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .forum-course-card:hover {
        border-color: rgba(212, 175, 55, 0.2);
      }
      .forum-accordion-header {
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
      .forum-accordion-header:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .forum-accordion-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        min-width: 0;
      }
      .forum-accordion-title span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .forum-accordion-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .forum-accordion-chevron {
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        color: #888;
      }
      .forum-accordion-chevron.open {
        transform: rotate(180deg);
        color: #d4af37;
      }
      .forum-accordion-content {
        display: none;
        padding: 10px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
      }
      .forum-accordion-content.open {
        display: block;
      }
      .forum-item {
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
      .forum-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(212, 175, 55, 0.2);
      }
      .forum-item-info {
        flex: 1;
        min-width: 0;
      }
      .forum-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #ddd;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .forum-item-meta {
        font-size: 10px;
        color: #777;
        margin-top: 2px;
      }
      .forum-btn-action {
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
      }
      .forum-btn-action:hover {
        background: #d4af37;
        color: #121212;
      }
      .forum-unavailable-box {
        background: rgba(245, 158, 11, 0.06);
        border: 1px dashed rgba(245, 158, 11, 0.25);
        border-radius: 9px;
        padding: 10px 14px;
        margin-top: 8px;
        margin-bottom: 6px;
      }
      .forum-unavailable-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #fbbf24;
      }
      .forum-unavailable-title {
        font-size: 12px;
        font-weight: 600;
        color: #fbbf24;
      }
      .forum-unavailable-reason {
        font-size: 11px;
        color: #aaa;
        margin-top: 4px;
        margin-left: 22px;
        line-height: 1.4;
      }

      /* Legacy Forum Card & Open Button Fallback */
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
      @keyframes mentari-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spin-animation {
        animation: mentari-spin 1s linear infinite;
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

      /* ─── Light Mode Overrides ─── */
      .modal.theme-light {
        background: #f8fafc;
        border-color: #cbd5e1;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
        color: #1e293b;
        scrollbar-color: rgba(217, 119, 6, 0.35) transparent;
      }
      .modal.theme-light ::-webkit-scrollbar-thumb {
        background: rgba(217, 119, 6, 0.35);
      }
      .modal.theme-light ::-webkit-scrollbar-thumb:hover {
        background: rgba(217, 119, 6, 0.65);
      }
      .modal.theme-light .header {
        background: #ffffff;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .brand {
        color: #0f172a;
      }
      .modal.theme-light .brand-badge {
        background: rgba(217, 119, 6, 0.15);
        color: #b45309;
      }
      .modal.theme-light .close-btn,
      .modal.theme-light .theme-toggle-btn {
        color: #64748b;
      }
      .modal.theme-light .close-btn:hover,
      .modal.theme-light .theme-toggle-btn:hover {
        color: #0f172a;
        background: rgba(0, 0, 0, 0.05);
      }
      .modal.theme-light .tabs-bar {
        background: #f1f5f9;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .tab-btn {
        color: #64748b;
      }
      .modal.theme-light .tab-btn:hover {
        color: #0f172a;
        background: rgba(0, 0, 0, 0.04);
      }
      .modal.theme-light .tab-btn.active {
        color: #b45309;
        border-bottom-color: #d97706;
        background: rgba(217, 119, 6, 0.08);
      }
      .modal.theme-light .filter-pill {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #64748b;
      }
      .modal.theme-light .filter-pill:hover {
        background: #e2e8f0;
        color: #1e293b;
      }
      .modal.theme-light .filter-pill.active {
        background: rgba(217, 119, 6, 0.15);
        border-color: rgba(217, 119, 6, 0.6);
        color: #b45309;
      }
      .modal.theme-light .filter-pill .pill-count {
        background: rgba(0, 0, 0, 0.08);
      }
      .modal.theme-light .filter-pill.active .pill-count {
        background: rgba(217, 119, 6, 0.25);
        color: #78350f;
      }
      .modal.theme-light .forum-search-input,
      .modal.theme-light .eval-search-input,
      .modal.theme-light .eval-type-select,
      .modal.theme-light .select-field {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .modal.theme-light .forum-search-input:focus,
      .modal.theme-light .eval-search-input:focus,
      .modal.theme-light .eval-type-select:focus,
      .modal.theme-light .select-field:focus {
        border-color: #d97706;
      }
      .modal.theme-light .forum-search-icon,
      .modal.theme-light .eval-search-icon {
        color: #94a3b8;
      }
      .modal.theme-light .forum-toggle-all-btn,
      .modal.theme-light .eval-toggle-all-btn,
      .modal.theme-light .btn-config {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #334155;
      }
      .modal.theme-light .forum-toggle-all-btn:hover,
      .modal.theme-light .eval-toggle-all-btn:hover,
      .modal.theme-light .btn-config:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .modal.theme-light .forum-sync-time {
        color: #64748b;
      }
      .modal.theme-light .forum-course-card,
      .modal.theme-light .eval-course-card {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .modal.theme-light .forum-accordion-header,
      .modal.theme-light .eval-accordion-header {
        background: #f8fafc;
      }
      .modal.theme-light .forum-accordion-header:hover,
      .modal.theme-light .eval-accordion-header:hover {
        background: #f1f5f9;
      }
      .modal.theme-light .forum-accordion-title,
      .modal.theme-light .eval-accordion-title {
        color: #0f172a;
      }
      .modal.theme-light .forum-accordion-meta,
      .modal.theme-light .eval-accordion-meta {
        color: #64748b;
      }
      .modal.theme-light .forum-accordion-content,
      .modal.theme-light .eval-accordion-content {
        border-top-color: #f1f5f9;
      }
      .modal.theme-light .forum-item,
      .modal.theme-light .eval-item {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .forum-item:hover,
      .modal.theme-light .eval-item:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .modal.theme-light .forum-item-title,
      .modal.theme-light .eval-item-title {
        color: #0f172a;
      }
      .modal.theme-light .forum-item-meta,
      .modal.theme-light .eval-item-meta {
        color: #64748b;
      }
      .modal.theme-light .forum-unavailable-box {
        background: rgba(0, 0, 0, 0.02);
        border-color: #cbd5e1;
      }
      .modal.theme-light .forum-unavailable-title {
        color: #475569;
      }
      .modal.theme-light .forum-unavailable-reason {
        color: #64748b;
      }
      .modal.theme-light .eval-summary {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .eval-stat-value {
        color: #0f172a;
      }
      .modal.theme-light .eval-stat-label {
        color: #64748b;
      }
      .modal.theme-light .settings-group {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .settings-item {
        background: #f8fafc;
        border-bottom-color: #f1f5f9;
      }
      .modal.theme-light .settings-info h4 {
        color: #0f172a;
      }
      .modal.theme-light .settings-info p {
        color: #64748b;
      }
      .modal.theme-light .empty-state,
      .modal.theme-light .loading-text {
        color: #64748b;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="header" id="dashboard-modal-header">
          <div class="brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff7b00">
              <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
            Mentari Mod
            <span class="brand-badge">Modern Edition</span>
          </div>
          <div class="header-actions">
            <button class="theme-toggle-btn" id="btn-theme-toggle" title="Ganti Tema (Gelap / Terang)">
            </button>
            <button class="close-btn" id="btn-close" title="Tutup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
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
          <div id="forum-controls-bar"></div>
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
                <h4>Tema Tampilan Dashboard</h4>
                <p>Pilih mode tampilan antarmuka Gelap (Obsidian) atau Terang (Clean Light).</p>
              </div>
              <select id="select-dashboard-theme" class="select-field">
                <option value="dark">Mode Gelap (Emas & Obsidian)</option>
                <option value="light">Mode Terang (Clean Light)</option>
              </select>
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

    // Theme Switcher Triggers
    const btnThemeToggle = this.shadow.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    const selectTheme = this.shadow.getElementById('select-dashboard-theme');
    if (selectTheme) {
      selectTheme.value = this.currentTheme;
      selectTheme.addEventListener('change', () => {
        this.setTheme(selectTheme.value);
      });
    }

    // Apply active theme immediately to DOM
    this._applyTheme(this.currentTheme);

    // Draggable Modal
    const modalEl = this.shadow.querySelector('.modal');
    const headerEl = this.shadow.getElementById('dashboard-modal-header');
    if (modalEl && headerEl) {
      this._makeElementDraggable(modalEl, headerEl);
    }
  }

  _applyTheme(theme) {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';
    if (!this.shadow) return;
    const modalEl = this.shadow.querySelector('.modal');
    if (modalEl) {
      if (this.currentTheme === 'light') {
        modalEl.classList.add('theme-light');
      } else {
        modalEl.classList.remove('theme-light');
      }
    }
    const selectTheme = this.shadow.getElementById('select-dashboard-theme');
    if (selectTheme && selectTheme.value !== this.currentTheme) {
      selectTheme.value = this.currentTheme;
    }
    const btnToggle = this.shadow.getElementById('btn-theme-toggle');
    if (btnToggle) {
      if (this.currentTheme === 'dark') {
        btnToggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Ganti ke Mode Terang"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
      } else {
        btnToggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Ganti ke Mode Gelap"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      }
    }
  }

  async toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    await this.setTheme(nextTheme);
  }

  async setTheme(theme) {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';
    await Storage.set({ mentari_theme: this.currentTheme });
    this._applyTheme(this.currentTheme);
    Toast.info(`Tema diubah ke: ${this.currentTheme === 'light' ? 'Mode Terang' : 'Mode Gelap'}`);
  }

  _makeElementDraggable(element, handle) {
    if (!element || !handle) return;
    handle.style.cursor = 'grab';

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onPointerDown = (e) => {
      // Abaikan jika klik pada elemen interaktif
      if (e.target.closest('button, input, select, a, textarea')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      element.style.position = 'fixed';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.margin = '0';
      element.style.transform = 'none';

      handle.style.cursor = 'grabbing';
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = Math.max(10, window.innerWidth - element.offsetWidth - 10);
      const maxTop = Math.max(10, window.innerHeight - element.offsetHeight - 10);

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = 'grab';
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {}
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
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
      this.courseForumsMeta = userCache?.courseForumsMeta || {};
      this._lastSyncedAt = userCache?.lastSyncedAt || userCache?.updatedAt || null;

      if (cachedCourses.length > 0) {
        this.courses = cachedCourses;
        this._renderCourses(cachedCourses);
      }
      if (cachedForums.length > 0 || Object.keys(this.courseForumsMeta).length > 0 || cachedCourses.length > 0) {
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

  _computeUnavailableRanges(meetingNums) {
    if (!meetingNums || meetingNums.length === 0) return [];
    
    // Unik & urutkan ascending
    const sorted = Array.from(new Set(meetingNums)).sort((a, b) => a - b);
    const ranges = [];
    
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === rangeEnd + 1) {
        rangeEnd = current;
      } else {
        ranges.push({
          start: rangeStart,
          end: rangeEnd,
          text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`,
          reason: 'Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka'
        });
        rangeStart = current;
        rangeEnd = current;
      }
    }
    
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
      text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`,
      reason: 'Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka'
    });
    
    return ranges;
  }

  _formatLastSyncTime() {
    if (!this._lastSyncedAt) {
      return `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>Belum sinkron</span>
      `;
    }
    const diffSec = Math.floor((Date.now() - this._lastSyncedAt) / 1000);
    let timeLabel = '';
    if (diffSec < 45) {
      timeLabel = 'Baru saja';
    } else if (diffSec < 3600) {
      const min = Math.floor(diffSec / 60);
      timeLabel = `${min} menit lalu`;
    } else {
      const d = new Date(this._lastSyncedAt);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      timeLabel = `Pukul ${hours}:${mins}`;
    }

    return `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Sinkron: ${timeLabel}</span>
    `;
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

  _renderForumControls() {
    const controlsBar = this.shadow?.getElementById('forum-controls-bar');
    if (!controlsBar) return;

    let controlsWrap = controlsBar.querySelector('.forum-controls');
    if (!controlsWrap) {
      controlsBar.innerHTML = `
        <div class="forum-controls">
          <div class="forum-search-wrap">
            <svg class="forum-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="forum-search-input" id="forum-search-input" placeholder="Cari forum diskusi, mata kuliah, pertemuan..." value="${this.forumSearchQuery}">
            <button class="forum-search-clear" id="forum-search-clear" title="Hapus pencarian">&times;</button>
          </div>
          <div class="forum-filter-actions">
            <button class="forum-toggle-all-btn" id="forum-toggle-all-btn" title="Buka / Tutup Semua Accordion">
              <svg id="forum-toggle-all-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
              </svg>
              <span id="forum-toggle-all-text">Buka Semua</span>
            </button>
            <button class="forum-toggle-all-btn" id="forum-refresh-status-btn" title="Periksa dan Sinkronkan Status Forum Diskusi dari Server UNPAM">
              <svg id="forum-refresh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span id="forum-refresh-status-text">Periksa Status</span>
            </button>
            <div class="forum-sync-time" id="forum-sync-time" title="Waktu sinkronisasi status terakhir dengan server UNPAM">
              ${this._formatLastSyncTime()}
            </div>
          </div>
        </div>
      `;

      const searchInput = controlsBar.querySelector('#forum-search-input');
      const clearBtn = controlsBar.querySelector('#forum-search-clear');
      const toggleAllBtn = controlsBar.querySelector('#forum-toggle-all-btn');
      const refreshStatusBtn = controlsBar.querySelector('#forum-refresh-status-btn');
      const refreshIcon = controlsBar.querySelector('#forum-refresh-status-icon');
      const refreshText = controlsBar.querySelector('#forum-refresh-status-text');

      if (this.forumSearchQuery) {
        clearBtn.style.display = 'block';
      }

      searchInput.addEventListener('input', (e) => {
        this.forumSearchQuery = e.target.value.trim().toLowerCase();
        clearBtn.style.display = this.forumSearchQuery ? 'block' : 'none';
        this._renderForums(this.activeForums, this.courses);
      });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.forumSearchQuery = '';
        this.expandedForumCourses.clear();
        clearBtn.style.display = 'none';
        searchInput.focus();
        this._renderForums(this.activeForums, this.courses);
      });

      toggleAllBtn.addEventListener('click', () => {
        this._handleToggleAllForumCourses();
      });

      if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', async () => {
          if (this._isRefreshingForums) return;
          this._isRefreshingForums = true;
          refreshStatusBtn.disabled = true;
          if (refreshIcon) refreshIcon.classList.add('spin-animation');
          if (refreshText) refreshText.textContent = 'Memeriksa...';
          Toast.info('Memeriksa status forum diskusi terbaru langsung dari server UNPAM...');

          try {
            this._currentFetchPromise = null;
            await this._loadCoursesAndForums();
            Toast.success('Status forum diskusi berhasil disinkronkan dengan server UNPAM!');
          } catch (err) {
            console.error('[Mentari] Gagal sinkronisasi status forum:', err);
            Toast.error('Gagal memperbarui status forum dari server. Silakan coba lagi.');
          } finally {
            this._isRefreshingForums = false;
            refreshStatusBtn.disabled = false;
            if (refreshIcon) refreshIcon.classList.remove('spin-animation');
            if (refreshText) refreshText.textContent = 'Periksa Status';
          }
        });
      }
    } else {
      const timeEl = controlsBar.querySelector('#forum-sync-time');
      if (timeEl) {
        timeEl.innerHTML = this._formatLastSyncTime();
      }
    }

    this._updateForumToggleAllBtn();
  }

  _handleToggleAllForumCourses() {
    if (!this._visibleForumCourseCodes || this._visibleForumCourseCodes.length === 0) return;

    const allExpanded = this._visibleForumCourseCodes.every(code => this.expandedForumCourses.has(code));
    if (allExpanded) {
      this._visibleForumCourseCodes.forEach(code => this.expandedForumCourses.delete(code));
    } else {
      this._visibleForumCourseCodes.forEach(code => this.expandedForumCourses.add(code));
    }
    this._userModifiedForumAccordion = true;
    this._renderForums(this.activeForums, this.courses);
  }

  _updateForumToggleAllBtn() {
    const toggleBtn = this.shadow?.getElementById('forum-toggle-all-btn');
    const toggleText = this.shadow?.getElementById('forum-toggle-all-text');
    const toggleIcon = this.shadow?.getElementById('forum-toggle-all-icon');
    if (!toggleBtn || !toggleText || !this._visibleForumCourseCodes) return;

    const hasCourses = this._visibleForumCourseCodes.length > 0;
    const allExpanded = hasCourses && this._visibleForumCourseCodes.every(code => this.expandedForumCourses.has(code));

    toggleText.textContent = allExpanded ? 'Tutup Semua' : 'Buka Semua';
    if (toggleIcon) {
      toggleIcon.innerHTML = allExpanded
        ? '<path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>'
        : '<path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>';
    }
  }

  _renderForums(forumItems, coursesFallback = []) {
    const forumContainer = this.shadow?.getElementById('forum-list-container');
    if (!forumContainer) return;

    // Render filter pills dan controls bar
    this._renderForumFilterPills(forumItems || []);
    this._renderForumControls();

    forumContainer.innerHTML = '';

    const allCourses = (this.courses && this.courses.length > 0) ? this.courses : coursesFallback;

    // Jika belum ada data sama sekali
    if ((!allCourses || allCourses.length === 0) && (!forumItems || forumItems.length === 0)) {
      forumContainer.innerHTML = '<div class="empty-state">Tidak ada data forum atau mata kuliah aktif saat ini.</div>';
      this._visibleForumCourseCodes = [];
      this._updateForumToggleAllBtn();
      return;
    }

    // Bangun daftar unik mata kuliah
    const courseMap = new Map();
    if (allCourses && allCourses.length > 0) {
      allCourses.forEach(c => {
        const code = c.kode_course || c.kode || c.course_code || c.id;
        const title = c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah';
        if (code && !courseMap.has(code)) {
          courseMap.set(code, { courseCode: code, courseTitle: title, items: [] });
        }
      });
    }

    // Masukkan item forum ke map mata kuliah masing-masing
    if (forumItems && forumItems.length > 0) {
      forumItems.forEach(f => {
        if (!courseMap.has(f.courseCode)) {
          courseMap.set(f.courseCode, {
            courseCode: f.courseCode,
            courseTitle: f.courseTitle || 'Mata Kuliah',
            items: []
          });
        }
        courseMap.get(f.courseCode).items.push(f);
      });
    }

    // Urutkan item forum di setiap mata kuliah berdasarkan pertemuan
    for (const [code, cData] of courseMap.entries()) {
      cData.items.sort((a, b) => {
        const aNum = a.meetingNum || 0;
        const bNum = b.meetingNum || 0;
        if (aNum !== bNum) return aNum - bNum;
        return (a.sectionName || '').localeCompare(b.sectionName || '');
      });
    }

    // Terapkan filter & pencarian ke daftar mata kuliah
    const visibleCourseCodes = [];
    const q = (this.forumSearchQuery || '').toLowerCase();

    for (const [code, cData] of courseMap.entries()) {
      const allCourseItems = cData.items;
      const meta = this.courseForumsMeta[code] || {};
      const unavailableRanges = meta.unavailableRanges || [];

      // 1. Filter status
      let filteredCourseItems = allCourseItems;
      if (this.forumFilter === 'pending') {
        filteredCourseItems = allCourseItems.filter(f => !this._isForumDone(f));
        // Jika filter pending aktif dan mata kuliah tidak memiliki item pending, lewati
        if (filteredCourseItems.length === 0) continue;
      } else if (this.forumFilter === 'done') {
        filteredCourseItems = allCourseItems.filter(f => this._isForumDone(f));
        // Jika filter done aktif dan mata kuliah tidak memiliki item done, lewati
        if (filteredCourseItems.length === 0) continue;
      }

      // 2. Filter pencarian
      if (q) {
        const titleMatches = cData.courseTitle.toLowerCase().includes(q) || code.toLowerCase().includes(q);
        const matchingItems = filteredCourseItems.filter(f => {
          const fn = (f.forumName || '').toLowerCase();
          const sn = (f.sectionName || '').toLowerCase();
          return fn.includes(q) || sn.includes(q);
        });
        const matchingRanges = unavailableRanges.filter(r => r.text.toLowerCase().includes(q));

        if (!titleMatches && matchingItems.length === 0 && matchingRanges.length === 0) {
          continue;
        }

        if (!titleMatches && matchingItems.length > 0) {
          filteredCourseItems = matchingItems;
        }
      }

      visibleCourseCodes.push(code);
    }

    this._visibleForumCourseCodes = visibleCourseCodes;

    // Jika tidak ada hasil
    if (visibleCourseCodes.length === 0) {
      this._updateForumToggleAllBtn();
      if (this.forumSearchQuery || this.forumFilter !== 'all') {
        forumContainer.innerHTML = `
          <div class="empty-state">
            <p>Tidak ada forum yang cocok dengan pencarian atau filter yang dipilih.</p>
            <button class="btn-config" id="btn-reset-forum-filters" style="margin-top:12px;">Reset Filter & Pencarian</button>
          </div>
        `;
        forumContainer.querySelector('#btn-reset-forum-filters')?.addEventListener('click', () => {
          this.forumSearchQuery = '';
          this.forumFilter = 'all';
          this.expandedForumCourses.clear();
          const input = this.shadow?.getElementById('forum-search-input');
          if (input) input.value = '';
          const clear = this.shadow?.getElementById('forum-search-clear');
          if (clear) clear.style.display = 'none';
          this._renderForums(this.activeForums, this.courses);
        });
      } else {
        forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
      }
      return;
    }

    // Jika sedang dalam mode pencarian, otomatis expand semua yang cocok
    if (this.forumSearchQuery) {
      visibleCourseCodes.forEach(c => this.expandedForumCourses.add(c));
    }

    // Render setiap Accordion Mata Kuliah
    for (const code of visibleCourseCodes) {
      const cData = courseMap.get(code);
      const allCourseItems = cData.items;
      const meta = this.courseForumsMeta[code] || {};
      const unavailableRanges = meta.unavailableRanges || [];

      let displayItems = allCourseItems;
      if (this.forumFilter === 'pending') {
        displayItems = allCourseItems.filter(f => !this._isForumDone(f));
      } else if (this.forumFilter === 'done') {
        displayItems = allCourseItems.filter(f => this._isForumDone(f));
      }
      if (q) {
        const titleMatches = cData.courseTitle.toLowerCase().includes(q) || code.toLowerCase().includes(q);
        if (!titleMatches) {
          displayItems = displayItems.filter(f => {
            const fn = (f.forumName || '').toLowerCase();
            const sn = (f.sectionName || '').toLowerCase();
            return fn.includes(q) || sn.includes(q);
          });
        }
      }

      const pendingInCourse = allCourseItems.filter(f => !this._isForumDone(f)).length;
      const isExpanded = this.expandedForumCourses.has(code);

      const card = document.createElement('div');
      card.className = 'forum-course-card';
      card.dataset.course = code;

      const header = document.createElement('div');
      header.className = 'forum-accordion-header';
      header.dataset.course = code;
      header.innerHTML = `
        <div class="forum-accordion-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span title="${cData.courseTitle}">${cData.courseTitle}</span>
        </div>
        <div class="forum-accordion-meta">
          ${allCourseItems.length === 0 
            ? `<span class="badge" style="background:rgba(245,158,11,0.12); color:#fbbf24;">0 Forum Aktif</span>`
            : (pendingInCourse > 0 
                ? `<span class="badge badge-pending">${pendingInCourse} Belum</span>` 
                : `<span class="badge badge-done">Selesai Semua</span>`
              )
          }
          <span class="badge" style="background:rgba(255,255,255,0.06); color:#aaa;">${allCourseItems.length} Forum</span>
          <svg class="forum-accordion-chevron ${isExpanded ? 'open' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;

      const content = document.createElement('div');
      content.className = `forum-accordion-content ${isExpanded ? 'open' : ''}`;

      // 1. Render forum items yang tersedia
      displayItems.forEach(f => {
        const isDone = this._isForumDone(f);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'forum-item';
        itemDiv.innerHTML = `
          <div class="forum-item-info">
            <div class="forum-item-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isDone ? '#10b981' : '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>${f.sectionName} &bull; ${f.forumName}</span>
              ${isDone 
                ? '<span class="badge badge-done">Sudah Dijawab</span>' 
                : '<span class="badge badge-pending">Belum Dijawab</span>'
              }
            </div>
            <div class="forum-item-meta">${f.courseTitle} &bull; ${f.sectionName}</div>
          </div>
          <a class="forum-btn-action" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(f.courseCode)}/forum/${f.forumId}">Buka Forum</a>
        `;
        content.appendChild(itemDiv);
      });

      // 2. Render pertemuan yang belum tersedia (Pertemuan x - y)
      if (this.forumFilter === 'all' && unavailableRanges.length > 0) {
        unavailableRanges.forEach(range => {
          const unDiv = document.createElement('div');
          unDiv.className = 'forum-unavailable-box';
          unDiv.innerHTML = `
            <div class="forum-unavailable-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="forum-unavailable-title">${range.text} Belum Tersedia</span>
            </div>
            <div class="forum-unavailable-reason">
              Alasan: ${range.reason}
            </div>
          `;
          content.appendChild(unDiv);
        });
      } else if (displayItems.length === 0 && unavailableRanges.length === 0) {
        content.innerHTML = `<div style="font-size:12px; color:#888; padding:8px 4px;">Tidak ada forum untuk mata kuliah ini.</div>`;
      }

      // Single-Open (Exclusive Accordion): hanya 1 mata kuliah yang terbuka dalam satu waktu
      header.addEventListener('click', () => {
        this._userModifiedForumAccordion = true;
        const isCurrentlyOpen = content.classList.contains('open');

        // Tutup semua accordion mata kuliah lain terlebih dahulu
        forumContainer.querySelectorAll('.forum-course-card').forEach(otherCard => {
          otherCard.querySelector('.forum-accordion-content')?.classList.remove('open');
          otherCard.querySelector('.forum-accordion-chevron')?.classList.remove('open');
        });
        this.expandedForumCourses.clear();

        // Jika mata kuliah yang diklik sebelumnya sedang tertutup, buka hanya mata kuliah ini
        if (!isCurrentlyOpen) {
          content.classList.add('open');
          header.querySelector('.forum-accordion-chevron')?.classList.add('open');
          this.expandedForumCourses.add(code);
        }

        this._updateForumToggleAllBtn();
      });

      card.appendChild(header);
      card.appendChild(content);
      forumContainer.appendChild(card);
    }

    this._updateForumToggleAllBtn();
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
            <button class="eval-toggle-all-btn" id="eval-refresh-status-btn" title="Periksa dan Sinkronkan Status dari Server UNPAM (Deteksi Kuis Berjalan / Belum Selesai)">
              <svg id="eval-refresh-status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span id="eval-refresh-status-text">Periksa Status</span>
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
      const refreshStatusBtn = controlsBar.querySelector('#eval-refresh-status-btn');
      const refreshIcon = controlsBar.querySelector('#eval-refresh-status-icon');
      const refreshText = controlsBar.querySelector('#eval-refresh-status-text');
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

      if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', async () => {
          if (this._isRefreshingStatus) return;
          this._isRefreshingStatus = true;
          refreshStatusBtn.disabled = true;
          if (refreshIcon) refreshIcon.classList.add('spin-animation');
          if (refreshText) refreshText.textContent = 'Memeriksa...';
          Toast.info('Memeriksa status kuis terbaru langsung dari server UNPAM...');

          try {
            // Reset in-flight promise cache agar memicu fetch segar dari API UNPAM
            this._currentFetchPromise = null;
            await this._loadCoursesAndForums();
            Toast.success('Status kuis & evaluasi berhasil disinkronkan dengan server UNPAM!');
          } catch (err) {
            console.error('[Mentari] Gagal sinkronisasi status:', err);
            Toast.error('Gagal memperbarui status dari server. Silakan coba lagi.');
          } finally {
            this._isRefreshingStatus = false;
            refreshStatusBtn.disabled = false;
            if (refreshIcon) refreshIcon.classList.remove('spin-animation');
            if (refreshText) refreshText.textContent = 'Periksa Status';
          }
        });
      }

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

  async _openAutoPilotModal() {
    if (!this.evaluations || this.evaluations.length === 0) {
      Toast.warning('Belum ada data kuis & evaluasi. Silakan refresh tab terlebih dahulu.');
      return;
    }

    // Ambil preferensi model Gemini aktif dari storage
    const validModelIds = ALL_MODELS.map(m => m.id);
    const { gemini_model } = await Storage.get('gemini_model', { gemini_model: 'gemini-2.5-flash' });
    const currentModel = (gemini_model && validModelIds.includes(gemini_model)) ? gemini_model : 'gemini-2.5-flash';

    // Hapus overlay lama jika ada
    const existing = this.shadow.getElementById('mentari-autopilot-modal-overlay');
    if (existing) existing.remove();

    // Baca kuis yang sudah selesai secara permanen dari storage
    const storeComp = await Storage.get('mentari_completed_quiz_ids');
    const completedQuizIds = Array.isArray(storeComp?.mentari_completed_quiz_ids) ? storeComp.mentari_completed_quiz_ids : [];

    // Dapatkan daftar kuis & evaluasi yang belum selesai langsung berdasarkan status resmi server UNPAM
    const pendingEvals = this.evaluations.filter(e => !e.completion && !e.locked && (e.type === 'PRE_TEST' || e.type === 'POST_TEST' || e.type === 'KUESIONER'));
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

    let selectedMode = 'all';

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
        .ap-modal *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .ap-modal *::-webkit-scrollbar-track {
          background: transparent;
        }
        .ap-modal *::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.28);
          border-radius: 4px;
        }
        .ap-modal *::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.55);
        }
        .ap-modal *::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .ap-modal * {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
        }
        .ap-modal {
          width: 650px;
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
          position: relative;
        }
        .ap-header {
          padding: 18px 24px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: grab;
          user-select: none;
        }
        .ap-header:active {
          cursor: grabbing;
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
          grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
          gap: 8px;
        }
        .ap-mode-card {
          background: #18181d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          padding: 10px 8px;
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
          appearance: none;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .ap-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fbbf24;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 2px rgba(251, 191, 36, 0.9);
          transition: transform 0.15s ease;
        }
        .ap-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .ap-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fbbf24;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 2px rgba(251, 191, 36, 0.9);
          transition: transform 0.15s ease;
        }
        .ap-slider::-moz-range-thumb:hover {
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
        .ap-type-tag.kues {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.25);
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

        /* ─── Auto-Pilot Modal Light Theme Overrides ─── */
        .ap-modal.theme-light {
          background: #ffffff;
          color: #1e293b;
          border-color: #cbd5e1;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb {
          background: rgba(217, 119, 6, 0.35);
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb:hover {
          background: rgba(217, 119, 6, 0.65);
        }
        .ap-modal.theme-light * {
          scrollbar-color: rgba(217, 119, 6, 0.35) transparent;
        }
        .ap-modal.theme-light .ap-header {
          background: #f8fafc;
          border-bottom-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-header-title {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-close-btn {
          color: #64748b;
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .ap-modal.theme-light .ap-close-btn:hover {
          color: #0f172a;
          background: #e2e8f0;
        }
        .ap-modal.theme-light .ap-banner {
          background: rgba(217, 119, 6, 0.08);
          border-color: rgba(217, 119, 6, 0.3);
        }
        .ap-modal.theme-light .ap-banner-text {
          color: #334155;
        }
        .ap-modal.theme-light .ap-banner-text b {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-label {
          color: #475569;
        }
        .ap-modal.theme-light .ap-select {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-select option {
          background: #ffffff;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-mode-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-mode-card:hover {
          border-color: rgba(217, 119, 6, 0.4);
          background: #ffffff;
        }
        .ap-modal.theme-light .ap-mode-card.active {
          background: rgba(217, 119, 6, 0.08);
          border-color: #d97706;
          box-shadow: 0 0 14px rgba(217, 119, 6, 0.15);
        }
        .ap-modal.theme-light .ap-mode-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-mode-card.active .ap-mode-title {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-mode-sub {
          color: #64748b;
        }
        .ap-modal.theme-light .ap-slider {
          background: rgba(0, 0, 0, 0.12);
        }
        .ap-modal.theme-light .ap-slider::-webkit-slider-thumb {
          background: #d97706;
          box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
        }
        .ap-modal.theme-light .ap-slider::-moz-range-thumb {
          background: #d97706;
          box-shadow: 0 0 10px rgba(217, 119, 6, 0.5);
        }
        .ap-modal.theme-light .ap-cooldown-badge {
          background: #d97706;
          color: #ffffff;
        }
        .ap-modal.theme-light .ap-preset-btn {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #475569;
        }
        .ap-modal.theme-light .ap-preset-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-preset-btn.active {
          background: rgba(217, 119, 6, 0.15);
          border-color: rgba(217, 119, 6, 0.45);
          color: #b45309;
        }
        .ap-modal.theme-light .ap-queue-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-queue-header {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-queue-row {
          background: #ffffff;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-row-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-footer {
          background: #f8fafc;
          border-top-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-btn-cancel {
          border-color: #cbd5e1;
          color: #475569;
        }
        .ap-modal.theme-light .ap-btn-cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
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
              Otomatisasi kuis & evaluasi berurutan di <b>1 tab browser aktif</b> (hemat RAM & anti-freeze). Sesuai aturan akademik, <b>Post-Test otomatis dilewati jika Forum Diskusi & Pre-Test pertemuan terkait belum selesai</b>.
            </div>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Lingkup Mata Kuliah</label>
            <select id="ap-course-select" class="ap-select">
              <option value="all">Semua Mata Kuliah (${pendingEvals.length} Belum Selesai)</option>
              ${coursesWithPending.map(c => `<option value="${c.code}">${c.title} (${c.count} Item)</option>`).join('')}
            </select>
          </div>

          <div class="ap-field-group">
            <label class="ap-label">Pilih Mode Pengerjaan</label>
            <div class="ap-mode-grid" id="ap-mode-container">
              <div class="ap-mode-card active" data-mode="all">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Semua Lengkap
                </div>
                <div class="ap-mode-sub">Pre, Post, Kuesioner</div>
              </div>
              <div class="ap-mode-card" data-mode="both">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  Kuis Saja
                </div>
                <div class="ap-mode-sub">Pre-Test lalu Post-Test</div>
              </div>
              <div class="ap-mode-card" data-mode="pre">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Pre-Test
                </div>
                <div class="ap-mode-sub">Hanya Pre-Test</div>
              </div>
              <div class="ap-mode-card" data-mode="post">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Post-Test
                </div>
                <div class="ap-mode-sub">Wajib Forum & Pre tuntas</div>
              </div>
              <div class="ap-mode-card" data-mode="kuesioner">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Kuesioner
                </div>
                <div class="ap-mode-sub">Hanya Kuesioner Dosen</div>
              </div>
            </div>
          </div>

          <div class="ap-field-group">
            <div class="ap-label">
              <span>Model AI Gemini</span>
              <span style="color:#d4af37; font-size:10px; font-weight:600; text-transform:none;">Otak Penjawab Kuis</span>
            </div>
            <select id="ap-model-select" class="ap-select">
              ${ALL_MODELS.map(m => `<option value="${m.id}" ${m.id === currentModel ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
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

    const apModal = overlay.querySelector('.ap-modal');
    const apHeader = overlay.querySelector('.ap-header');
    if (this.currentTheme === 'light') {
      apModal?.classList.add('theme-light');
    }
    if (apModal && apHeader) {
      this._makeElementDraggable(apModal, apHeader);
    }

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

    const parseMeetingNum = (secName) => {
      if (!secName) return 999;
      const m = secName.match(/pertemuan\s*(\d+)/i) || secName.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 999;
    };

    const calculateQueue = () => {
      const selectedCourse = courseSelect.value;

      // Ambil seluruh evaluasi untuk analisis prasyarat
      let allCourseEvals = this.evaluations.filter(e => !e.locked);
      if (selectedCourse !== 'all') {
        allCourseEvals = allCourseEvals.filter(e => e.courseCode === selectedCourse);
      }

      // Kelompokkan per Course Code
      const courseGroups = {};
      allCourseEvals.forEach(e => {
        if (!courseGroups[e.courseCode]) {
          courseGroups[e.courseCode] = {
            courseCode: e.courseCode,
            courseTitle: e.courseTitle,
            items: []
          };
        }
        courseGroups[e.courseCode].items.push(e);
      });

      const validQueue = [];
      const skippedList = [];

      for (const cCode in courseGroups) {
        const cGroup = courseGroups[cCode];

        // Kelompokkan per Pertemuan / Section
        const meetingMap = {};
        cGroup.items.forEach(item => {
          const sec = item.sectionName || 'Umum';
          if (!meetingMap[sec]) meetingMap[sec] = [];
          meetingMap[sec].push(item);
        });

        // Urutkan nomor pertemuan ascending (1, 2, 3... 14)
        const sortedMeetings = Object.keys(meetingMap).sort((a, b) => {
          return parseMeetingNum(a) - parseMeetingNum(b);
        });

        for (const meetingName of sortedMeetings) {
          const mItems = meetingMap[meetingName];

          const preItem = mItems.find(i => i.type === 'PRE_TEST');
          const postItem = mItems.find(i => i.type === 'POST_TEST');
          const kuesItem = mItems.find(i => i.type === 'KUESIONER');

          let preScheduledInQueue = false;

          // 1. PRE-TEST
          if (preItem && !preItem.completion) {
            if (selectedMode === 'all' || selectedMode === 'both' || selectedMode === 'pre') {
              validQueue.push({
                id: preItem.subId,
                courseCode: preItem.courseCode,
                courseTitle: preItem.courseTitle,
                sectionName: preItem.sectionName,
                type: 'PRE_TEST',
                name: preItem.name,
                url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(preItem.courseCode)}/exam/${preItem.subId}`,
                status: 'pending'
              });
              preScheduledInQueue = true;
            }
          }

          // 2. POST-TEST (Wajib Forum selesai & Pre-Test selesai/terjadwal)
          if (postItem && !postItem.completion) {
            if (selectedMode === 'all' || selectedMode === 'both' || selectedMode === 'post') {
              // Cek Forum pertemuan ini
              const matchingForum = (this.activeForums || []).find(f =>
                f.courseCode === postItem.courseCode &&
                (f.sectionName === postItem.sectionName || (f.sectionName && postItem.sectionName && f.sectionName.toLowerCase().trim() === postItem.sectionName.toLowerCase().trim()))
              );
              const isForumDone = matchingForum && (matchingForum.completion === true || matchingForum.answered === true);

              // Cek Pre-Test pertemuan ini: sudah selesai di server ATAU dijadwalkan tepat sebelum Post-Test ini
              const isPreDone = (preItem && preItem.completion) || preScheduledInQueue || (!preItem);

              if (!isForumDone) {
                const reason = matchingForum ? 'Forum Diskusi belum dijawab/diselesaikan' : 'Forum Diskusi belum ada/dibuat dosen';
                skippedList.push({ item: postItem, reason });
              } else if (!isPreDone) {
                skippedList.push({ item: postItem, reason: 'Pre-Test pertemuan ini belum diselesaikan' });
              } else {
                validQueue.push({
                  id: postItem.subId,
                  courseCode: postItem.courseCode,
                  courseTitle: postItem.courseTitle,
                  sectionName: postItem.sectionName,
                  type: 'POST_TEST',
                  name: postItem.name,
                  url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(postItem.courseCode)}/exam/${postItem.subId}`,
                  status: 'pending'
                });
              }
            }
          }

          // 3. KUESIONER
          if (kuesItem && !kuesItem.completion) {
            if (selectedMode === 'all' || selectedMode === 'kuesioner') {
              validQueue.push({
                id: kuesItem.subId,
                courseCode: kuesItem.courseCode,
                courseTitle: kuesItem.courseTitle,
                sectionName: kuesItem.sectionName,
                type: 'KUESIONER',
                name: kuesItem.name,
                url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(kuesItem.courseCode)}/kuesioner/${kuesItem.subId}`,
                status: 'pending'
              });
            }
          }
        }
      }

      // Render Queue Preview
      queueCount.textContent = `${validQueue.length} Item Terjadwal`;
      if (validQueue.length === 0) {
        queueList.innerHTML = `<div style="color:#777; text-align:center; padding:16px; font-size:12px;">Tidak ada kuis/evaluasi yang memenuhi syarat untuk dijalankan pada mode ini.</div>`;
        btnStart.disabled = true;
      } else {
        btnStart.disabled = false;
        queueList.innerHTML = validQueue.map((q, idx) => {
          let typeClass = 'pre';
          let typeLabel = 'Pre-Test';
          let statusLabel = 'Siap';

          if (q.type === 'POST_TEST') {
            typeClass = 'post';
            typeLabel = 'Post-Test';
            statusLabel = 'Syarat Terpenuhi';
          } else if (q.type === 'KUESIONER') {
            typeClass = 'kues';
            typeLabel = 'Kuesioner';
            statusLabel = 'Siap Diisi';
          }

          return `
          <div class="ap-queue-row">
            <div class="ap-row-left">
              <span class="ap-row-num">${idx + 1}.</span>
              <span class="ap-type-tag ${typeClass}">
                ${typeLabel}
              </span>
              <span class="ap-row-title" title="${q.courseTitle} - ${q.sectionName}">
                <b>${q.sectionName}:</b> ${q.courseTitle}
              </span>
            </div>
            <span class="ap-row-status">${statusLabel}</span>
          </div>
          `;
        }).join('');
      }

      // Render Skipped Box
      if (skippedList.length > 0) {
        skippedBox.style.display = 'flex';
        skippedBox.innerHTML = `
          <div class="ap-skipped-header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ${skippedList.length} Post-Test dilewati (Prasyarat Forum Diskusi / Pre-Test belum terpenuhi):
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

    const modelSelect = overlay.querySelector('#ap-model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        const chosen = modelSelect.value;
        if (chosen && validModelIds.includes(chosen)) {
          Storage.set({ gemini_model: chosen });
        }
      });
    }

    // Start Auto-Pilot Button
    btnStart.addEventListener('click', async () => {
      if (!activeValidQueue || activeValidQueue.length === 0) {
        Toast.warning('Tidak ada antrean kuis yang valid.');
        return;
      }

      const cooldown = parseInt(cooldownSlider.value, 10) || 15;
      const chosenModel = (modelSelect && modelSelect.value && validModelIds.includes(modelSelect.value))
        ? modelSelect.value
        : currentModel;

      await Storage.set({ gemini_model: chosenModel });

      // Simpan state Auto-Pilot ke chrome.storage.local
      await Storage.set({
        mentari_auto_pilot_state: {
          active: true,
          currentIndex: 0,
          cooldownSec: cooldown,
          queue: activeValidQueue,
          startedAt: Date.now(),
          paused: false,
          total: activeValidQueue.length,
          model: chosenModel
        }
      });

      const chosenModelObj = ALL_MODELS.find(m => m.id === chosenModel);
      const chosenModelName = chosenModelObj ? chosenModelObj.name.split(' (')[0] : chosenModel;

      Toast.success(`Auto-Pilot Kuis aktif (${chosenModelName})! Memulai kuis 1/${activeValidQueue.length}...`);
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

        const storeComp = await Storage.get('mentari_completed_quiz_ids');
        const completedQuizIds = Array.isArray(storeComp?.mentari_completed_quiz_ids) ? storeComp.mentari_completed_quiz_ids : [];
        const staleCompletedQuizIds = new Set();

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

              const forumCandidates = [];
              const knownMeetings = new Set();
              const activeMeetingNums = new Set();

              // Scan seluruh section secara dinamis (tanpa batas pertemuan)
              for (const section of sections) {
                let meetingNum = null;
                const match = (section.nama_section || '').match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
                if (match) {
                  meetingNum = parseInt(match[1], 10);
                } else if (typeof section.urutan === 'number' && section.urutan > 0) {
                  meetingNum = section.urutan;
                }
                if (meetingNum !== null) knownMeetings.add(meetingNum);

                const subSections = section.sub_section || [];
                const sectionName = section.nama_section || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${section.urutan || ''}`);

                for (const sub of subSections) {
                  // ─── Forum Diskusi Candidate ───────────────────────────
                  if (sub.kode_template === 'FORUM_DISKUSI' && sub.id) {
                    forumCandidates.push({
                      sub,
                      meetingNum,
                      sectionName
                    });
                  }

                  // ─── Pre-Test, Post-Test, Kuesioner ────────────────────
                  // Server UNPAM adalah Single Source of Truth mutlak!
                  if (['PRE_TEST', 'POST_TEST', 'KUESIONER'].includes(sub.kode_template) && sub.id) {
                    const isLocked = !!(sub.warningAlert && sub.warningAlert.length > 0);
                    const isLmsCompleted = Boolean(
                      sub.completion === true ||
                      sub.completion === 1 ||
                      sub.completion === '1' ||
                      sub.completion === 'true' ||
                      sub.is_completed === true ||
                      sub.completed === true ||
                      sub.is_done === true ||
                      sub.status === 'completed' ||
                      sub.status === 'done' ||
                      (sub.nilai !== undefined && sub.nilai !== null && sub.nilai !== '') ||
                      (sub.score !== undefined && sub.score !== null && sub.score !== '') ||
                      (Array.isArray(sub.history) && sub.history.length > 0)
                    );

                    // Self-healing: jika status resmi di UNPAM belum selesai, buang ID dari storage lokal
                    if (!isLmsCompleted && completedQuizIds.includes(sub.id)) {
                      staleCompletedQuizIds.add(sub.id);
                    }

                    evalItems.push({
                      courseCode,
                      courseTitle,
                      sectionName,
                      subId: sub.id,
                      type: sub.kode_template,
                      name: sub.nama_sub_section || sub.judul || sub.kode_template,
                      completion: isLmsCompleted,
                      locked: isLocked,
                      lockReason: sub.warningAlert || ''
                    });
                  }
                }
              }

              // Evaluasi seluruh forum candidate untuk mata kuliah ini secara paralel
              const courseForumItems = [];
              await Promise.allSettled(forumCandidates.map(async (fc) => {
                const { sub, meetingNum, sectionName } = fc;
                const isLmsCompleted = Boolean(sub.completion === true);
                let isAnswered = isLmsCompleted;
                let hasTopics = true;

                if (!isLmsCompleted) {
                  try {
                    const topicRes = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${sub.id}`, options);
                    if (topicRes.ok) {
                      const topicData = await topicRes.json();
                      const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
                      hasTopics = topics.length > 0;

                      if (hasTopics && (this._studentName || this._studentNim)) {
                        const searchName = (this._studentName || '').toLowerCase();
                        const searchNim = (this._studentNim || '').toLowerCase();

                        // Fetch replies untuk seluruh topik secara paralel
                        const replyResults = await Promise.allSettled(topics.map(async (topic) => {
                          try {
                            const replyRes = await fetch(`https://mentari.unpam.ac.id/api/forum/reply/${topic.id}`, options);
                            if (replyRes.ok) {
                              const replyData = await replyRes.json();
                              const replies = replyData.replies || replyData.data || (Array.isArray(replyData) ? replyData : []);
                              return replies.filter(r => {
                                const rName = (r.fullname || r.nama || '').toLowerCase();
                                const rNim = (r.nim || r.username || '').toLowerCase();
                                return (searchName && rName.includes(searchName)) || (searchNim && rNim === searchNim);
                              }).length;
                            }
                          } catch {}
                          return 0;
                        }));

                        let totalReplies = 0;
                        for (const r of replyResults) {
                          if (r.status === 'fulfilled') {
                            totalReplies += r.value;
                          }
                        }
                        if (totalReplies >= 2) {
                          isAnswered = true;
                        }
                      }
                    }
                  } catch {}
                }

                if (hasTopics) {
                  if (meetingNum !== null) activeMeetingNums.add(meetingNum);
                  courseForumItems.push({
                    courseCode,
                    courseTitle,
                    sectionName,
                    meetingNum,
                    forumId: sub.id,
                    forumName: sub.nama_sub_section || sub.judul || 'Forum Diskusi',
                    completion: isLmsCompleted,
                    answered: isAnswered
                  });
                }
              }));

              // Hitung pertemuan yang tidak memiliki forum aktif
              const unavailableMeetings = [];
              for (const mNum of knownMeetings) {
                if (!activeMeetingNums.has(mNum)) {
                  unavailableMeetings.push(mNum);
                }
              }
              const unavailableRanges = this._computeUnavailableRanges(unavailableMeetings);

              this.courseForumsMeta[courseCode] = {
                courseTitle,
                totalSections: sections.length,
                activeCount: courseForumItems.length,
                unavailableRanges
              };

              forumItems.push(...courseForumItems);
            } catch (err) {}
          }));
        }

        // Auto-Prune: simpan pembersihan ID kuis yang terbukti belum selesai di UNPAM
        if (staleCompletedQuizIds.size > 0) {
          const cleanedCompletedIds = completedQuizIds.filter(id => !staleCompletedQuizIds.has(id));
          await Storage.set({ mentari_completed_quiz_ids: cleanedCompletedIds });
          console.log(`[Mentari] Auto-pruned ${staleCompletedQuizIds.size} uncompleted quiz ID(s) from local storage. Server UNPAM authoritative status: Incomplete.`);
        }

        this.activeForums = forumItems;
        this.evaluations = evalItems;
        this._lastSyncedAt = Date.now();

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
            courseForumsMeta: this.courseForumsMeta,
            lastSyncedAt: this._lastSyncedAt,
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