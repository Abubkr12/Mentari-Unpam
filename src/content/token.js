/**
 * Mentari Mod Modern Edition - Core Token Interceptor & Course Dashboard
 * Dashboard pemantau forum aktif, kuis & evaluasi Mentari UNPAM dengan Closed Shadow DOM.
 */

import { Storage, AutoPilotState } from '../utils/storage.js';
import { UnpamAuth } from '../utils/unpam-auth.js';
import { Toast } from '../utils/toast.js';
import { DocxGenerator } from '../utils/docx-generator.js';
import { MarkdownGenerator } from '../utils/md-generator.js';
import { ThemeHelper, getBrandSvgMarkup } from '../utils/theme.js';
import {
  escapeHtml,
  parseCourseMeta,
  extractCourseDetail,
  extractUniqueStudents,
  formatDurationSeconds
} from '../utils/course-parser.js';
import {
  ACTIVE_FREE_MODELS,
  DEFAULT_FREE_MODEL,
  THINKING_LEVEL_META,
  getSupportedThinkingLevels,
  resolveThinkingLevelForModel
} from '../utils/models.js';

const ALL_MODELS = ACTIVE_FREE_MODELS.map(m => ({ id: m.id, name: m.label }));

class MentariDashboard {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
    this.courses = [];
    this.activeForums = [];
    this.evaluations = [];
    this.courseDetails = {};
    this.hasSyncedCourseDetails = false;
    this.students = [];
    this.courseSearchQuery = '';
    this.expandedCourseCards = new Set();
    this.expandedCourseSections = new Map();
    this._visibleCourseTabCodes = [];
    this.studentSearchQuery = '';
    this.studentCourseFilter = 'all';
    this.expandedStudentNims = new Set();
    this._quizResultCache = new Map();
    this._quizResultInFlight = new Set();
    this._fetchGeneration = 0;
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
    this.currentTheme = ThemeHelper.detectSystemTheme();
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] Dashboard & Token Engine aktif.');

    // Muat preferensi tema adaptif (mengikuti OS/browser jika belum disetel manual)
    try {
      this.currentTheme = await ThemeHelper.getEffectiveTheme();
      ThemeHelper.watchTheme((newTheme) => {
        this._applyTheme(newTheme);
      });
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

    // Reset in-memory state when switching Mentari student accounts while keeping Gemini keys.
    window.addEventListener('mentari-account-switched', () => {
      this._fetchGeneration += 1;
      this.courses = [];
      this.activeForums = [];
      this.evaluations = [];
      this.courseDetails = {};
      this.hasSyncedCourseDetails = false;
      this.students = [];
      this.courseForumsMeta = {};
      this.courseSearchQuery = '';
      this.studentSearchQuery = '';
      this.studentCourseFilter = 'all';
      this.expandedCourseCards.clear();
      this.expandedCourseSections.clear();
      this.expandedStudentNims.clear();
      this._quizResultCache.clear();
      this._quizResultInFlight.clear();
      this._studentName = '';
      this._studentNim = '';
      this._currentFetchPromise = null;
      if (this.isOpen) {
        this._renderCourses([]);
        this._renderStudents([]);
        const evalContainer = this.shadow?.getElementById('eval-list-container');
        if (evalContainer) evalContainer.innerHTML = '<div class="loading-text">Memuat data akun baru...</div>';
        const forumContainer = this.shadow?.getElementById('forum-list-container');
        if (forumContainer) forumContainer.innerHTML = '<div class="loading-text">Memuat forum akun baru...</div>';
      }
      this._prefetchData();
    });

    // Sinkronisasi ketika berpindah rute SPA Next.js (/login -> dashboard, dll)
    window.addEventListener('mentari-route-change', () => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
        if (this.isOpen) this.closeModal();
        return;
      }
      try {
        window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
      } catch {}
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
    const modalEl = this.shadow.querySelector('.modal');
    if (overlay) overlay.classList.remove('open');
    if (modalEl && !modalEl.style.left) {
      modalEl.style.transform = '';
    }
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

      @keyframes tabFadeSlide {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes panelReveal {
        from { opacity: 0; transform: translateY(-4px); }
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
        z-index: 2147483642;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.24s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.28s cubic-bezier(0.16, 1, 0.3, 1), -webkit-backdrop-filter 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.24s ease;
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
        width: 760px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #141519;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.48);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f1f5f9;
        position: relative;
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease;
      }
      .overlay.open .modal {
        opacity: 1;
        transform: translateY(0) scale(1);
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
        color: #f59e0b;
        border-bottom-color: #f59e0b;
        background: rgba(245, 158, 11, 0.08);
      }
      .tab-content {
        flex-grow: 1;
        padding: 20px 22px;
        overflow-y: auto;
        display: none;
      }
      .tab-content.active {
        display: block;
        animation: tabFadeSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }

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
        animation: panelReveal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
      .forum-completed-box {
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 8px;
        padding: 10px 12px;
        margin-top: 8px;
        margin-bottom: 6px;
      }
      .forum-completed-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #10b981;
      }
      .forum-completed-title {
        font-size: 12px;
        font-weight: 600;
        color: #10b981;
      }
      .forum-completed-reason {
        font-size: 11px;
        color: #94a3b8;
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
      .badge-ready {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .badge-waiting-forum {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .badge-waiting-lecturer {
        color: #94a3b8;
        background: rgba(148, 163, 184, 0.15);
        border: 1px solid rgba(148, 163, 184, 0.25);
      }
      .badge-waiting-pre {
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.3);
      }
      .badge-waiting-post {
        color: #c084fc;
        background: rgba(192, 132, 252, 0.15);
        border: 1px solid rgba(192, 132, 252, 0.3);
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
      .eval-autopilot-btn {
        background: rgba(212, 175, 55, 0.18);
        border-color: rgba(212, 175, 55, 0.45);
        color: #fbbf24;
        font-weight: 700;
      }
      .eval-autopilot-btn:hover {
        background: rgba(212, 175, 55, 0.28);
        color: #fde68a;
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
        animation: panelReveal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
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
      .eval-btn-ready {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.4);
      }
      .eval-btn-ready:hover {
        background: rgba(16, 185, 129, 0.3);
        color: #34d399;
      }
      .eval-btn-goto-forum {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border-color: rgba(245, 158, 11, 0.4);
      }
      .eval-btn-goto-forum:hover {
        background: rgba(245, 158, 11, 0.3);
        color: #fbbf24;
      }
      .eval-btn-blocked {
        background: rgba(255, 255, 255, 0.04);
        color: #777;
        border-color: rgba(255, 255, 255, 0.08);
        cursor: not-allowed;
      }
      .eval-status-hint {
        font-size: 10px;
        font-weight: 500;
        opacity: 0.9;
      }
      .eval-status-hint.hint-forum { color: #f59e0b; }
      .eval-status-hint.hint-lecturer { color: #94a3b8; }
      .eval-status-hint.hint-pre { color: #38bdf8; }
      .eval-status-hint.hint-post { color: #c084fc; }
      .eval-status-hint.hint-ready { color: #10b981; }
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
        scrollbar-color: #cbd5e1 transparent;
      }
      .modal.theme-light ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
      }
      .modal.theme-light ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .modal.theme-light .header {
        background: #f8fafc;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .brand {
        color: #0f172a;
      }
      .modal.theme-light .brand-badge {
        background: #eff6ff;
        color: #1e3a8a;
        border: 1px solid #bfdbfe;
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
        color: #1e3a8a;
        border-bottom-color: #1e3a8a;
        background: #eff6ff;
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
        background: #eff6ff;
        border-color: #1e3a8a;
        color: #1e3a8a;
      }
      .modal.theme-light .filter-pill .pill-count {
        background: rgba(0, 0, 0, 0.08);
      }
      .modal.theme-light .filter-pill.active .pill-count {
        background: #dbeafe;
        color: #1e3a8a;
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
      .modal.theme-light .eval-autopilot-btn {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1e3a8a;
        font-weight: 700;
      }
      .modal.theme-light .eval-autopilot-btn:hover {
        background: #dbeafe;
        border-color: #1e3a8a;
        color: #1e3a8a;
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
      .modal.theme-light .forum-card {
        background: #ffffff;
        border-color: rgba(0, 0, 0, 0.08);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      }
      .modal.theme-light .forum-card:hover {
        background: #f8fafc;
        border-color: #93c5fd;
      }
      .modal.theme-light .forum-title {
        color: #1e293b !important;
      }
      .modal.theme-light .forum-course {
        color: #64748b !important;
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
      .modal.theme-light .forum-completed-box {
        background: rgba(16, 185, 129, 0.06);
        border: 1px solid rgba(16, 185, 129, 0.2);
      }
      .modal.theme-light .forum-completed-title {
        color: #059669;
      }
      .modal.theme-light .forum-completed-reason {
        color: #64748b;
      }
      .modal.theme-light .badge-ready {
        color: #059669;
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.25);
      }
      .modal.theme-light .badge-waiting-forum {
        color: #d97706;
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.25);
      }
      .modal.theme-light .badge-waiting-lecturer {
        color: #475569;
        background: rgba(100, 116, 139, 0.1);
        border-color: rgba(100, 116, 139, 0.2);
      }
      .modal.theme-light .badge-waiting-pre {
        color: #0284c7;
        background: rgba(56, 189, 248, 0.1);
        border-color: rgba(56, 189, 248, 0.25);
      }
      .modal.theme-light .badge-waiting-post {
        color: #7c3aed;
        background: rgba(192, 132, 252, 0.1);
        border-color: rgba(192, 132, 252, 0.25);
      }
      .modal.theme-light .eval-btn-ready {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
        border-color: rgba(16, 185, 129, 0.35);
      }
      .modal.theme-light .eval-btn-ready:hover {
        background: rgba(16, 185, 129, 0.2);
        color: #047857;
      }
      .modal.theme-light .eval-btn-goto-forum {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
        border-color: rgba(245, 158, 11, 0.35);
      }
      .modal.theme-light .eval-btn-goto-forum:hover {
        background: rgba(245, 158, 11, 0.2);
        color: #b45309;
      }
      .modal.theme-light .eval-btn-blocked {
        background: #f1f5f9;
        color: #94a3b8;
        border-color: #cbd5e1;
      }
      .modal.theme-light .eval-status-hint.hint-forum { color: #d97706; }
      .modal.theme-light .eval-status-hint.hint-lecturer { color: #64748b; }
      .modal.theme-light .eval-status-hint.hint-pre { color: #0284c7; }
      .modal.theme-light .eval-status-hint.hint-post { color: #7c3aed; }
      .modal.theme-light .eval-status-hint.hint-ready { color: #059669; }
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

      /* Collapsible Model & API Status Dropdown */
      .model-status-dropdown {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
      }
      .model-status-trigger {
        width: 100%;
        padding: 12px 14px;
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        text-align: left;
        color: #f1f5f9;
        transition: background-color 0.18s;
      }
      .model-status-trigger:hover { background: rgba(255, 255, 255, 0.04); }
      .model-status-trigger-left { display: flex; flex-direction: column; gap: 2px; }
      .model-status-title { font-size: 12.5px; font-weight: 600; color: #f8fafc; }
      .model-status-sub { font-size: 11px; color: #94a3b8; }
      .model-status-chevron { color: #94a3b8; transition: transform 0.2s ease; flex-shrink: 0; }
      .model-status-dropdown.open .model-status-chevron { transform: rotate(180deg); }

      .model-status-panel {
        display: none;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding: 12px 14px;
        flex-direction: column;
        gap: 10px;
      }
      .model-status-dropdown.open .model-status-panel {
        display: flex;
        animation: panelReveal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .model-status-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .model-status-note { font-size: 11px; color: #94a3b8; line-height: 1.4; }
      .model-status-note a { color: #f59e0b; font-weight: 600; text-decoration: none; }
      .model-status-note a:hover { text-decoration: underline; }
      .btn-sm { padding: 6px 10px; font-size: 11px; }

      .model-status-list { display: flex; flex-direction: column; gap: 6px; }
      .model-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .model-status-row.is-active { border-color: rgba(245, 158, 11, 0.4); }
      .ms-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .ms-name { font-size: 12px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 6px; }
      .ms-id { font-family: monospace; font-size: 10.5px; color: #94a3b8; }
      .ms-metrics { font-size: 11px; color: #94a3b8; }
      .ms-badge {
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .ms-badge.ready { background: rgba(16, 185, 129, 0.14); color: #34d399; }
      .ms-badge.limited { background: rgba(245, 158, 11, 0.16); color: #fbbf24; }
      .ms-badge.exhausted { background: rgba(239, 68, 68, 0.16); color: #f87171; }
      .ms-badge.unconfigured { background: rgba(148, 163, 184, 0.14); color: #94a3b8; }

      /* Light theme overrides for model status dropdown */
      .modal.theme-light .model-status-dropdown {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .model-status-trigger:hover { background: #f8fafc; }
      .modal.theme-light .model-status-title { color: #0f172a; }
      .modal.theme-light .model-status-sub,
      .modal.theme-light .model-status-chevron,
      .modal.theme-light .model-status-note,
      .modal.theme-light .ms-id,
      .modal.theme-light .ms-metrics { color: #64748b; }
      .modal.theme-light .model-status-note a { color: #1e3a8a; }
      .modal.theme-light .model-status-panel { border-top-color: #e2e8f0; background: #f8fafc; }
      .modal.theme-light .model-status-row {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .model-status-row.is-active { border-color: #1e3a8a; }
      .modal.theme-light .ms-name { color: #0f172a; }
      .modal.theme-light .ms-badge.ready { background: #ecfdf5; color: #059669; }
      .modal.theme-light .ms-badge.limited { background: #fffbeb; color: #b45309; }
      .modal.theme-light .ms-badge.exhausted { background: #fef2f2; color: #dc2626; }
      .modal.theme-light .ms-badge.unconfigured { background: #f1f5f9; color: #64748b; }

      /* Unified /antislop-ui Light Mode Navy Accents & Polish */
      .modal.theme-light {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 24px 56px rgba(15, 23, 42, 0.16);
        color: #0f172a;
      }
      .modal.theme-light .tabs-bar {
        background: #f8fafc;
        border-bottom-color: #e2e8f0;
      }
      .modal.theme-light .forum-search-input:focus,
      .modal.theme-light .eval-search-input:focus,
      .modal.theme-light .eval-type-select:focus,
      .modal.theme-light .select-field:focus {
        border-color: #1e3a8a;
        box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.14);
      }
      .modal.theme-light .forum-course-card:hover,
      .modal.theme-light .eval-course-card:hover {
        border-color: #cbd5e1;
      }
      .modal.theme-light .forum-accordion-chevron.open,
      .modal.theme-light .eval-accordion-chevron.open,
      .modal.theme-light .eval-stat-value,
      .modal.theme-light .eval-section-label {
        color: #1e3a8a;
      }
      .modal.theme-light .forum-btn-action,
      .modal.theme-light .eval-btn-action {
        background: #eff6ff;
        color: #1e3a8a;
        border-color: #bfdbfe;
      }
      .modal.theme-light .forum-btn-action:hover,
      .modal.theme-light .eval-btn-action:hover {
        background: #1e3a8a;
        color: #ffffff;
        border-color: #1e3a8a;
      }
      .modal.theme-light .btn-primary,
      .modal.theme-light .btn-open-forum {
        background: #1e3a8a;
        color: #ffffff;
        border-color: #1e3a8a;
      }
      .modal.theme-light .btn-primary:hover,
      .modal.theme-light .btn-open-forum:hover {
        background: #1e40af;
      }
      .modal.theme-light .forum-search-clear:hover { color: #0f172a; }
      .modal.theme-light .eval-summary {
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      /* Keyboard focus ring and compact tab spacing */
      .tab-btn:focus-visible,
      .btn-config:focus-visible,
      .btn-open-forum:focus-visible,
      .course-acc-header:focus-visible,
      .meeting-acc-header:focus-visible,
      .mat-action-btn:focus-visible,
      .student-courses-toggle:focus-visible,
      .close-btn:focus-visible,
      .theme-toggle-btn:focus-visible,
      .eval-toggle-all-btn:focus-visible,
      .forum-toggle-all-btn:focus-visible {
        outline: 2px solid #f59e0b;
        outline-offset: 2px;
      }
      .modal.theme-light .tab-btn:focus-visible,
      .modal.theme-light .btn-config:focus-visible,
      .modal.theme-light .btn-open-forum:focus-visible,
      .modal.theme-light .course-acc-header:focus-visible,
      .modal.theme-light .meeting-acc-header:focus-visible,
      .modal.theme-light .mat-action-btn:focus-visible,
      .modal.theme-light .student-courses-toggle:focus-visible {
        outline-color: #1e3a8a;
      }
      .tab-btn { padding: 12px 13px; }

      /* Courses tab accordion, progress bar, and materials */
      .course-acc-card {
        background: #1a1c23;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .course-acc-header {
        width: 100%;
        background: transparent;
        border: none;
        padding: 14px 16px;
        text-align: left;
        color: #f1f5f9;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: background-color 0.18s;
      }
      .course-acc-header:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      .course-acc-top {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .course-acc-title-wrap {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .course-acc-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #f1f5f9;
        line-height: 1.35;
      }
      .course-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .course-chip {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .course-chip-sks {
        background: #172536;
        color: #93c5fd;
        border: 1px solid rgba(147, 197, 253, 0.25);
      }
      .course-chip-day {
        background: #142921;
        color: #6ee7b7;
        border: 1px solid rgba(110, 231, 183, 0.25);
      }
      .course-chip-class {
        background: #292114;
        color: #fcd34d;
        border: 1px solid rgba(252, 211, 77, 0.25);
      }
      .course-code-sub {
        font-size: 11px;
        color: #94a3b8;
      }
      .course-progress-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        flex-shrink: 0;
      }
      .course-progress-pct {
        font-size: 13px;
        font-weight: 800;
        color: #6ee7b7;
        font-variant-numeric: tabular-nums;
      }
      .course-progress-label {
        font-size: 11px;
        color: #94a3b8;
        font-variant-numeric: tabular-nums;
      }
      .course-progress-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .course-progress-track {
        flex: 1;
        height: 5px;
        border-radius: 99px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }
      .course-progress-fill {
        height: 100%;
        border-radius: 99px;
        background: #10b981;
        transition: width 0.25s ease;
      }
      .course-acc-chevron {
        color: #94a3b8;
        transition: transform 0.2s ease;
        flex-shrink: 0;
      }
      .course-acc-chevron.open {
        transform: rotate(180deg);
        color: #f59e0b;
      }
      .course-acc-body {
        display: none;
        padding: 12px 14px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #141519;
      }
      .course-acc-body.open {
        display: block;
      }
      .course-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .course-top-stats {
        font-size: 11.5px;
        color: #94a3b8;
      }
      .meeting-card {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 9px;
        margin-bottom: 8px;
        background: #1e2129;
        overflow: hidden;
      }
      .meeting-acc-header {
        width: 100%;
        background: transparent;
        border: none;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #f1f5f9;
        cursor: pointer;
        text-align: left;
      }
      .meeting-acc-header:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .meeting-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .meeting-title {
        font-size: 12.5px;
        font-weight: 600;
        color: #f1f5f9;
      }
      .meeting-meta-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .meeting-pill {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .meeting-pill.has-materi {
        background: #142921;
        color: #6ee7b7;
      }
      .meeting-pill.is-empty {
        background: #292114;
        color: #fcd34d;
      }
      .meeting-acc-body {
        display: none;
        padding: 10px 12px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #141519;
      }
      .meeting-acc-body.open {
        display: block;
      }
      .meeting-quick-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .meeting-quick-link {
        font-size: 11.5px;
        font-weight: 600;
        color: #fcd34d;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .meeting-quick-link:hover {
        text-decoration: underline;
      }
      .material-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 10px;
        border-radius: 8px;
        background: #1e2129;
        border: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 6px;
      }
      .material-row:last-child { margin-bottom: 0; }
      .material-info {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        flex: 1;
      }
      .material-icon {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: #172536;
        color: #93c5fd;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .material-text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .material-title {
        font-size: 12px;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .material-type {
        font-size: 11px;
        color: #94a3b8;
      }
      .material-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .mat-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 10px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .mat-btn-download {
        background: #142921;
        color: #6ee7b7;
        border-color: rgba(110, 231, 183, 0.3);
      }
      .mat-btn-download:hover {
        background: #10b981;
        color: #0b1410;
      }
      .mat-btn-link {
        background: #292114;
        color: #fcd34d;
        border-color: rgba(252, 211, 77, 0.3);
      }
      .mat-btn-link:hover {
        background: #f59e0b;
        color: #141519;
      }
      .meeting-empty-notice {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #292114;
        border: 1px solid rgba(252, 211, 77, 0.3);
        color: #fcd34d;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.45;
      }

      /* Tab Mahasiswa */
      .student-toolbar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }
      .student-summary-line {
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .student-card {
        background: #1a1c23;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        margin-bottom: 8px;
        overflow: hidden;
      }
      .student-row-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
      }
      .student-identity {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex: 1;
      }
      .student-avatar {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: #172536;
        color: #93c5fd;
        border: 1px solid rgba(147, 197, 253, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
      }
      .student-info {
        min-width: 0;
        flex: 1;
      }
      .student-name {
        font-size: 12.5px;
        font-weight: 700;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .student-meta {
        font-size: 11px;
        color: #94a3b8;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 2px;
        font-variant-numeric: tabular-nums;
      }
      .student-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .student-courses-toggle {
        background: #1e2129;
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 7px;
        padding: 5px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .student-courses-toggle:hover {
        border-color: #f59e0b;
        color: #fcd34d;
      }
      .student-rank {
        font-size: 11px;
        color: #94a3b8;
        min-width: 24px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .student-courses-panel {
        display: none;
        padding: 10px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #141519;
      }
      .student-courses-panel.open {
        display: block;
      }
      .student-courses-heading {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .student-course-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .student-course-pill {
        background: #1e2129;
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
      }
      .eval-quiz-score {
        font-weight: 600;
        color: #6ee7b7;
        font-variant-numeric: tabular-nums;
      }

      /* Light theme overrides for Mata Kuliah & Mahasiswa */
      .modal.theme-light .course-acc-card,
      .modal.theme-light .student-card {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      }
      .modal.theme-light .course-acc-header:hover {
        background: #f8fafc;
      }
      .modal.theme-light .course-acc-title,
      .modal.theme-light .meeting-title,
      .modal.theme-light .material-title,
      .modal.theme-light .student-name {
        color: #0f172a;
      }
      .modal.theme-light .course-code-sub,
      .modal.theme-light .course-progress-label,
      .modal.theme-light .course-top-stats,
      .modal.theme-light .material-type,
      .modal.theme-light .student-summary-line,
      .modal.theme-light .student-meta,
      .modal.theme-light .student-rank,
      .modal.theme-light .student-courses-heading,
      .modal.theme-light .course-acc-chevron {
        color: #475569;
      }
      .modal.theme-light .course-acc-chevron.open,
      .modal.theme-light .meeting-quick-link {
        color: #1e3a8a;
      }
      .modal.theme-light .course-progress-pct,
      .modal.theme-light .eval-quiz-score {
        color: #047857;
      }
      .modal.theme-light .course-chip-sks {
        background: #eff6ff;
        color: #1e3a8a;
        border-color: #bfdbfe;
      }
      .modal.theme-light .course-chip-day {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .modal.theme-light .course-chip-class {
        background: #fffbeb;
        color: #b45309;
        border-color: #fde68a;
      }
      .modal.theme-light .course-progress-track {
        background: #e2e8f0;
      }
      .modal.theme-light .course-acc-body,
      .modal.theme-light .meeting-acc-body,
      .modal.theme-light .student-courses-panel {
        background: #f8fafc;
        border-top-color: #e2e8f0;
      }
      .modal.theme-light .meeting-card,
      .modal.theme-light .material-row {
        background: #ffffff;
        border-color: #e2e8f0;
      }
      .modal.theme-light .meeting-acc-header {
        color: #0f172a;
      }
      .modal.theme-light .meeting-acc-header:hover {
        background: #f1f5f9;
      }
      .modal.theme-light .meeting-pill.has-materi,
      .modal.theme-light .mat-btn-download {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .modal.theme-light .mat-btn-download:hover {
        background: #047857;
        color: #ffffff;
      }
      .modal.theme-light .meeting-pill.is-empty,
      .modal.theme-light .mat-btn-link,
      .modal.theme-light .meeting-empty-notice {
        background: #fffbeb;
        color: #b45309;
        border-color: #fde68a;
      }
      .modal.theme-light .mat-btn-link:hover {
        background: #b45309;
        color: #ffffff;
      }
      .modal.theme-light .material-icon,
      .modal.theme-light .student-avatar {
        background: #eff6ff;
        color: #1e3a8a;
        border-color: #bfdbfe;
      }
      .modal.theme-light .student-courses-toggle,
      .modal.theme-light .student-course-pill {
        background: #f1f5f9;
        color: #0f172a;
        border-color: #cbd5e1;
      }
      .modal.theme-light .student-courses-toggle:hover {
        background: #eff6ff;
        color: #1e3a8a;
        border-color: #1e3a8a;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="header" id="dashboard-modal-header">
          <div class="brand">
            <span style="color:#ff7b00;display:inline-flex;align-items:center;">${getBrandSvgMarkup(20)}</span>
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

        <div class="tabs-bar" role="tablist">
          <button class="tab-btn active" type="button" role="tab" aria-selected="true" data-tab="tab-forums">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Forum Aktif
          </button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="tab-evaluations">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Kuis & Evaluasi
          </button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="tab-courses">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Mata Kuliah
          </button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="tab-students">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Mahasiswa
          </button>
          <button class="tab-btn" type="button" role="tab" aria-selected="false" data-tab="tab-settings">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
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
          <div id="course-controls-bar"></div>
          <div id="course-list-container">
            <div class="loading-text">Memuat daftar mata kuliah...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-students">
          <div id="student-controls-bar"></div>
          <div id="student-list-container">
            <div class="loading-text">Memuat daftar mahasiswa sekelas...</div>
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
                <h4>Thinking Level AI</h4>
                <p>Atur kecepatan vs kedalaman penalaran sesuai level yang didukung model aktif.</p>
              </div>
              <select id="select-thinking-level" class="select-field"></select>
            </div>

            <div class="model-status-dropdown" id="model-status-dropdown">
              <button class="model-status-trigger" id="btn-toggle-model-status" type="button">
                <div class="model-status-trigger-left">
                  <span class="model-status-title">Status API & Pemakaian Model Tersedia</span>
                  <span class="model-status-sub" id="model-status-summary">Klik untuk lihat detail status 6 model Free Tier</span>
                </div>
                <svg class="model-status-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="model-status-panel" id="model-status-panel">
                <div class="model-status-toolbar">
                  <span class="model-status-note">Pemakaian lokal dicatat dari ekstensi (reset ~15:00 WIB). <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noopener noreferrer">Cek Kuota AI Studio</a></span>
                  <button class="btn-config btn-sm" id="btn-check-models-health" type="button">Cek Koneksi API</button>
                </div>
                <div class="model-status-list" id="model-status-list"></div>
              </div>
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

            <div class="settings-item">
              <div class="settings-info">
                <h4>Fallback Otomatis Model Cadangan</h4>
                <p>Matikan agar kuota model lain tidak ikut terpakai saat model pilihan sibuk atau timeout.</p>
              </div>
              <input type="checkbox" id="toggle-auto-fallback" style="cursor:pointer; width:18px; height:18px;">
            </div>
          </div>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    // Isolasi fokus & event keyboard agar tidak terganggu MUI FocusTrap di halaman LMS
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

    const close = () => this.closeModal();
    this.shadow.getElementById('btn-close').addEventListener('click', close);
    this.host.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        close();
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
      const link = e.target.closest('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && !link.hasAttribute('download') && link.target !== '_blank') {
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
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetId = btn.getAttribute('data-tab');
        this.shadow.getElementById(targetId)?.classList.add('active');
        if (targetId === 'tab-courses') {
          this._renderCourses(this.courses);
        } else if (targetId === 'tab-students') {
          this._renderStudents(this.students);
        } else if (targetId === 'tab-settings') {
          this._renderModelStatusPanel();
        }
      });
    });

    // Model status dropdown toggle & health check
    const statusDropdown = this.shadow.getElementById('model-status-dropdown');
    const btnToggleModelStatus = this.shadow.getElementById('btn-toggle-model-status');
    const btnCheckHealth = this.shadow.getElementById('btn-check-models-health');
    if (btnToggleModelStatus && statusDropdown) {
      btnToggleModelStatus.addEventListener('click', () => {
        const opening = !statusDropdown.classList.contains('open');
        statusDropdown.classList.toggle('open', opening);
        if (opening) this._renderModelStatusPanel();
      });
    }
    if (btnCheckHealth) {
      btnCheckHealth.addEventListener('click', () => {
        btnCheckHealth.disabled = true;
        btnCheckHealth.textContent = 'Memeriksa...';
        chrome.runtime.sendMessage({ action: 'checkModelsHealth' }, (res) => {
          btnCheckHealth.disabled = false;
          btnCheckHealth.textContent = 'Cek Koneksi API';
          if (res?.success) {
            Toast.success('Status endpoint model berhasil disinkronkan dari Google API.');
            this._renderModelStatusPanel();
          } else {
            Toast.warning(res?.error || 'Gagal memeriksa koneksi Google API.');
          }
        });
      });
    }

    // Model & Thinking Level selection on the fly
    const selectModel = this.shadow.getElementById('select-active-model');
    const selectThinking = this.shadow.getElementById('select-thinking-level');
    const validModelIds = ALL_MODELS.map(m => m.id);

    const renderThinkingOptions = (modelId, preferredLevel = null) => {
      if (!selectThinking) return 'low';
      const supported = getSupportedThinkingLevels(modelId);
      const resolved = resolveThinkingLevelForModel(modelId, preferredLevel);
      selectThinking.innerHTML = supported
        .map(lvl => `<option value="${lvl}">${THINKING_LEVEL_META[lvl]?.label || lvl}</option>`)
        .join('');
      selectThinking.value = resolved;
      return resolved;
    };

    Storage.get(['gemini_model', 'gemini_thinking_level']).then(({ gemini_model, gemini_thinking_level }) => {
      const resolvedModel = (gemini_model && validModelIds.includes(gemini_model))
        ? gemini_model
        : DEFAULT_FREE_MODEL;
      selectModel.value = resolvedModel;
      const resolvedLevel = renderThinkingOptions(resolvedModel, gemini_thinking_level);
      if (gemini_model !== resolvedModel || gemini_thinking_level !== resolvedLevel) {
        Storage.set({ gemini_model: resolvedModel, gemini_thinking_level: resolvedLevel });
      }
    });

    selectModel.addEventListener('change', () => {
      const chosen = selectModel.value;
      if (chosen && validModelIds.includes(chosen)) {
        const nextLevel = renderThinkingOptions(chosen, selectThinking?.value);
        Storage.set({ gemini_model: chosen, gemini_thinking_level: nextLevel });
        Toast.success(`Model Gemini diubah ke: ${selectModel.options[selectModel.selectedIndex].text} (${THINKING_LEVEL_META[nextLevel]?.shortLabel || nextLevel})`);
      }
    });

    if (selectThinking) {
      selectThinking.addEventListener('change', () => {
        const modelId = selectModel?.value || DEFAULT_FREE_MODEL;
        const resolved = resolveThinkingLevelForModel(modelId, selectThinking.value);
        Storage.set({ gemini_thinking_level: resolved });
        Toast.success(`Thinking Level diubah ke: ${THINKING_LEVEL_META[resolved]?.label || resolved}`);
      });
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.gemini_model || changes.gemini_thinking_level)) {
          const nextModel = (changes.gemini_model?.newValue && validModelIds.includes(changes.gemini_model.newValue))
            ? changes.gemini_model.newValue
            : selectModel.value;
          if (selectModel.value !== nextModel) {
            selectModel.value = nextModel;
            this._renderModelStatusPanel();
          }
          const nextLevel = changes.gemini_thinking_level?.newValue ?? selectThinking?.value;
          renderThinkingOptions(nextModel, nextLevel);
        }
        if (area === 'local' && changes.mentari_model_telemetry && this.isOpen) {
          this._renderModelStatusPanel();
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

    const toggleAutoFinish = this.shadow.getElementById('toggle-auto-finish');
    Storage.get('mentari_auto_finish_quiz').then(({ mentari_auto_finish_quiz }) => {
      toggleAutoFinish.checked = !!mentari_auto_finish_quiz;
    });
    toggleAutoFinish.addEventListener('change', () => {
      Storage.set({ mentari_auto_finish_quiz: toggleAutoFinish.checked });
      Toast.info(`Auto finish kuis: ${toggleAutoFinish.checked ? 'Aktif' : 'Nonaktif'}`);
    });

    const toggleAutoFallback = this.shadow.getElementById('toggle-auto-fallback');
    if (toggleAutoFallback) {
      Storage.get('gemini_auto_fallback').then(({ gemini_auto_fallback }) => {
        toggleAutoFallback.checked = gemini_auto_fallback === true;
      });
      toggleAutoFallback.addEventListener('change', () => {
        Storage.set({ gemini_auto_fallback: toggleAutoFallback.checked });
        Toast.info(`Fallback model cadangan: ${toggleAutoFallback.checked ? 'Aktif' : 'Nonaktif (Ketat sesuai model pilihan)'}`);
      });
    }

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
    this._renderModelStatusPanel();

    // Draggable Modal
    const modalEl = this.shadow.querySelector('.modal');
    const headerEl = this.shadow.getElementById('dashboard-modal-header');
    if (modalEl && headerEl) {
      this._makeElementDraggable(modalEl, headerEl);
    }
  }

  _renderModelStatusPanel() {
    if (!this.shadow) return;
    const summaryEl = this.shadow.getElementById('model-status-summary');
    const listEl = this.shadow.getElementById('model-status-list');
    if (!listEl) return;

    chrome.runtime.sendMessage({ action: 'getModelTelemetry' }, (res) => {
      if (!res) return;
      const { models = ACTIVE_FREE_MODELS, activeModel = DEFAULT_FREE_MODEL, hasKey = false, telemetry } = res;
      const modelStats = telemetry?.models || {};
      const activeStats = modelStats[activeModel];

      if (summaryEl) {
        if (!hasKey) {
          summaryEl.textContent = 'API Key belum dipasang — buka Konfigurasi API Key dulu';
        } else if (activeStats?.status === 'daily_exhausted') {
          summaryEl.textContent = `Model aktif (${activeModel}) kena limit harian — klik untuk detail`;
        } else if (activeStats?.status === 'rate_limited') {
          const secLeft = Math.max(1, Math.ceil((activeStats.cooldownUntil - Date.now()) / 1000));
          summaryEl.textContent = `Model aktif cooldown ${secLeft}s — klik untuk detail`;
        } else {
          const todayReqs = Object.values(modelStats).reduce((s, m) => s + (m.requestsToday || 0), 0);
          summaryEl.textContent = `6 Model Free Tier aktif • ${todayReqs} request lokal hari ini`;
        }
      }

      listEl.innerHTML = '';
      models.forEach((m) => {
        const st = modelStats[m.id] || {};
        const isActive = m.id === activeModel;
        const rpmNow = Array.isArray(st.recentTimestamps) ? st.recentTimestamps.length : 0;
        const reqToday = st.requestsToday || 0;
        const tokToday = st.tokensToday || 0;

        let badgeClass = 'ready';
        let badgeText = 'Siap / Aktif';

        if (!hasKey) {
          badgeClass = 'unconfigured';
          badgeText = 'Butuh API Key';
        } else if (st.status === 'daily_exhausted') {
          badgeClass = 'exhausted';
          badgeText = 'Limit Harian (429)';
        } else if (st.status === 'rate_limited' && st.cooldownUntil > Date.now()) {
          const secLeft = Math.max(1, Math.ceil((st.cooldownUntil - Date.now()) / 1000));
          badgeClass = 'limited';
          badgeText = `Cooldown ${secLeft}s`;
        } else if (st.status === 'unavailable') {
          badgeClass = 'exhausted';
          badgeText = 'Tidak Tersedia (404)';
        } else if (st.status === 'error') {
          badgeClass = 'limited';
          badgeText = 'Gangguan API';
        }

        const row = document.createElement('div');
        row.className = `model-status-row ${isActive ? 'is-active' : ''}`;
        row.innerHTML = `
          <div class="ms-left">
            <div class="ms-name">
              <span>${m.name}</span>
              ${isActive ? '<span class="ms-id">(Aktif)</span>' : ''}
            </div>
            <div class="ms-metrics">${reqToday} req hari ini · ${rpmNow} RPM · ${tokToday.toLocaleString('id-ID')} token</div>
          </div>
          <span class="ms-badge ${badgeClass}" title="${st.lastError || ''}">${badgeText}</span>
        `;
        listEl.appendChild(row);
      });
    });
  }

  _applyTheme(theme) {
    this.currentTheme = theme === 'light' ? 'light' : 'dark';
    if (!this.shadow) return;
    const overlayEl = this.shadow.querySelector('.overlay');
    const modalEl = this.shadow.querySelector('.modal');
    if (overlayEl) {
      overlayEl.classList.toggle('theme-light', this.currentTheme === 'light');
    }
    if (modalEl) {
      modalEl.classList.toggle('theme-light', this.currentTheme === 'light');
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
    await ThemeHelper.setManualTheme(this.currentTheme);
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

      const cachedCourses = userCache?.courses || (userId === 'default' ? (stored.mentari_cached_courses || []) : []);
      const cachedForums = userCache?.forums || (userId === 'default' ? (stored.mentari_cached_forums || []) : []);
      const cachedEvals = userCache?.evaluations || [];
      this.courseDetails = (userCache?.courseDetails && typeof userCache.courseDetails === 'object') ? userCache.courseDetails : {};
      this.hasSyncedCourseDetails = Object.keys(this.courseDetails).length > 0;
      this.students = Array.isArray(userCache?.students) ? userCache.students : [];
      this.courseForumsMeta = userCache?.courseForumsMeta || {};
      this._lastSyncedAt = userCache?.lastSyncedAt || userCache?.updatedAt || null;

      if (cachedCourses.length > 0) {
        this.courses = cachedCourses;
        this._renderCourses(cachedCourses);
      }
      this._renderStudents(this.students);
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

  _getMaterialSvgIcon(template) {
    switch (String(template || '').toUpperCase()) {
      case 'POWER_POINT':
        return '<svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
      case 'VIDEO_AJAR':
        return '<svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      case 'BUKU_ISBN':
        return '<svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
      default:
        return '<svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }
  }

  _renderCourseControls() {
    const controlsBar = this.shadow?.getElementById('course-controls-bar');
    if (!controlsBar) return;

    if (!controlsBar.querySelector('.forum-controls')) {
      controlsBar.innerHTML = `
        <div class="forum-controls">
          <div class="forum-search-wrap">
            <svg class="forum-search-icon" width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="forum-search-input" id="course-search-input" placeholder="Cari mata kuliah, hari, pertemuan, atau materi..." value="${escapeHtml(this.courseSearchQuery)}">
            <button class="forum-search-clear" id="course-search-clear" type="button" aria-label="Hapus pencarian">&times;</button>
          </div>
          <button class="forum-toggle-all-btn" id="course-toggle-all-btn" type="button">
            <svg id="course-toggle-all-icon" width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
            <span id="course-toggle-all-text">Buka Semua</span>
          </button>
        </div>
      `;

      const searchInput = controlsBar.querySelector('#course-search-input');
      const clearBtn = controlsBar.querySelector('#course-search-clear');
      const toggleBtn = controlsBar.querySelector('#course-toggle-all-btn');

      if (this.courseSearchQuery) clearBtn.style.display = 'block';

      searchInput.addEventListener('input', (e) => {
        this.courseSearchQuery = e.target.value.trim().toLowerCase();
        clearBtn.style.display = this.courseSearchQuery ? 'block' : 'none';
        this._renderCourses(this.courses, false);
      });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.courseSearchQuery = '';
        this.expandedCourseCards.clear();
        clearBtn.style.display = 'none';
        searchInput.focus();
        this._renderCourses(this.courses, false);
      });

      toggleBtn.addEventListener('click', () => {
        this._handleToggleAllCourseCards();
      });
    }

    this._updateCourseToggleAllBtn();
  }

  _handleToggleAllCourseCards() {
    if (!this._visibleCourseTabCodes || this._visibleCourseTabCodes.length === 0) return;
    const allExpanded = this._visibleCourseTabCodes.every(code => this.expandedCourseCards.has(code));
    if (allExpanded) {
      this._visibleCourseTabCodes.forEach(code => this.expandedCourseCards.delete(code));
    } else {
      this._visibleCourseTabCodes.forEach(code => this.expandedCourseCards.add(code));
    }
    this._renderCourses(this.courses, false);
  }

  _updateCourseToggleAllBtn() {
    const toggleText = this.shadow?.getElementById('course-toggle-all-text');
    const toggleIcon = this.shadow?.getElementById('course-toggle-all-icon');
    if (!toggleText || !this._visibleCourseTabCodes) return;
    const hasCourses = this._visibleCourseTabCodes.length > 0;
    const allExpanded = hasCourses && this._visibleCourseTabCodes.every(code => this.expandedCourseCards.has(code));
    toggleText.textContent = allExpanded ? 'Tutup Semua' : 'Buka Semua';
    if (toggleIcon) {
      toggleIcon.innerHTML = allExpanded
        ? '<path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/>'
        : '<path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>';
    }
  }

  _renderCourses(list, updateControls = true) {
    const courseContainer = this.shadow?.getElementById('course-list-container');
    if (!courseContainer) return;

    if (updateControls) {
      this._renderCourseControls();
    }

    if (!list || list.length === 0) {
      this._visibleCourseTabCodes = [];
      this._updateCourseToggleAllBtn();
      courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif pada akun ini.</div>';
      return;
    }

    const q = (this.courseSearchQuery || '').toLowerCase();
    const filteredCourses = [];
    for (const c of list) {
      const meta = parseCourseMeta(c);
      const detail = this.courseDetails[meta.courseCode] || null;
      if (q) {
        const metaMatch = [meta.title, meta.courseCode, meta.hari, meta.kelas]
          .some(v => v && v.toLowerCase().includes(q));
        const sectionMatch = detail?.sections?.some(sec =>
          sec.sectionName.toLowerCase().includes(q) ||
          sec.materials.some(m => m.title.toLowerCase().includes(q) || m.typeLabel.toLowerCase().includes(q))
        );
        if (!metaMatch && !sectionMatch) continue;
      }
      filteredCourses.push({ raw: c, meta, detail });
    }

    this._visibleCourseTabCodes = filteredCourses.map(item => item.meta.courseCode);
    if (q) {
      filteredCourses.forEach(item => this.expandedCourseCards.add(item.meta.courseCode));
    }
    this._updateCourseToggleAllBtn();

    if (filteredCourses.length === 0) {
      courseContainer.innerHTML = `
        <div class="empty-state">
          <p>Tidak ada mata kuliah atau materi yang cocok dengan kata kunci "${escapeHtml(this.courseSearchQuery)}".</p>
          <button class="btn-config" id="btn-reset-course-search" type="button" style="margin-top:12px;">Reset Pencarian</button>
        </div>
      `;
      courseContainer.querySelector('#btn-reset-course-search')?.addEventListener('click', () => {
        this.courseSearchQuery = '';
        const input = this.shadow?.getElementById('course-search-input');
        if (input) input.value = '';
        const clear = this.shadow?.getElementById('course-search-clear');
        if (clear) clear.style.display = 'none';
        this._renderCourses(this.courses, false);
      });
      return;
    }

    courseContainer.innerHTML = '';

    filteredCourses.forEach(({ meta, detail }) => {
      const { courseCode, title, sks, hari, kelas } = meta;
      const isExpanded = this.expandedCourseCards.has(courseCode);
      const progress = detail?.progress || { completedMeetings: 0, totalMeetings: 0, percent: 0 };
      const sections = detail?.sections || [];
      const totalMaterials = sections.reduce((sum, s) => sum + s.materials.length, 0);

      const card = document.createElement('div');
      card.className = 'course-acc-card';

      const chipsHtml = [
        sks ? `<span class="course-chip course-chip-sks">${escapeHtml(sks)} SKS</span>` : '',
        hari ? `<span class="course-chip course-chip-day">${escapeHtml(hari)}</span>` : '',
        kelas ? `<span class="course-chip course-chip-class">Kelas ${escapeHtml(kelas)}</span>` : ''
      ].filter(Boolean).join('');

      const progressRightHtml = progress.totalMeetings > 0
        ? `
          <div class="course-progress-meta">
            <span class="course-progress-pct">${progress.percent}%</span>
            <span class="course-progress-label">Pertemuan ${progress.completedMeetings} / ${progress.totalMeetings}</span>
          </div>
        `
        : '';

      const headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'course-acc-header';
      headerBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      headerBtn.innerHTML = `
        <div class="course-acc-top">
          <div class="course-acc-title-wrap">
            <div class="course-acc-title">${escapeHtml(title)}</div>
            ${chipsHtml ? `<div class="course-chips">${chipsHtml}</div>` : ''}
            <div class="course-code-sub">Kode Course: ${escapeHtml(courseCode)}</div>
          </div>
          ${progressRightHtml}
        </div>
        <div class="course-progress-row">
          <div class="course-progress-track">
            <div class="course-progress-fill" style="width:${progress.percent}%;"></div>
          </div>
          <svg class="course-acc-chevron ${isExpanded ? 'open' : ''}" width="16" height="16" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      `;

      const bodyDiv = document.createElement('div');
      bodyDiv.className = `course-acc-body ${isExpanded ? 'open' : ''}`;

      const topBar = document.createElement('div');
      topBar.className = 'course-top-bar';
      topBar.innerHTML = `
        <span class="course-top-stats">${sections.length} Pertemuan &bull; ${totalMaterials} Materi Tersedia</span>
        <a class="btn-open-forum" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}">Buka Kelas</a>
      `;
      bodyDiv.appendChild(topBar);

      if (!detail && !this.hasSyncedCourseDetails) {
        const loadingBox = document.createElement('div');
        loadingBox.className = 'loading-text';
        loadingBox.style.padding = '14px';
        loadingBox.textContent = 'Memuat rincian pertemuan dan materi...';
        bodyDiv.appendChild(loadingBox);
      } else if (sections.length === 0) {
        const emptySec = document.createElement('div');
        emptySec.className = 'meeting-empty-notice';
        emptySec.innerHTML = `
          <svg width="15" height="15" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Belum ada pertemuan yang dibuat dosen untuk mata kuliah ini.</span>
        `;
        bodyDiv.appendChild(emptySec);
      } else {
        const activeSectionCode = this.expandedCourseSections.get(courseCode) || '';
        sections.forEach((sec) => {
          const secMatchesSearch = Boolean(q) && (
            sec.sectionName.toLowerCase().includes(q) ||
            sec.materials.some(m => m.title.toLowerCase().includes(q) || m.typeLabel.toLowerCase().includes(q))
          );
          const secExpanded = activeSectionCode === sec.sectionCode || secMatchesSearch;

          const secCard = document.createElement('div');
          secCard.className = 'meeting-card';

          const secBtn = document.createElement('button');
          secBtn.type = 'button';
          secBtn.className = 'meeting-acc-header';
          secBtn.setAttribute('aria-expanded', secExpanded ? 'true' : 'false');
          secBtn.innerHTML = `
            <span class="meeting-title-group">
              <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span class="meeting-title">${escapeHtml(sec.sectionName)}</span>
            </span>
            <span class="meeting-meta-group">
              <span class="meeting-pill ${sec.materials.length > 0 ? 'has-materi' : 'is-empty'}">
                ${sec.materials.length > 0 ? `${sec.materials.length} Materi` : 'Kosong'}
              </span>
              <svg class="course-acc-chevron ${secExpanded ? 'open' : ''}" width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          `;

          const secBody = document.createElement('div');
          secBody.className = `meeting-acc-body ${secExpanded ? 'open' : ''}`;

          const sectionUrl = `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}?accord_pertemuan=${encodeURIComponent(sec.sectionCode)}`;
          const quickRow = document.createElement('div');
          quickRow.className = 'meeting-quick-row';
          quickRow.innerHTML = `
            <a class="meeting-quick-link" target="_self" href="${sectionUrl}">
              <svg width="13" height="13" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Buka Pertemuan di Mentari
            </a>
          `;
          secBody.appendChild(quickRow);

          if (sec.materials.length > 0) {
            sec.materials.forEach((mat) => {
              const matRow = document.createElement('div');
              matRow.className = 'material-row';

              const actionsHtml = [
                mat.downloadUrl
                  ? `<a class="mat-action-btn mat-btn-download" href="${escapeHtml(mat.downloadUrl)}" target="_blank" rel="noopener noreferrer" download>Unduh</a>`
                  : '',
                mat.externalUrl
                  ? `<a class="mat-action-btn mat-btn-link" href="${escapeHtml(mat.externalUrl)}" target="_blank" rel="noopener noreferrer">Buka Link</a>`
                  : ''
              ].filter(Boolean).join('');

              matRow.innerHTML = `
                <div class="material-info">
                  <div class="material-icon">${this._getMaterialSvgIcon(mat.template)}</div>
                  <div class="material-text">
                    <div class="material-title" title="${escapeHtml(mat.title)}">${escapeHtml(mat.title)}</div>
                    <div class="material-type">${escapeHtml(mat.typeLabel)}</div>
                  </div>
                </div>
                <div class="material-actions">${actionsHtml}</div>
              `;
              secBody.appendChild(matRow);
            });
          } else {
            const emptyNotice = document.createElement('div');
            emptyNotice.className = 'meeting-empty-notice';
            emptyNotice.innerHTML = `
              <svg width="15" height="15" aria-hidden="true" style="flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Pertemuan ini masih kosong dan belum memiliki materi dari dosen.</span>
            `;
            secBody.appendChild(emptyNotice);
          }

          secBtn.addEventListener('click', () => {
            const opening = !secBody.classList.contains('open');
            bodyDiv.querySelectorAll('.meeting-card').forEach((other) => {
              other.querySelector('.meeting-acc-body')?.classList.remove('open');
              other.querySelector('.meeting-acc-header')?.setAttribute('aria-expanded', 'false');
              other.querySelector('.meeting-acc-header .course-acc-chevron')?.classList.remove('open');
            });
            if (opening) {
              secBody.classList.add('open');
              secBtn.setAttribute('aria-expanded', 'true');
              secBtn.querySelector('.course-acc-chevron')?.classList.add('open');
              this.expandedCourseSections.set(courseCode, sec.sectionCode);
            } else {
              this.expandedCourseSections.delete(courseCode);
            }
          });

          secCard.appendChild(secBtn);
          secCard.appendChild(secBody);
          bodyDiv.appendChild(secCard);
        });
      }

      headerBtn.addEventListener('click', () => {
        const opening = !bodyDiv.classList.contains('open');
        bodyDiv.classList.toggle('open', opening);
        headerBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        headerBtn.querySelector('.course-acc-chevron')?.classList.toggle('open', opening);
        if (opening) this.expandedCourseCards.add(courseCode);
        else this.expandedCourseCards.delete(courseCode);
        this._updateCourseToggleAllBtn();
      });

      card.appendChild(headerBtn);
      card.appendChild(bodyDiv);
      courseContainer.appendChild(card);
    });
  }

  _renderStudentControls() {
    const controlsBar = this.shadow?.getElementById('student-controls-bar');
    if (!controlsBar) return;

    const nonPkkmbCourses = (this.courses || [])
      .map(c => parseCourseMeta(c))
      .filter(m => m.courseCode && !m.courseCode.toUpperCase().includes('PKKMB') && !m.title.toUpperCase().includes('PKKMB'));

    const optionsHtml = [
      `<option value="all">Semua Mata Kuliah (${this.students.length} Mhs)</option>`,
      ...nonPkkmbCourses.map((m) => {
        const count = this.students.filter(s => s.courses.some(c => c.courseCode === m.courseCode)).length;
        return `<option value="${escapeHtml(m.courseCode)}">${escapeHtml(m.title)} (${count})</option>`;
      })
    ].join('');

    if (!controlsBar.querySelector('.student-toolbar')) {
      controlsBar.innerHTML = `
        <div class="student-toolbar">
          <div class="forum-search-wrap">
            <svg class="forum-search-icon" width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="forum-search-input" id="student-search-input" placeholder="Cari nama atau NIM mahasiswa..." value="${escapeHtml(this.studentSearchQuery)}">
            <button class="forum-search-clear" id="student-search-clear" type="button" aria-label="Hapus pencarian">&times;</button>
          </div>
          <select class="eval-type-select" id="student-course-filter" aria-label="Filter mata kuliah">${optionsHtml}</select>
          <button class="forum-toggle-all-btn" id="btn-copy-students" type="button">
            <svg width="14" height="14" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Salin Daftar</span>
          </button>
        </div>
      `;

      const searchInput = controlsBar.querySelector('#student-search-input');
      const clearBtn = controlsBar.querySelector('#student-search-clear');
      const courseFilter = controlsBar.querySelector('#student-course-filter');
      const copyBtn = controlsBar.querySelector('#btn-copy-students');

      if (this.studentSearchQuery) clearBtn.style.display = 'block';
      courseFilter.value = this.studentCourseFilter;

      searchInput.addEventListener('input', (e) => {
        this.studentSearchQuery = e.target.value.trim().toLowerCase();
        clearBtn.style.display = this.studentSearchQuery ? 'block' : 'none';
        this._renderStudents(this.students, false);
      });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.studentSearchQuery = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        this._renderStudents(this.students, false);
      });

      courseFilter.addEventListener('change', (e) => {
        this.studentCourseFilter = e.target.value;
        this._renderStudents(this.students, false);
      });

      copyBtn.addEventListener('click', async () => {
        const listToCopy = this._getFilteredStudents();
        if (listToCopy.length === 0) {
          Toast.warning('Tidak ada daftar mahasiswa untuk disalin.');
          return;
        }
        const activeCourses = (this.courses || []).map(c => parseCourseMeta(c));
        const selectedCourse = activeCourses.find(c => c.courseCode === this.studentCourseFilter);
        const headerLine = selectedCourse
          ? `Daftar Mahasiswa - ${selectedCourse.title} (${listToCopy.length})\n`
          : `Daftar Mahasiswa Sekelas (${listToCopy.length})\n`;
        const bodyLines = listToCopy.map((s, idx) => `${idx + 1}. ${s.nama} (${s.nim})`).join('\n');
        try {
          await navigator.clipboard.writeText(headerLine + bodyLines);
          Toast.success(`${listToCopy.length} data mahasiswa berhasil disalin.`);
        } catch {
          Toast.error('Gagal menyalin ke clipboard.');
        }
      });
    } else {
      const courseFilter = controlsBar.querySelector('#student-course-filter');
      if (courseFilter) {
        courseFilter.innerHTML = optionsHtml;
        if (!Array.from(courseFilter.options).some(opt => opt.value === this.studentCourseFilter)) {
          this.studentCourseFilter = 'all';
        }
        courseFilter.value = this.studentCourseFilter;
      }
    }
  }

  _getFilteredStudents() {
    const q = (this.studentSearchQuery || '').toLowerCase();
    return (this.students || []).filter((s) => {
      if (this.studentCourseFilter !== 'all') {
        if (!s.courses.some(c => c.courseCode === this.studentCourseFilter)) return false;
      }
      if (q) {
        const nameMatch = s.nama.toLowerCase().includes(q);
        const nimMatch = s.nim.toLowerCase().includes(q);
        const courseMatch = s.courses.some(c => c.courseTitle.toLowerCase().includes(q));
        if (!nameMatch && !nimMatch && !courseMatch) return false;
      }
      return true;
    });
  }

  _renderStudents(list, updateControls = true) {
    const container = this.shadow?.getElementById('student-list-container');
    if (!container) return;

    if (updateControls) {
      this._renderStudentControls();
    }

    if (!list || list.length === 0) {
      container.innerHTML = this.hasSyncedCourseDetails
        ? '<div class="empty-state">Tidak ada data mahasiswa peserta dari mata kuliah aktif.</div>'
        : '<div class="loading-text">Memuat data mahasiswa dari seluruh mata kuliah...</div>';
      return;
    }

    const filtered = this._getFilteredStudents();
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Tidak ada mahasiswa yang cocok dengan filter atau pencarian saat ini.</p>
          <button class="btn-config" id="btn-reset-student-filters" type="button" style="margin-top:12px;">Reset Filter</button>
        </div>
      `;
      container.querySelector('#btn-reset-student-filters')?.addEventListener('click', () => {
        this.studentSearchQuery = '';
        this.studentCourseFilter = 'all';
        const input = this.shadow?.getElementById('student-search-input');
        if (input) input.value = '';
        const clear = this.shadow?.getElementById('student-search-clear');
        if (clear) clear.style.display = 'none';
        const sel = this.shadow?.getElementById('student-course-filter');
        if (sel) sel.value = 'all';
        this._renderStudents(this.students, false);
      });
      return;
    }

    container.innerHTML = `
      <div class="student-summary-line">
        <span>Menampilkan <strong>${filtered.length}</strong> dari <strong>${list.length}</strong> mahasiswa unik (tanpa duplikasi NIM)</span>
      </div>
    `;

    filtered.forEach((student, idx) => {
      const isExpanded = this.expandedStudentNims.has(student.nim);
      const initial = (student.nama || '?').charAt(0).toUpperCase();

      const card = document.createElement('div');
      card.className = 'student-card';

      const mainRow = document.createElement('div');
      mainRow.className = 'student-row-main';

      const metaParts = [
        `<span>NIM: ${escapeHtml(student.nim)}</span>`,
        student.email ? `<span>${escapeHtml(student.email)}</span>` : '',
        student.phone ? `<span>${escapeHtml(student.phone)}</span>` : ''
      ].filter(Boolean).join('');

      mainRow.innerHTML = `
        <div class="student-identity">
          <div class="student-avatar">${escapeHtml(initial)}</div>
          <div class="student-info">
            <div class="student-name" title="${escapeHtml(student.nama)}">${escapeHtml(student.nama)}</div>
            <div class="student-meta">${metaParts}</div>
          </div>
        </div>
        <div class="student-actions">
          <button type="button" class="student-courses-toggle" aria-expanded="${isExpanded ? 'true' : 'false'}">
            ${student.courses.length} Matkul
          </button>
          <span class="student-rank">${idx + 1}</span>
        </div>
      `;

      const coursesPanel = document.createElement('div');
      coursesPanel.className = `student-courses-panel ${isExpanded ? 'open' : ''}`;
      coursesPanel.innerHTML = `
        <div class="student-courses-heading">Terdaftar bersama di ${student.courses.length} mata kuliah:</div>
        <div class="student-course-pills">
          ${student.courses.map(c => `<span class="student-course-pill">${escapeHtml(c.courseTitle)}</span>`).join('')}
        </div>
      `;

      const toggleBtn = mainRow.querySelector('.student-courses-toggle');
      toggleBtn.addEventListener('click', () => {
        const opening = !coursesPanel.classList.contains('open');
        coursesPanel.classList.toggle('open', opening);
        toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (opening) this.expandedStudentNims.add(student.nim);
        else this.expandedStudentNims.delete(student.nim);
      });

      card.appendChild(mainRow);
      card.appendChild(coursesPanel);
      container.appendChild(card);
    });
  }

  async _hydrateQuizResultsForCourse(courseCode, containerEl) {
    if (!courseCode || !containerEl) return;
    const completedQuizzes = (this.evaluations || []).filter(
      e => e.courseCode === courseCode && e.completion && e.type !== 'KUESIONER' && e.subId
    );
    if (completedQuizzes.length === 0) return;

    const applyScore = (subId, info) => {
      const targets = this.shadow?.querySelectorAll(`.eval-quiz-score[data-quiz-id="${CSS.escape(String(subId))}"]`) || [];
      if (!info) return;
      const parts = [];
      if (info.grade !== null && info.grade !== undefined && info.grade !== '') {
        parts.push(`Nilai: ${info.grade}`);
      }
      if (info.duration && info.duration !== '-') {
        parts.push(info.duration);
      }
      const text = parts.length > 0 ? ` (${parts.join(' | ')})` : '';
      targets.forEach((el) => {
        el.textContent = text;
      });
    };

    const toFetch = [];
    for (const q of completedQuizzes) {
      if (this._quizResultCache.has(q.subId)) {
        applyScore(q.subId, this._quizResultCache.get(q.subId));
      } else if (!this._quizResultInFlight.has(q.subId)) {
        this._quizResultInFlight.add(q.subId);
        toFetch.push(q.subId);
      }
    }
    if (toFetch.length === 0) return;

    const options = await UnpamAuth.getFetchOptions();
    if (!options?.headers?.Authorization) {
      toFetch.forEach(id => this._quizResultInFlight.delete(id));
      return;
    }

    const fetchGen = this._fetchGeneration;
    const chunkSize = 3;
    for (let i = 0; i < toFetch.length; i += chunkSize) {
      const chunk = toFetch.slice(i, i + chunkSize);
      await Promise.allSettled(chunk.map(async (quizId) => {
        try {
          const res = await fetch(`https://mentari.unpam.ac.id/api/quiz/peserta/${encodeURIComponent(quizId)}`, {
            ...options,
            cache: 'no-store'
          });
          if (!res.ok || fetchGen !== this._fetchGeneration) return;
          const data = await res.json();
          const quiz = data?.quiz;
          if (!quiz) return;
          const info = {
            grade: quiz.grade ?? null,
            duration: formatDurationSeconds(quiz.end_in_second)
          };
          this._quizResultCache.set(quizId, info);
          applyScore(quizId, info);
        } catch {} finally {
          this._quizResultInFlight.delete(quizId);
        }
      }));
    }
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

  _getMeetingKey(meetingNum, sectionName) {
    if (typeof meetingNum === 'number' && !isNaN(meetingNum) && meetingNum > 0) {
      return `m_${meetingNum}`;
    }
    const m = (sectionName || '').match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
    if (m) {
      return `m_${parseInt(m[1], 10)}`;
    }
    return `sec_${(sectionName || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  _resolveEvalStatus(item, allEvalsInCourse = []) {
    // 1. Selesai
    if (item.completion) {
      return {
        status: 'DONE',
        badgeLabel: 'Selesai',
        badgeClass: 'badge-done',
        canExecute: false,
        buttonLabel: 'Selesai',
        buttonClass: 'eval-btn-done',
        reason: 'Telah diselesaikan'
      };
    }

    const meetingKey = this._getMeetingKey(item.meetingNum, item.sectionName);
    const meta = this.courseForumsMeta ? this.courseForumsMeta[item.courseCode] : null;
    const sectionForums = (meta && meta.sectionForums) ? meta.sectionForums : {};
    let forum = sectionForums[meetingKey];

    // Fallback pencarian forum dari activeForums jika belum ada di sectionForums
    if (!forum && Array.isArray(this.activeForums)) {
      const activeF = this.activeForums.find(f => 
        f.courseCode === item.courseCode && 
        this._getMeetingKey(f.meetingNum, f.sectionName) === meetingKey
      );
      if (activeF) {
        forum = {
          forumId: activeF.forumId,
          hasTopics: true,
          completion: activeF.completion,
          answered: activeF.answered
        };
      } else if (meta && Array.isArray(meta.unavailableMeetings) && typeof item.meetingNum === 'number' && meta.unavailableMeetings.includes(item.meetingNum)) {
        forum = {
          forumId: null,
          hasTopics: false,
          completion: false,
          answered: false
        };
      }
    }

    // 2. Pre-Test (Mandiri, tidak bergantung pada forum)
    if (item.type === 'PRE_TEST') {
      if (item.locked) {
        return {
          status: 'LOCKED',
          badgeLabel: 'Terkunci',
          badgeClass: 'badge-locked',
          canExecute: false,
          buttonLabel: 'Terkunci',
          buttonClass: 'eval-btn-locked',
          reason: item.lockReason || 'Terkunci oleh sistem LMS'
        };
      }
      return {
        status: 'READY',
        badgeLabel: 'Siap Dikerjakan',
        badgeClass: 'badge-ready',
        canExecute: true,
        buttonLabel: 'Kerjakan',
        buttonClass: 'eval-btn-ready',
        reason: 'Pre-Test siap dikerjakan'
      };
    }

    // 3. Post-Test
    if (item.type === 'POST_TEST') {
      // 3A. Hard-lock dari LMS
      if (item.locked) {
        return {
          status: 'LMS_LOCKED',
          badgeLabel: 'Terkunci',
          badgeClass: 'badge-locked',
          canExecute: false,
          buttonLabel: 'Terkunci',
          buttonClass: 'eval-btn-locked',
          reason: item.lockReason || 'Terkunci oleh sistem LMS'
        };
      }

      // 3B. Cek apakah ada Pre-Test di pertemuan ini yang belum selesai
      const preTest = allEvalsInCourse.find(e => 
        e.type === 'PRE_TEST' && 
        this._getMeetingKey(e.meetingNum, e.sectionName) === meetingKey
      );
      if (preTest && !preTest.completion) {
        return {
          status: 'WAITING_PRETEST',
          badgeLabel: 'Menunggu Pre-Test',
          badgeClass: 'badge-waiting-pre',
          canExecute: false,
          buttonLabel: 'Butuh Pre-Test',
          buttonClass: 'eval-btn-blocked',
          hintClass: 'hint-pre',
          reason: 'Pre-Test pertemuan ini belum diselesaikan'
        };
      }

      // 3C. Cek Forum Diskusi pertemuan ini
      if (forum) {
        // Kondisi Gambar 2: Forum belum dibuka/belum ada topik dari dosen
        if (forum.hasTopics === false) {
          return {
            status: 'FORUM_NOT_OPEN',
            badgeLabel: 'Forum Belum Dibuka',
            badgeClass: 'badge-waiting-lecturer',
            canExecute: false,
            buttonLabel: 'Belum Dibuka',
            buttonClass: 'eval-btn-blocked',
            hintClass: 'hint-lecturer',
            reason: 'Soal forum diskusi belum tersedia dari dosen'
          };
        }

        const isForumDone = Boolean(forum.completion || forum.answered);
        if (!isForumDone) {
          // Kondisi Gambar 1: Forum dibuka tapi mahasiswa belum menjawab
          const forumUrl = forum.forumId 
            ? `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(item.courseCode)}/forum/${forum.forumId}`
            : `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(item.courseCode)}`;
          return {
            status: 'WAITING_FORUM',
            badgeLabel: 'Menunggu Forum',
            badgeClass: 'badge-waiting-forum',
            canExecute: false,
            isForumAction: true,
            buttonLabel: 'Jawab Forum',
            buttonClass: 'eval-btn-goto-forum',
            forumUrl,
            hintClass: 'hint-forum',
            reason: 'Forum diskusi pertemuan ini belum dijawab'
          };
        }
      }

      // 3D. Jika forum sudah selesai atau pertemuan tidak memiliki forum:
      return {
        status: 'READY',
        badgeLabel: 'Siap Dikerjakan',
        badgeClass: 'badge-ready',
        canExecute: true,
        buttonLabel: 'Kerjakan',
        buttonClass: 'eval-btn-ready',
        hintClass: 'hint-ready',
        reason: 'Prasyarat forum & materi lengkap'
      };
    }

    // 4. Kuesioner
    if (item.type === 'KUESIONER') {
      // Cek Post-Test pertemuan ini
      const postTest = allEvalsInCourse.find(e => 
        e.type === 'POST_TEST' && 
        this._getMeetingKey(e.meetingNum, e.sectionName) === meetingKey
      );
      if (postTest && !postTest.completion) {
        return {
          status: 'WAITING_POSTTEST',
          badgeLabel: 'Menunggu Post-Test',
          badgeClass: 'badge-waiting-post',
          canExecute: false,
          buttonLabel: 'Menunggu Post-Test',
          buttonClass: 'eval-btn-blocked',
          hintClass: 'hint-post',
          reason: 'Selesaikan Post-Test terlebih dahulu'
        };
      }

      // Jika post-test sudah selesai (atau tidak ada post-test di pertemuan ini),
      // abaikan peringatan warningAlert yang sekadar mengeluhkan post-test dari cache server UNPAM!
      const isPostTestAlert = item.lockReason && /post[- ]?test/i.test(item.lockReason);
      const isHardLocked = item.locked && !isPostTestAlert;

      if (isHardLocked) {
        return {
          status: 'LOCKED',
          badgeLabel: 'Terkunci',
          badgeClass: 'badge-locked',
          canExecute: false,
          buttonLabel: 'Terkunci',
          buttonClass: 'eval-btn-locked',
          reason: item.lockReason || 'Terkunci oleh sistem LMS'
        };
      }

      return {
        status: 'READY',
        badgeLabel: 'Siap Diisi',
        badgeClass: 'badge-ready',
        canExecute: true,
        buttonLabel: 'Isi Kuesioner',
        buttonClass: 'eval-btn-ready',
        hintClass: 'hint-ready',
        reason: 'Siap diisi (Post-Test selesai)'
      };
    }

    return {
      status: item.locked ? 'LOCKED' : 'READY',
      badgeLabel: item.locked ? 'Terkunci' : 'Belum',
      badgeClass: item.locked ? 'badge-locked' : 'badge-pending',
      canExecute: !item.locked,
      buttonLabel: item.locked ? 'Terkunci' : 'Kerjakan',
      buttonClass: item.locked ? 'eval-btn-locked' : 'eval-btn-action',
      reason: ''
    };
  }

  _computeRanges(meetingNums) {
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
          text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`
        });
        rangeStart = current;
        rangeEnd = current;
      }
    }
    
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
      text: rangeStart === rangeEnd ? `Pertemuan ${rangeStart}` : `Pertemuan ${rangeStart} - ${rangeEnd}`
    });
    
    return ranges;
  }

  _computeUnavailableRanges(meetingNums) {
    return this._computeRanges(meetingNums).map(r => ({
      ...r,
      reason: 'Topik diskusi belum dibuat oleh dosen pengampu / modul belum dibuka'
    }));
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
            <button class="forum-toggle-all-btn forum-export-docx-btn" id="forum-export-docx-btn" title="Rekap Soal Forum yang Belum Dikerjakan">
              <svg id="forum-export-docx-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span id="forum-export-docx-text">Rekap Tugas</span>
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
      const exportDocxBtn = controlsBar.querySelector('#forum-export-docx-btn');
      const exportDocxIcon = controlsBar.querySelector('#forum-export-docx-icon');
      const exportDocxText = controlsBar.querySelector('#forum-export-docx-text');

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

      if (exportDocxBtn) {
        exportDocxBtn.addEventListener('click', async () => {
          await this._handleExportForumRecap(exportDocxBtn, exportDocxIcon, exportDocxText);
        });
      }

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

  /**
   * Helper ekstraksi teks pertanyaan / soal forum dari respon JSON Mentari
   */
  _extractQuestionFromAny(data, targetTopicId = null) {
    if (!data) return '';

    if (typeof data === 'string') {
      const clean = data.trim();
      if (clean.length > 15 && (clean.includes('<p>') || clean.includes(' ') || clean.length > 30)) {
        return clean;
      }
      return '';
    }

    if (typeof data !== 'object') return '';

    // Cek jika data.konten ada pada root object respon /api/forum/reply/${topicId}: jika ada string > 0, langsung return data.konten
    if (typeof data.konten === 'string' && data.konten.trim().length > 0) {
      return data.konten.trim();
    }

    const isValidContent = (val) => {
      if (!val || typeof val !== 'string') return false;
      const trimmed = val.trim();
      return trimmed.length > 10;
    };

    const contentFields = [
      'konten', 'deskripsi', 'pesan', 'message', 'content', 'body',
      'uraian', 'soal', 'instruksi', 'pertanyaan', 'isi', 'keterangan'
    ];

    // 1. Cek properti topic langsung jika ada: data.topic
    if (data.topic && typeof data.topic === 'object') {
      const t = data.topic;
      for (const field of contentFields) {
        if (isValidContent(t[field])) return t[field];
      }
    }

    // 2. Cek data.data jika nested
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      if (data.data.topic && typeof data.data.topic === 'object') {
        const t = data.data.topic;
        for (const field of contentFields) {
          if (isValidContent(t[field])) return t[field];
        }
      }
      for (const field of contentFields) {
        if (isValidContent(data.data[field])) return data.data[field];
      }
    }

    // 3. Cek properti langsung pada root object
    for (const field of contentFields) {
      if (isValidContent(data[field])) return data[field];
    }

    // 4. Cek parent post jika ada (data.parent)
    if (data.parent && typeof data.parent === 'object') {
      for (const field of contentFields) {
        if (isValidContent(data.parent[field])) return data.parent[field];
      }
    }

    // 5. Cek list replies atau posts
    const replyList = data.replies || data.posts || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : null));
    if (Array.isArray(replyList) && replyList.length > 0) {
      // Prioritas 1: Post dari dosen
      for (const r of replyList) {
        if (!r || typeof r !== 'object') continue;
        const name = (r.fullname || r.nama || r.author || '').toLowerCase();
        const isDosen = r.role === 'dosen' || r.is_dosen || /s\.pd|m\.pd|dr\.|prof\.|m\.kom|s\.kom|m\.m|s\.e/i.test(name);
        if (isDosen) {
          for (const field of contentFields) {
            if (isValidContent(r[field])) return r[field];
          }
        }
      }

      // Prioritas 2: Thread starter / root post
      for (const r of replyList) {
        if (!r || typeof r !== 'object') continue;
        if (r.is_parent || r.parent_id === 0 || r.parent_id === null || r.is_thread_starter) {
          for (const field of contentFields) {
            if (isValidContent(r[field])) return r[field];
          }
        }
      }

      // Prioritas 3: Post pertama
      const first = replyList[0];
      if (first && typeof first === 'object') {
        for (const field of contentFields) {
          if (isValidContent(first[field])) return first[field];
        }
      }
    }

    return '';
  }

  /**
   * Fetch teks pertanyaan dosen untuk suatu topik dari endpoint API Mentari
   */
  async _fetchTopicQuestionContent(topicId, fetchOpts) {
    if (!topicId) return '';

    // Cek jika halaman saat ini sedang membuka topik ini
    if (typeof window !== 'undefined' && window.location.href.includes(topicId)) {
      const domContent = document.querySelector('.ck-content') || document.querySelector('[role="article"]') || document.querySelector('.MuiPaper-root');
      if (domContent) {
        const html = domContent.innerHTML.trim();
        if (html.length > 20) return html;
      }
    }

    const endpoints = [
      `https://mentari.unpam.ac.id/api/forum/topic/${topicId}`,
      `https://mentari.unpam.ac.id/api/forum/topics/${topicId}`,
      `https://mentari.unpam.ac.id/api/forum/reply/${topicId}`
    ];

    const results = await Promise.allSettled(endpoints.map(async (url) => {
      try {
        const res = await fetch(url, fetchOpts);
        if (res.ok) {
          const json = await res.json();
          const extracted = this._extractQuestionFromAny(json, topicId);
          if (extracted && extracted.length > 10) return extracted;
        }
      } catch {}
      return null;
    }));

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        return r.value;
      }
    }

    return '';
  }

  /**
   * Poles dan perjelas struktur teks pertanyaan forum menggunakan Gemini AI
   * Mematuhi aturan mutlak: ZERO HALLUCINATION (dilarang mengubah/menambah/mengurangi kata-kata dan isi tugas)
   */
  async _polishQuestionWithGemini(rawText, model = DEFAULT_FREE_MODEL) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 15) {
      return rawText;
    }

    try {
      const systemInstruction = 'Kamu adalah asisten akademik ahli penataan dokumen perkuliahan. Tugasmu adalah menata ulang struktur penulisan tugas forum perkuliahan agar tersusun rapi dalam format HTML semantik. ATURAN MUTLAK: DILARANG MENGUBAH, MENAMBAH, ATAU MENGURANGI KATA-KATA DAN ISI SOAL MAHASISWA. Seluruh instruksi, batasan, teks pertanyaan, dan angka bobot penilaian harus 100% persis seperti teks aslinya.';

      const prompt = `TATA ULANG STRUKTUR TEKS TUGAS FORUM DISKUSI BERIKUT MENJADI HTML BERSTRUKTUR RAPI.\n\nATURAN MUTLAK:\n1. DILARANG MENGUBAH, MENAMBAH, ATAU MENGURANGI KATA-KATA DAN ISI SOAL ASLI DARI DOSEN (ZERO HALLUCINATION).\n2. Pertahankan seluruh instruksi, pertanyaan, batasan, dan angka bobot penilaian persis seperti aslinya.\n3. Gunakan tag heading <h3> atau <h4> untuk judul bagian (seperti Pengantar Materi, Instruksi Tugas, Pertanyaan Diskusi, Kriteria Penilaian).\n4. Gunakan <ol> dan <li> untuk daftar pertanyaan/langkah berurutan, dan <ul><li> untuk poin-poin/bullet.\n5. Jika ada tabel atau kriteria penilaian berbobot/skor, susun menjadi tabel HTML <table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table> yang rapi.\n6. HANYA kembalikan raw HTML valid. JANGAN gunakan markdown code block (\`\`\`html ... \`\`\`), JANGAN ada teks pengantar atau penutup apapun.\n\nTEKS ASLI DARI DOSEN:\n${rawText}`;

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'generateGeminiContent',
          prompt,
          systemInstruction,
          model: model || DEFAULT_FREE_MODEL
        }, resolve);
      });

      if (response && response.success && response.text) {
        let polished = response.text.trim();
        polished = polished.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim();
        if (polished.length > 20) {
          return polished;
        }
      }
    } catch (e) {
      console.warn('[Mentari Recap] Gagal memoles dengan Gemini AI, menggunakan teks asli:', e);
    }
    return rawText;
  }

  /**
   * Tampilkan Modal Konfigurasi Ekspor Rekap Tugas (DOCX & Markdown)
   */
  _showDocxExportModal({ pendingForums = [], pendingCount, studentName, studentNim, initialFormat = 'docx', initialMode = 'standard', initialModel = DEFAULT_FREE_MODEL, onConfirm }) {
    if (!this.shadow) return;

    // Hapus modal lama jika ada
    const existing = this.shadow.getElementById('mentari-docx-export-overlay');
    if (existing) existing.remove();

    const isLight = this.shadow.querySelector('.modal')?.classList.contains('theme-light') || false;

    const escapeHtml = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const safeForums = Array.isArray(pendingForums) ? pendingForums : [];
    const totalPending = safeForums.length || Number(pendingCount) || 0;
    const orderedEntries = safeForums.map((forum, idx) => ({
      key: String(forum.forumId || `${forum.courseCode || 'mk'}_${forum.meetingNum ?? ''}_${idx}`),
      forum,
      checked: true
    }));

    let selectedFormat = initialFormat;
    let selectedMode = initialMode;
    let selectedModel = initialModel;

    const overlay = document.createElement('div');
    overlay.id = 'mentari-docx-export-overlay';
    overlay.className = `docx-modal-overlay ${isLight ? 'theme-light' : ''}`;

    overlay.innerHTML = `
      <style>
        .docx-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: docxBlurIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: opacity 0.2s ease, backdrop-filter 0.22s ease, -webkit-backdrop-filter 0.22s ease;
        }
        .docx-modal-overlay.theme-light {
          background: rgba(255, 255, 255, 0.08);
        }
        .docx-modal-overlay.closing {
          opacity: 0;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
        }
        @keyframes docxBlurIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
        @keyframes docxCardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .docx-modal {
          width: 590px;
          max-width: 92vw;
          max-height: 90vh;
          background: #141519;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #f1f5f9;
          position: relative;
          animation: docxCardIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: opacity 0.18s ease, transform 0.2s ease;
        }
        .docx-modal-overlay.closing .docx-modal {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        .docx-modal.theme-light {
          background: #ffffff;
          border-color: #e2e8f0;
          color: #0f172a;
          box-shadow: 0 24px 56px rgba(15, 23, 42, 0.16);
        }
        .docx-modal *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .docx-modal *::-webkit-scrollbar-track {
          background: transparent;
        }
        .docx-modal *::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 9999px;
        }
        .docx-modal *::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.32);
        }
        .docx-modal * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        .docx-modal.theme-light *::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .docx-modal.theme-light *::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .docx-modal.theme-light * {
          scrollbar-color: #cbd5e1 transparent;
        }
        .docx-header {
          padding: 16px 22px;
          background: #18191e;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: grab;
          user-select: none;
        }
        .docx-modal.theme-light .docx-header {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .docx-header:active {
          cursor: grabbing;
        }
        .docx-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #f8fafc;
        }
        .docx-header-title svg { color: #f59e0b; }
        .docx-modal.theme-light .docx-header-title {
          color: #0f172a;
        }
        .docx-modal.theme-light .docx-header-title svg {
          color: #1e3a8a;
        }
        .docx-close-btn {
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
        .docx-modal.theme-light .docx-close-btn {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #64748b;
        }
        .docx-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .docx-modal.theme-light .docx-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .docx-body {
          padding: 18px 22px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .docx-info-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .docx-modal.theme-light .docx-info-strip {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .docx-student-details {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .docx-student-icon {
          color: #d4af37;
          flex-shrink: 0;
        }
        .docx-student-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .docx-modal.theme-light .docx-student-name {
          color: #1e293b;
        }
        .docx-student-nim {
          font-size: 11px;
          color: #94a3b8;
        }
        .docx-count-badge {
          background: rgba(212, 175, 55, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          white-space: nowrap;
        }
        .docx-modal.theme-light .docx-count-badge {
          background: #fef3c7;
          color: #b45309;
          border-color: #fde68a;
        }
        .docx-section-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .docx-modal.theme-light .docx-section-label {
          color: #475569;
        }
        .docx-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .docx-format-card {
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .docx-modal.theme-light .docx-format-card {
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
        }
        .docx-format-card:hover {
          border-color: rgba(212, 175, 55, 0.4);
          background: rgba(255, 255, 255, 0.04);
        }
        .docx-modal.theme-light .docx-format-card:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .docx-format-card.selected {
          border-color: #d4af37;
          background: rgba(212, 175, 55, 0.08);
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.15);
        }
        .docx-modal.theme-light .docx-format-card.selected {
          border-color: #d97706;
          background: #fffbeb;
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.12);
        }
        .docx-format-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .docx-format-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .docx-modal.theme-light .docx-format-title {
          color: #0f172a;
        }
        .docx-format-desc {
          font-size: 11px;
          line-height: 1.4;
          color: #94a3b8;
        }
        .docx-modal.theme-light .docx-format-desc {
          color: #64748b;
        }
        .docx-mode-cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .docx-mode-card {
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          gap: 12px;
          position: relative;
        }
        .docx-modal.theme-light .docx-mode-card {
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
        }
        .docx-mode-card:hover {
          border-color: rgba(212, 175, 55, 0.4);
          background: rgba(255, 255, 255, 0.04);
        }
        .docx-modal.theme-light .docx-mode-card:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .docx-mode-card.selected {
          border-color: #d4af37;
          background: rgba(212, 175, 55, 0.08);
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.15);
        }
        .docx-modal.theme-light .docx-mode-card.selected {
          border-color: #d97706;
          background: #fffbeb;
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.12);
        }
        .docx-radio-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
          transition: all 0.2s;
        }
        .docx-modal.theme-light .docx-radio-indicator {
          border-color: #94a3b8;
        }
        .docx-mode-card.selected .docx-radio-indicator {
          border-color: #d4af37;
        }
        .docx-modal.theme-light .docx-mode-card.selected .docx-radio-indicator {
          border-color: #d97706;
        }
        .docx-radio-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #d4af37;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.2s;
        }
        .docx-modal.theme-light .docx-radio-dot {
          background: #d97706;
        }
        .docx-mode-card.selected .docx-radio-dot {
          opacity: 1;
          transform: scale(1);
        }
        .docx-mode-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .docx-mode-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .docx-mode-title {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .docx-modal.theme-light .docx-mode-title {
          color: #0f172a;
        }
        .docx-mode-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .docx-mode-desc {
          font-size: 11.5px;
          line-height: 1.45;
          color: #94a3b8;
        }
        .docx-modal.theme-light .docx-mode-desc {
          color: #64748b;
        }
        .docx-model-picker-wrap {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed rgba(212, 175, 55, 0.25);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .docx-model-picker-label {
          font-size: 11px;
          font-weight: 600;
          color: #fbbf24;
        }
        .docx-modal.theme-light .docx-model-picker-label {
          color: #b45309;
        }
        .docx-model-select {
          width: 100%;
          background: #1a1a20;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #f1f1f1;
          font-size: 12px;
          padding: 8px 10px;
          outline: none;
          cursor: pointer;
        }
        .docx-modal.theme-light .docx-model-select {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .docx-standard-note {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 11.5px;
          line-height: 1.45;
          color: #93c5fd;
        }
        .docx-modal.theme-light .docx-standard-note {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }
        .docx-standard-note svg {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .docx-footer {
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          background: rgba(0, 0, 0, 0.2);
        }
        .docx-modal.theme-light .docx-footer {
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .docx-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .docx-modal.theme-light .docx-btn-cancel {
          border-color: #cbd5e1;
          color: #475569;
        }
        .docx-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .docx-modal.theme-light .docx-btn-cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .docx-btn-copy {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #60a5fa;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: all 0.2s;
        }
        .docx-modal.theme-light .docx-btn-copy {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #2563eb;
        }
        .docx-btn-copy:hover {
          background: rgba(59, 130, 246, 0.25);
          transform: translateY(-1px);
        }
        .docx-modal.theme-light .docx-btn-copy:hover {
          background: #dbeafe;
        }
        .docx-btn-confirm {
          background: #f59e0b;
          border: 1px solid #f59e0b;
          color: #0f172a;
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .docx-btn-confirm:hover {
          background: #fbbf24;
          transform: translateY(-1px);
        }
        .docx-modal.theme-light .docx-student-icon { color: #1e3a8a; }
        .docx-modal.theme-light .docx-count-badge {
          background: #eff6ff;
          color: #1e3a8a;
          border-color: #bfdbfe;
        }
        .docx-modal.theme-light .docx-format-card.selected,
        .docx-modal.theme-light .docx-mode-card.selected {
          border-color: #1e3a8a;
          background: #eff6ff;
          box-shadow: 0 0 0 1px rgba(30, 58, 138, 0.12);
        }
        .docx-modal.theme-light .docx-mode-card.selected .docx-radio-indicator {
          border-color: #1e3a8a;
        }
        .docx-modal.theme-light .docx-radio-dot { background: #1e3a8a; }
        .docx-modal.theme-light .docx-model-picker-label { color: #1e3a8a; }
        .docx-modal.theme-light .docx-btn-confirm {
          background: #1e3a8a;
          border-color: #1e3a8a;
          color: #ffffff;
        }
        .docx-modal.theme-light .docx-btn-confirm:hover:not(:disabled) {
          background: #1e40af;
        }
        .docx-btn-confirm:disabled,
        .docx-btn-copy:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        .docx-mode-tag.tag-token {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.35);
        }
        .docx-modal.theme-light .docx-mode-tag.tag-token {
          background: #eff6ff;
          color: #1e40af;
          border-color: #bfdbfe;
        }
        .docx-mode-tag.tag-ai {
          background: rgba(245, 158, 11, 0.16);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.35);
        }
        .docx-modal.theme-light .docx-mode-tag.tag-ai {
          background: #fffbeb;
          color: #92400e;
          border-color: #fcd34d;
        }
        .docx-count-badge.is-empty {
          background: rgba(239, 68, 68, 0.14);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.35);
        }
        .docx-modal.theme-light .docx-count-badge.is-empty {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        /* ─── Forum Selector & Priority Picker ─── */
        .docx-picker-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .docx-picker-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .docx-picker-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .docx-mini-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.16s ease;
        }
        .docx-mini-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .docx-modal.theme-light .docx-mini-btn {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #334155;
        }
        .docx-modal.theme-light .docx-mini-btn:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1e3a8a;
        }
        .docx-course-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .docx-course-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          transition: all 0.16s ease;
          max-width: 100%;
        }
        .docx-course-chip span.chip-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 190px;
        }
        .docx-course-chip.active {
          background: rgba(245, 158, 11, 0.14);
          border-color: rgba(245, 158, 11, 0.45);
          color: #fbbf24;
        }
        .docx-course-chip.partial {
          border-style: dashed;
          border-color: rgba(245, 158, 11, 0.4);
          color: #e2e8f0;
        }
        .docx-modal.theme-light .docx-course-chip {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #64748b;
        }
        .docx-modal.theme-light .docx-course-chip.active {
          background: #eff6ff;
          border-color: #1e3a8a;
          color: #1e3a8a;
        }
        .docx-modal.theme-light .docx-course-chip.partial {
          border-style: dashed;
          border-color: #1e3a8a;
          color: #1e3a8a;
        }
        .docx-forum-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 176px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .docx-forum-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 11px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          transition: all 0.16s ease;
        }
        .docx-forum-row.is-checked {
          border-color: rgba(245, 158, 11, 0.38);
          background: rgba(245, 158, 11, 0.06);
        }
        .docx-forum-row.is-unchecked {
          opacity: 0.58;
        }
        .docx-modal.theme-light .docx-forum-row {
          background: #ffffff;
          border-color: #e2e8f0;
        }
        .docx-modal.theme-light .docx-forum-row.is-checked {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .docx-forum-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
          cursor: pointer;
        }
        .docx-forum-check {
          width: 16px;
          height: 16px;
          accent-color: #f59e0b;
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 4px;
        }
        .docx-modal.theme-light .docx-forum-check {
          accent-color: #1e3a8a;
        }
        .docx-forum-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .docx-forum-course-name {
          font-size: 12px;
          font-weight: 700;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .docx-modal.theme-light .docx-forum-course-name {
          color: #0f172a;
        }
        .docx-forum-meta {
          font-size: 11px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .docx-modal.theme-light .docx-forum-meta {
          color: #64748b;
        }
        .docx-forum-right {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .docx-prio-badge {
          font-size: 10.5px;
          font-weight: 700;
          min-width: 24px;
          text-align: center;
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(245, 158, 11, 0.16);
          color: #fbbf24;
        }
        .docx-prio-badge.is-off {
          background: rgba(148, 163, 184, 0.12);
          color: #64748b;
        }
        .docx-modal.theme-light .docx-prio-badge {
          background: #dbeafe;
          color: #1e3a8a;
        }
        .docx-modal.theme-light .docx-prio-badge.is-off {
          background: #f1f5f9;
          color: #94a3b8;
        }
        .docx-order-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .docx-order-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        .docx-order-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .docx-modal.theme-light .docx-order-btn {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #475569;
        }
        .docx-modal.theme-light .docx-order-btn:hover:not(:disabled) {
          background: #eff6ff;
          border-color: #1e3a8a;
          color: #1e3a8a;
        }
        .docx-picker-warning {
          font-size: 11px;
          color: #f87171;
          font-weight: 600;
          padding: 2px 2px 0;
          display: none;
        }
        .docx-modal.theme-light .docx-picker-warning {
          color: #dc2626;
        }
      </style>

      <div class="docx-modal ${isLight ? 'theme-light' : ''}" id="mentari-docx-modal-card">
        <div class="docx-header" id="mentari-docx-modal-header">
          <div class="docx-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Rekap Tugas Forum Diskusi</span>
          </div>
          <button class="docx-close-btn" id="docx-btn-close" title="Tutup Modal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="docx-body">
          <div class="docx-info-strip">
            <div class="docx-student-details">
              <svg class="docx-student-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <div>
                <div class="docx-student-name">${escapeHtml(studentName || 'Mahasiswa UNPAM')}</div>
                <div class="docx-student-nim">NIM: ${escapeHtml(studentNim || '-')}</div>
              </div>
            </div>
            <div class="docx-count-badge" id="docx-selected-badge">${totalPending} / ${totalPending} Dipilih</div>
          </div>

          ${orderedEntries.length > 0 ? `
          <div class="docx-picker-section">
            <div class="docx-picker-head">
              <div class="docx-section-label">Pilih &amp; Prioritaskan Forum (${totalPending} Tersedia):</div>
              <div class="docx-picker-actions">
                <button type="button" class="docx-mini-btn" id="docx-btn-select-all">Pilih Semua</button>
                <button type="button" class="docx-mini-btn" id="docx-btn-clear-all">Kosongkan</button>
              </div>
            </div>
            <div class="docx-course-chips" id="docx-course-chips" style="display: none;"></div>
            <div class="docx-forum-list" id="docx-forum-list"></div>
            <div class="docx-picker-warning" id="docx-picker-warning">Pilih minimal 1 forum diskusi yang ingin direkap.</div>
          </div>
          ` : ''}

          <div class="docx-section-label">Pilih Format File:</div>
          <div class="docx-format-grid" id="docx-format-container">
            <div class="docx-format-card ${selectedFormat === 'docx' ? 'selected' : ''}" id="format-card-docx" data-format="docx">
              <div class="docx-format-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span class="docx-format-title">Microsoft Word (.docx)</span>
              </div>
              <div class="docx-format-desc">
                Format resmi akademik: Times New Roman 12, margin 4-4-3-3, tabel terstruktur. Cocok untuk arsip formal / cetak fisik.
              </div>
            </div>

            <div class="docx-format-card ${selectedFormat === 'md' ? 'selected' : ''}" id="format-card-md" data-format="md">
              <div class="docx-format-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <span class="docx-format-title">Markdown (.md)</span>
                <span class="docx-mode-tag tag-token">Hemat Token AI</span>
              </div>
              <div class="docx-format-desc">
                Format teks murni GFM: Pangkas 50%+ token input AI, tanpa XML overhead, siap disalin langsung ke ChatGPT / Claude / Gemini.
              </div>
            </div>
          </div>

          <div class="docx-section-label">Pilih Mode Pembuatan Dokumen:</div>
          <div class="docx-mode-cards">
            <!-- Mode Standar -->
            <div class="docx-mode-card ${selectedMode === 'standard' ? 'selected' : ''}" id="mode-card-standard">
              <div class="docx-radio-indicator">
                <div class="docx-radio-dot"></div>
              </div>
              <div class="docx-mode-info">
                <div class="docx-mode-title-row">
                  <span class="docx-mode-title">Mode Standar (Format Asli Dosen)</span>
                  <span class="docx-mode-tag">Rekomendasi &amp; Instan</span>
                </div>
                <div class="docx-mode-desc">
                  Mempertahankan 100% susunan struktur teks dosen di forum: heading bab, daftar instruksi, dan tabel rubrik penilaian dikonversi menjadi tabel resmi Word tanpa jeda.
                </div>
              </div>
            </div>

            <!-- Mode AI Gemini -->
            <div class="docx-mode-card ${selectedMode === 'ai' ? 'selected' : ''}" id="mode-card-ai">
              <div class="docx-radio-indicator">
                <div class="docx-radio-dot"></div>
              </div>
              <div class="docx-mode-info">
                <div class="docx-mode-title-row">
                  <span class="docx-mode-title">Mode Poles AI Gemini (Perjelas Tata Letak)</span>
                  <span class="docx-mode-tag tag-ai">AI Formatter</span>
                </div>
                <div class="docx-mode-desc">
                  AI Gemini merapikan kembali struktur heading (A, B, C), daftar pertanyaan bernomor, dan tabel jika penulisan dosen di forum berantakan. Zero Hallucination: 100% kata-kata asli dosen dipertahankan.
                </div>
                <div class="docx-model-picker-wrap" id="docx-model-picker-wrap" style="display: ${selectedMode === 'ai' ? 'flex' : 'none'};">
                  <label class="docx-model-picker-label">Pilih Model Gemini:</label>
                  <select class="docx-model-select" id="docx-select-model">
                    ${ALL_MODELS.map(m => `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="docx-standard-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div id="docx-standard-note-text">
              ${selectedFormat === 'md'
                ? 'Format Markdown (.md) menghasilkan teks semantik murni GFM (GitHub Flavored Markdown) yang langsung dipahami LLM dengan efisiensi token input optimal.'
                : 'Dokumen Word (.docx) dihasilkan dengan standar akademik: Times New Roman 12pt, margin A4 (4-4-3-3 cm), spasi 1.5, tabel terstruktur, dan lembar jawaban siap isi per tugas.'}
            </div>
          </div>
        </div>

        <div class="docx-footer">
          <button class="docx-btn-cancel" id="docx-btn-cancel">Batal</button>
          <button class="docx-btn-copy" id="docx-btn-copy" style="display: ${selectedFormat === 'md' ? 'flex' : 'none'};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin Prompt AI (.md)</span>
          </button>
          <button class="docx-btn-confirm" id="docx-btn-confirm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span id="docx-btn-confirm-text">${selectedFormat === 'md' ? 'Unduh File (.md)' : 'Unduh Dokumen (.docx)'}</span>
          </button>
        </div>
      </div>
    `;

    this.shadow.appendChild(overlay);

    const modalCard = overlay.querySelector('#mentari-docx-modal-card');
    const modalHeader = overlay.querySelector('#mentari-docx-modal-header');
    const btnClose = overlay.querySelector('#docx-btn-close');
    const btnCancel = overlay.querySelector('#docx-btn-cancel');
    const btnCopy = overlay.querySelector('#docx-btn-copy');
    const btnConfirm = overlay.querySelector('#docx-btn-confirm');
    const btnConfirmText = overlay.querySelector('#docx-btn-confirm-text');
    const noteText = overlay.querySelector('#docx-standard-note-text');
    const cardFormatDocx = overlay.querySelector('#format-card-docx');
    const cardFormatMd = overlay.querySelector('#format-card-md');
    const cardStandard = overlay.querySelector('#mode-card-standard');
    const cardAi = overlay.querySelector('#mode-card-ai');
    const pickerWrap = overlay.querySelector('#docx-model-picker-wrap');
    const selectModel = overlay.querySelector('#docx-select-model');
    const selectedBadgeEl = overlay.querySelector('#docx-selected-badge');
    const forumListEl = overlay.querySelector('#docx-forum-list');
    const courseChipsEl = overlay.querySelector('#docx-course-chips');
    const warningEl = overlay.querySelector('#docx-picker-warning');
    const btnSelectAll = overlay.querySelector('#docx-btn-select-all');
    const btnClearAll = overlay.querySelector('#docx-btn-clear-all');

    const getSelectedForums = () => orderedEntries.filter(e => e.checked).map(e => e.forum);

    const renderForumPicker = () => {
      if (!orderedEntries.length) return;
      const selectedCount = orderedEntries.filter(e => e.checked).length;

      if (selectedBadgeEl) {
        selectedBadgeEl.textContent = `${selectedCount} / ${orderedEntries.length} Dipilih`;
        selectedBadgeEl.classList.toggle('is-empty', selectedCount === 0);
      }
      if (warningEl) {
        warningEl.style.display = selectedCount === 0 ? 'block' : 'none';
      }
      if (btnConfirm) btnConfirm.disabled = selectedCount === 0;
      if (btnCopy) btnCopy.disabled = selectedCount === 0;

      // Render course quick-toggle chips jika ada lebih dari 1 mata kuliah
      if (courseChipsEl) {
        const courseGroups = new Map();
        orderedEntries.forEach((entry) => {
          const cKey = entry.forum.courseCode || entry.forum.courseTitle || 'UNKNOWN';
          if (!courseGroups.has(cKey)) {
            courseGroups.set(cKey, {
              code: cKey,
              title: entry.forum.courseTitle || cKey,
              total: 0,
              checked: 0
            });
          }
          const grp = courseGroups.get(cKey);
          grp.total += 1;
          if (entry.checked) grp.checked += 1;
        });

        if (courseGroups.size > 1) {
          courseChipsEl.style.display = 'flex';
          courseChipsEl.innerHTML = '';
          courseGroups.forEach((grp) => {
            const chipBtn = document.createElement('button');
            chipBtn.type = 'button';
            const stateClass = grp.checked === grp.total ? 'active' : (grp.checked > 0 ? 'partial' : '');
            chipBtn.className = `docx-course-chip ${stateClass}`;
            chipBtn.title = `Klik untuk mengaktifkan / menonaktifkan semua forum ${grp.title}`;
            chipBtn.innerHTML = `<span class="chip-name">${escapeHtml(grp.title)}</span><span>(${grp.checked}/${grp.total})</span>`;
            chipBtn.addEventListener('click', () => {
              const nextState = grp.checked < grp.total;
              orderedEntries.forEach((entry) => {
                const cKey = entry.forum.courseCode || entry.forum.courseTitle || 'UNKNOWN';
                if (cKey === grp.code) entry.checked = nextState;
              });
              renderForumPicker();
            });
            courseChipsEl.appendChild(chipBtn);
          });
        } else {
          courseChipsEl.style.display = 'none';
        }
      }

      if (!forumListEl) return;
      forumListEl.innerHTML = '';

      let priorityCounter = 0;
      orderedEntries.forEach((entry, idx) => {
        if (entry.checked) priorityCounter += 1;
        const f = entry.forum;
        const meetingLabel = f.meetingNum !== null && f.meetingNum !== undefined
          ? `Pertemuan ${f.meetingNum}`
          : (f.sectionName || 'Pertemuan');
        const topicsCount = Array.isArray(f.topics) && f.topics.length > 0 ? f.topics.length : 1;

        const row = document.createElement('div');
        row.className = `docx-forum-row ${entry.checked ? 'is-checked' : 'is-unchecked'}`;
        row.innerHTML = `
          <label class="docx-forum-left">
            <input type="checkbox" class="docx-forum-check" ${entry.checked ? 'checked' : ''} aria-label="Pilih ${escapeHtml(f.courseTitle)} ${escapeHtml(meetingLabel)}">
            <div class="docx-forum-text">
              <div class="docx-forum-course-name" title="${escapeHtml(f.courseTitle)}">${escapeHtml(f.courseTitle || 'Mata Kuliah')}</div>
              <div class="docx-forum-meta" title="${escapeHtml(f.forumName)}">${escapeHtml(meetingLabel)} &middot; ${escapeHtml(f.forumName || 'Forum Diskusi')} (${topicsCount} topik)</div>
            </div>
          </label>
          <div class="docx-forum-right">
            <span class="docx-prio-badge ${entry.checked ? '' : 'is-off'}" title="${entry.checked ? 'Urutan prioritas di dokumen' : 'Tidak diikutsertakan'}">${entry.checked ? `#${priorityCounter}` : '—'}</span>
            <button type="button" class="docx-order-btn" data-dir="up" title="Naikkan prioritas" aria-label="Naikkan prioritas" ${idx === 0 ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button type="button" class="docx-order-btn" data-dir="down" title="Turunkan prioritas" aria-label="Turunkan prioritas" ${idx === orderedEntries.length - 1 ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        `;

        const checkbox = row.querySelector('.docx-forum-check');
        checkbox.addEventListener('change', () => {
          entry.checked = checkbox.checked;
          renderForumPicker();
        });

        row.querySelector('[data-dir="up"]')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (idx <= 0) return;
          const tmp = orderedEntries[idx - 1];
          orderedEntries[idx - 1] = orderedEntries[idx];
          orderedEntries[idx] = tmp;
          renderForumPicker();
        });

        row.querySelector('[data-dir="down"]')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (idx >= orderedEntries.length - 1) return;
          const tmp = orderedEntries[idx + 1];
          orderedEntries[idx + 1] = orderedEntries[idx];
          orderedEntries[idx] = tmp;
          renderForumPicker();
        });

        forumListEl.appendChild(row);
      });
    };

    renderForumPicker();

    btnSelectAll?.addEventListener('click', () => {
      orderedEntries.forEach(e => { e.checked = true; });
      renderForumPicker();
    });
    btnClearAll?.addEventListener('click', () => {
      orderedEntries.forEach(e => { e.checked = false; });
      renderForumPicker();
    });

    this._makeElementDraggable(modalCard, modalHeader);

    const closeModal = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 210);
    };

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const updateFormatUI = (fmt) => {
      selectedFormat = fmt;
      if (fmt === 'md') {
        cardFormatMd?.classList.add('selected');
        cardFormatDocx?.classList.remove('selected');
        if (btnCopy) btnCopy.style.display = 'flex';
        if (btnConfirmText) btnConfirmText.textContent = 'Unduh File (.md)';
        if (noteText) {
          noteText.textContent = 'Format Markdown (.md) menghasilkan teks semantik murni GFM (GitHub Flavored Markdown) yang langsung dipahami LLM dengan efisiensi token input optimal.';
        }
      } else {
        cardFormatDocx?.classList.add('selected');
        cardFormatMd?.classList.remove('selected');
        if (btnCopy) btnCopy.style.display = 'none';
        if (btnConfirmText) btnConfirmText.textContent = 'Unduh Dokumen (.docx)';
        if (noteText) {
          noteText.textContent = 'Dokumen Word (.docx) dihasilkan dengan standar akademik: Times New Roman 12pt, margin A4 (4-4-3-3 cm), spasi 1.5, tabel terstruktur, dan lembar jawaban siap isi per tugas.';
        }
      }
    };

    cardFormatDocx?.addEventListener('click', () => updateFormatUI('docx'));
    cardFormatMd?.addEventListener('click', () => updateFormatUI('md'));

    cardStandard.addEventListener('click', () => {
      selectedMode = 'standard';
      cardStandard.classList.add('selected');
      cardAi.classList.remove('selected');
      pickerWrap.style.display = 'none';
    });

    cardAi.addEventListener('click', (e) => {
      if (e.target === selectModel) return;
      selectedMode = 'ai';
      cardAi.classList.add('selected');
      cardStandard.classList.remove('selected');
      pickerWrap.style.display = 'flex';
    });

    if (selectModel) {
      selectModel.addEventListener('change', (e) => {
        selectedModel = e.target.value;
      });
    }

    btnCopy?.addEventListener('click', () => {
      const selectedForums = getSelectedForums();
      if (selectedForums.length === 0) return;
      const mode = selectedMode;
      const model = selectModel ? selectModel.value : selectedModel;
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm({ selectedForums, format: 'md', mode, model, action: 'copy' });
      }
    });

    btnConfirm.addEventListener('click', () => {
      const selectedForums = getSelectedForums();
      if (selectedForums.length === 0) return;
      const format = selectedFormat;
      const mode = selectedMode;
      const model = selectModel ? selectModel.value : selectedModel;
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm({ selectedForums, format, mode, model, action: 'download' });
      }
    });
  }

  async _handleExportForumRecap(btn, icon, textEl) {
    if (this._isExportingDocx) return;

    // 1. Dapatkan daftar forum aktif yang BELUM dijawab / belum selesai, urutkan rapi per MK & pertemuan
    const pendingForums = (this.activeForums || [])
      .filter(f => !f.completion && !f.answered)
      .slice()
      .sort((a, b) => {
        const courseCmp = (a.courseTitle || '').localeCompare(b.courseTitle || '', 'id');
        if (courseCmp !== 0) return courseCmp;
        const mA = a.meetingNum !== null && a.meetingNum !== undefined ? a.meetingNum : 999;
        const mB = b.meetingNum !== null && b.meetingNum !== undefined ? b.meetingNum : 999;
        return mA - mB;
      });

    if (!pendingForums || pendingForums.length === 0) {
      Toast.info('Luar biasa! Tidak ada tugas forum diskusi yang pending (semua sudah selesai).');
      return;
    }

    // 2. Pastikan identitas mahasiswa terambil
    await this._resolveStudentIdentity();

    // 3. Baca preferensi mode ekspor & model AI yang tersimpan
    const { docx_export_mode, gemini_model, forum_recap_format } = await Storage.get({
      docx_export_mode: 'standard',
      gemini_model: DEFAULT_FREE_MODEL,
      forum_recap_format: 'docx'
    });

    // 4. Buka Modal Konfigurasi & Pemilihan Forum
    this._showDocxExportModal({
      pendingForums,
      pendingCount: pendingForums.length,
      studentName: this._studentName,
      studentNim: this._studentNim,
      initialFormat: forum_recap_format || 'docx',
      initialMode: docx_export_mode || 'standard',
      initialModel: gemini_model || DEFAULT_FREE_MODEL,
      onConfirm: async ({ selectedForums, format, mode, model, action }) => {
        const chosenForums = (Array.isArray(selectedForums) && selectedForums.length > 0)
          ? selectedForums
          : pendingForums;
        await Storage.set({ docx_export_mode: mode, gemini_model: model, forum_recap_format: format });
        await this._executeExportForumRecap({
          pendingForums: chosenForums,
          preserveOrder: true,
          format,
          action,
          polishWithAi: mode === 'ai',
          chosenModel: model,
          btn,
          icon,
          textEl
        });
      }
    });
  }

  async _executeExportForumRecap({ pendingForums, preserveOrder = false, format = 'docx', action = 'download', polishWithAi, chosenModel, btn, icon, textEl }) {
    if (this._isExportingDocx) return;
    this._isExportingDocx = true;

    const originalText = textEl ? textEl.textContent : 'Rekap Tugas';
    if (btn) btn.disabled = true;
    if (textEl) textEl.textContent = 'Menyiapkan...';
    if (icon) icon.classList.add('spin-animation');

    try {
      const formatLabel = format === 'md' ? 'Markdown (.md)' : 'Word (.docx)';
      Toast.info(`Menyiapkan rekap untuk ${pendingForums.length} tugas forum diskusi (${formatLabel})...`);

      // 1. Ambil opsi autentikasi UNPAM
      let fetchOpts = { headers: { 'Accept': 'application/json' }, credentials: 'include' };
      try {
        fetchOpts = await UnpamAuth.getFetchOptions();
      } catch {}

      if (textEl) textEl.textContent = 'Memuat Topik...';

      // 2. Pastikan setiap forum pending punya array topics
      await Promise.allSettled(pendingForums.map(async (f) => {
        if (!f.topics || f.topics.length === 0) {
          try {
            const res = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${f.forumId}`, fetchOpts);
            if (res.ok) {
              const topicData = await res.json();
              f.forumContent = topicData.konten || topicData.deskripsi || f.forumContent || '';
              const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
              f.topics = topics.map(t => ({
                id: t.id,
                title: t.judul || t.title || t.name || '',
                message: t.konten || t.deskripsi || t.pesan || t.message || t.content || t.body || ''
              }));
            }
          } catch {}
        } else if (!f.forumContent) {
          try {
            const res = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${f.forumId}`, fetchOpts);
            if (res.ok) {
              const topicData = await res.json();
              f.forumContent = topicData.konten || topicData.deskripsi || '';
            }
          } catch {}
        }
      }));

      // 3. Kumpulkan semua topik yang teks soalnya masih kosong
      const topicsNeedingContent = [];
      for (const f of pendingForums) {
        if (f.topics && f.topics.length > 0) {
          for (const top of f.topics) {
            if (!top.message || top.message.trim().length === 0) {
              topicsNeedingContent.push({ topic: top, forum: f });
            }
          }
        }
      }

      if (topicsNeedingContent.length > 0) {
        if (textEl) textEl.textContent = 'Mengambil Soal...';
        await Promise.allSettled(topicsNeedingContent.map(async (item) => {
          const { topic: top, forum: f } = item;
          try {
            const content = await this._fetchTopicQuestionContent(top.id, fetchOpts);
            if (content) {
              top.message = content;
            } else if (f.forumContent) {
              top.message = f.forumContent;
            }
          } catch (err) {
            console.warn('[Mentari Recap] Gagal mengambil soal untuk topik:', top.id, err);
            if (f.forumContent) {
              top.message = f.forumContent;
            }
          }
        }));
      }

      // 4. Jika mode Poles AI Gemini diaktifkan, poles teks soal
      if (polishWithAi) {
        const allPendingTopics = [];
        for (const f of pendingForums) {
          if (f.topics && f.topics.length > 0) {
            for (const top of f.topics) {
              if (top.message && top.message.trim().length > 15) {
                allPendingTopics.push(top);
              }
            }
          } else if (f.forumContent && f.forumContent.trim().length > 15) {
            allPendingTopics.push({ message: f.forumContent, isForumContent: true, forum: f });
          }
        }

        const totalToPolish = allPendingTopics.length;
        if (totalToPolish > 0) {
          Toast.info(`Merapikan struktur soal dengan AI Gemini (${totalToPolish} tugas)...`);
          for (let i = 0; i < totalToPolish; i++) {
            const item = allPendingTopics[i];
            if (textEl) textEl.textContent = `Poles AI (${i + 1}/${totalToPolish})...`;
            const polished = await this._polishQuestionWithGemini(item.message, chosenModel);
            if (item.isForumContent) {
              item.forum.forumContent = polished;
            } else {
              item.message = polished;
            }
          }
        }
      }

      if (textEl) textEl.textContent = format === 'md' ? 'Menyusun .md...' : 'Menyusun Docx...';

      // 5. Kelompokkan per Mata Kuliah -> Pertemuan
      const courseMap = new Map();
      for (const forum of pendingForums) {
        const cKey = forum.courseCode || forum.courseTitle || 'UNKNOWN';
        if (!courseMap.has(cKey)) {
          const matchingCourse = (this.courses || []).find(c => 
            (c.kode_course || c.kode || c.course_code || c.id) === forum.courseCode
          );
          let lecturer = forum.courseLecturer || '';
          if (!lecturer && matchingCourse) {
            const raw = matchingCourse.nama_dosen || matchingCourse.dosen || matchingCourse.dosen_pengampu || matchingCourse.pengampu;
            if (typeof raw === 'string') {
              lecturer = raw.trim();
            } else if (Array.isArray(raw) && raw.length > 0) {
              lecturer = raw.map(d => typeof d === 'string' ? d : (d.nama || d.name || d.fullname || '')).filter(Boolean).join(', ');
            } else if (raw && typeof raw === 'object') {
              lecturer = (raw.nama || raw.name || raw.fullname || '').trim();
            }
          }

          courseMap.set(cKey, {
            courseCode: forum.courseCode,
            courseTitle: forum.courseTitle,
            lecturerName: lecturer || '',
            meetings: []
          });
        }

        const cData = courseMap.get(cKey);
        if (!cData.lecturerName && forum.courseLecturer) {
          cData.lecturerName = forum.courseLecturer;
        }

        const topics = (forum.topics && forum.topics.length > 0)
          ? forum.topics
          : [{ title: '', message: forum.forumContent || '' }];

        for (const top of topics) {
          cData.meetings.push({
            meetingNum: forum.meetingNum,
            sectionName: forum.sectionName,
            forumName: forum.forumName,
            lecturerName: forum.courseLecturer || cData.lecturerName || '',
            topicTitle: top.title,
            rawMessage: top.message || forum.forumContent || ''
          });
        }
      }

      // Pertahankan urutan prioritas pengguna jika preserveOrder aktif; selain itu urutkan ascending
      const coursesPayload = Array.from(courseMap.values()).map(c => {
        if (!preserveOrder) {
          c.meetings.sort((a, b) => {
            const mA = a.meetingNum !== null ? a.meetingNum : 999;
            const mB = b.meetingNum !== null ? b.meetingNum : 999;
            return mA - mB;
          });
        }
        return c;
      });

      // 6. Generate File berdasarkan format yang dipilih (.docx atau .md)
      const dateString = DocxGenerator.getIndonesianDayAndDate(new Date());
      const safeName = DocxGenerator.sanitizeFileName(this._studentName || 'Mahasiswa');
      const safeNim = DocxGenerator.sanitizeFileName(this._studentNim || 'NIM');

      if (format === 'md') {
        const mdContent = MarkdownGenerator.generateForumRecap({
          studentName: this._studentName,
          studentNim: this._studentNim,
          dateString,
          courses: coursesPayload
        });

        if (action === 'copy') {
          const copied = await MarkdownGenerator.copyToClipboard(mdContent);
          if (copied) {
            Toast.success('Prompt Rekap Tugas (.md) berhasil disalin ke clipboard! Siap dipaste ke AI.');
          } else {
            Toast.warning('Clipboard tidak dapat diakses langsung, mengunduh file .md sebagai gantinya...');
            const fileName = `Rekap Tugas_${dateString}_${safeName}_${safeNim}.md`;
            MarkdownGenerator.downloadFile(mdContent, fileName);
          }
        } else {
          const fileName = `Rekap Tugas_${dateString}_${safeName}_${safeNim}.md`;
          MarkdownGenerator.downloadFile(mdContent, fileName);
          Toast.success(`File Markdown (.md) berhasil diunduh: ${fileName}`);
        }
      } else {
        const fileName = `Rekap Tugas_${dateString}_${safeName}_${safeNim}.docx`;
        const docxBlob = await DocxGenerator.generateForumRecap({
          studentName: this._studentName,
          studentNim: this._studentNim,
          dateString,
          courses: coursesPayload
        });

        DocxGenerator.downloadFile(docxBlob, fileName);
        Toast.success(`Dokumen Word (.docx) berhasil dibuat dan diunduh: ${fileName}`);
      }
    } catch (err) {
      console.error('[Mentari] Gagal mengekspor rekap forum:', err);
      Toast.error('Gagal membuat rekap tugas: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      this._isExportingDocx = false;
      if (btn) btn.disabled = false;
      if (textEl) textEl.textContent = originalText;
      if (icon) icon.classList.remove('spin-animation');
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
      if (this.forumFilter === 'all') {
        const pendingItems = displayItems.filter(f => !this._isForumDone(f));
        const doneItems = displayItems.filter(f => this._isForumDone(f));

        // Render yang belum selesai sebagai card individual (actionable)
        pendingItems.forEach(f => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'forum-item';
          itemDiv.innerHTML = `
            <div class="forum-item-info">
              <div class="forum-item-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>${f.sectionName} &bull; ${f.forumName}</span>
                <span class="badge badge-pending">Belum Dijawab</span>
              </div>
              <div class="forum-item-meta">${f.courseTitle} &bull; ${f.sectionName}</div>
            </div>
            <a class="forum-btn-action" target="_self" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(f.courseCode)}/forum/${f.forumId}">Buka Forum</a>
          `;
          content.appendChild(itemDiv);
        });

        // Rangkum forum yang sudah selesai menjadi box hijau kompak (Pertemuan x - y Sudah Selesai)
        if (doneItems.length > 0) {
          const doneMeetingNums = doneItems.map(f => f.meetingNum).filter(n => n !== null && n !== undefined).sort((a, b) => a - b);
          const doneRanges = this._computeRanges(doneMeetingNums);

          doneRanges.forEach(range => {
            const compDiv = document.createElement('div');
            compDiv.className = 'forum-completed-box';
            compDiv.innerHTML = `
              <div class="forum-completed-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span class="forum-completed-title">${range.text} Sudah Selesai</span>
              </div>
              <div class="forum-completed-reason">Diskusi dan tanggapan telah berhasil dikirimkan.</div>
            `;
            content.appendChild(compDiv);
          });
        }
      } else {
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
      }

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

    // Attach status deterministik per item
    const byCourse = {};
    evals.forEach(e => {
      if (!byCourse[e.courseCode]) byCourse[e.courseCode] = [];
      byCourse[e.courseCode].push(e);
    });

    evals.forEach(e => {
      e._resolvedStatus = this._resolveEvalStatus(e, byCourse[e.courseCode]);
    });

    const total = evals.length;
    const readyCount = evals.filter(e => e._resolvedStatus?.status === 'READY').length;
    const waitingPrereqCount = evals.filter(e => ['WAITING_FORUM', 'FORUM_NOT_OPEN', 'WAITING_POSTTEST', 'WAITING_PRETEST'].includes(e._resolvedStatus?.status)).length;
    const doneCount = evals.filter(e => e.completion).length;

    filterBar.innerHTML = '';
    const pills = document.createElement('div');
    pills.className = 'filter-pills';
    pills.innerHTML = `
      <button class="filter-pill ${this.evalFilter === 'all' ? 'active' : ''}" data-filter="all">
        Semua<span class="pill-count">${total}</span>
      </button>
      <button class="filter-pill ${this.evalFilter === 'ready' ? 'active' : ''}" data-filter="ready">
        Siap Dikerjakan<span class="pill-count">${readyCount}</span>
      </button>
      <button class="filter-pill ${(this.evalFilter === 'waiting_forum' || this.evalFilter === 'waiting_prereq') ? 'active' : ''}" data-filter="waiting_prereq">
        Tertahan Prasyarat<span class="pill-count">${waitingPrereqCount}</span>
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

    const byCourse = {};
    evals.forEach(e => {
      if (!byCourse[e.courseCode]) byCourse[e.courseCode] = [];
      byCourse[e.courseCode].push(e);
    });

    evals.forEach(e => {
      if (!e._resolvedStatus) {
        e._resolvedStatus = this._resolveEvalStatus(e, byCourse[e.courseCode]);
      }
    });

    const preTests = evals.filter(e => e.type === 'PRE_TEST');
    const postTests = evals.filter(e => e.type === 'POST_TEST');
    const kuesioners = evals.filter(e => e.type === 'KUESIONER');

    const preDone = preTests.filter(e => e.completion).length;
    const postDone = postTests.filter(e => e.completion).length;
    const kuesDone = kuesioners.filter(e => e.completion).length;

    const readyTotal = evals.filter(e => e._resolvedStatus?.status === 'READY').length;
    const waitingTotal = evals.filter(e => ['WAITING_FORUM', 'FORUM_NOT_OPEN'].includes(e._resolvedStatus?.status)).length;

    summaryBar.innerHTML = `
      <div class="eval-summary">
        <div class="eval-stat">
          <div class="eval-stat-value" style="color:#10b981;">${readyTotal}</div>
          <div class="eval-stat-label">Siap Dikerjakan</div>
        </div>
        <div class="eval-stat">
          <div class="eval-stat-value" style="color:#f59e0b;">${waitingTotal}</div>
          <div class="eval-stat-label">Tertahan Forum</div>
        </div>
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
            <button class="eval-toggle-all-btn eval-autopilot-btn" id="eval-autopilot-btn" title="Auto-Pilot Kuis Batch (1 Tab Murni)">
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

    const validModelIds = ALL_MODELS.map(m => m.id);
    const { gemini_model, gemini_thinking_level } = await Storage.get({
      gemini_model: DEFAULT_FREE_MODEL,
      gemini_thinking_level: null
    });
    const currentModel = (gemini_model && validModelIds.includes(gemini_model)) ? gemini_model : DEFAULT_FREE_MODEL;
    const currentThinking = resolveThinkingLevelForModel(currentModel, gemini_thinking_level);
    const storeKues = await Storage.get('mentari_kuesioner_preference');
    let selectedKuesPref = (storeKues?.mentari_kuesioner_preference === 'tidak') ? 'tidak' : 'iya';

    // Periksa apakah ada sesi Auto-Pilot yang sedang aktif atau terjeda
    const activeSession = await AutoPilotState.get();
    const hasActiveSession = Boolean(activeSession && activeSession.active && Array.isArray(activeSession.queue) && activeSession.currentIndex < activeSession.queue.length);

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
    overlay.className = `ap-overlay ${this.currentTheme === 'light' ? 'theme-light' : ''}`;

    overlay.innerHTML = `
      <style>
        .ap-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 2147483645;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: apBlurIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: opacity 0.2s ease, backdrop-filter 0.22s ease, -webkit-backdrop-filter 0.22s ease;
        }
        .ap-overlay.theme-light {
          background: rgba(255, 255, 255, 0.08);
        }
        .ap-overlay.closing {
          opacity: 0;
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
        }
        @keyframes apBlurIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        }
        @keyframes apCardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ap-modal *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .ap-modal *::-webkit-scrollbar-track {
          background: transparent;
        }
        .ap-modal *::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
        }
        .ap-modal *::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.32);
        }
        .ap-modal *::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .ap-modal * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        .ap-modal {
          width: 650px;
          max-width: 94vw;
          max-height: 90vh;
          background: #141519;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #f1f5f9;
          position: relative;
          animation: apCardIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: opacity 0.18s ease, transform 0.2s ease;
        }
        .ap-overlay.closing .ap-modal {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        .ap-header {
          padding: 16px 22px;
          background: #18191e;
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
          color: #f8fafc;
        }
        .ap-header-title svg {
          color: #f59e0b;
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
        .ap-active-banner {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.45);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
        }
        .ap-active-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .ap-active-icon {
          color: #fbbf24;
          flex-shrink: 0;
        }
        .ap-active-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ap-active-title {
          font-size: 12px;
          font-weight: 700;
          color: #fbbf24;
        }
        .ap-active-desc {
          font-size: 11px;
          color: #d1d5db;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 270px;
        }
        .ap-active-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .ap-btn-resume {
          background: #fbbf24;
          color: #111;
          border: none;
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ap-btn-resume:hover {
          background: #f59e0b;
        }
        .ap-btn-reset-session {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 7px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ap-btn-reset-session:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
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
        .ap-label-hint {
          color: #fbbf24;
          font-size: 10px;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
        }
        .ap-label-hint.success {
          color: #34d399;
        }
        .ap-queue-header .ap-label {
          color: #e2e8f0;
          margin: 0;
        }
        .ap-model-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 10px;
        }
        @media (max-width: 560px) {
          .ap-model-grid {
            grid-template-columns: 1fr;
          }
        }
        .ap-modal.theme-light .ap-label-hint {
          color: #b45309;
        }
        .ap-modal.theme-light .ap-label-hint.success {
          color: #047857;
        }
        .ap-modal.theme-light .ap-queue-header .ap-label {
          color: #1e293b;
        }
        .ap-modal.theme-light .ap-queue-count-badge {
          color: #1e3a8a;
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .ap-modal.theme-light .ap-row-num {
          color: #475569;
        }
        .ap-modal.theme-light .ap-row-status {
          color: #047857;
          background: #ecfdf5;
        }
        .ap-modal.theme-light .ap-type-tag.pre {
          background: #eff6ff;
          color: #1e3a8a;
          border-color: #bfdbfe;
        }
        .ap-modal.theme-light .ap-type-tag.post {
          background: #ecfdf5;
          color: #047857;
          border-color: #a7f3d0;
        }
        .ap-modal.theme-light .ap-type-tag.kues {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }
        .ap-modal.theme-light .ap-skipped-box {
          background: #fef2f2;
          border-color: #fecaca;
          color: #b91c1c;
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
        .ap-mode-card,
        .ap-pref-card {
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
        .ap-mode-card:hover,
        .ap-pref-card:hover {
          border-color: rgba(212, 175, 55, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }
        .ap-mode-card.active,
        .ap-pref-card.active {
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
        .ap-mode-card.active .ap-mode-title,
        .ap-pref-card.active .ap-mode-title {
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
          color: #0f172a;
          border-color: #e2e8f0;
          box-shadow: 0 24px 56px rgba(15, 23, 42, 0.16);
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .ap-modal.theme-light *::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .ap-modal.theme-light * {
          scrollbar-color: #cbd5e1 transparent;
        }
        .ap-modal.theme-light .ap-header {
          background: #f8fafc;
          border-bottom-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-header-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-header-title svg {
          color: #1e3a8a;
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
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .ap-modal.theme-light .ap-banner-icon { color: #1e3a8a; }
        .ap-modal.theme-light .ap-banner-text {
          color: #334155;
        }
        .ap-modal.theme-light .ap-banner-text b {
          color: #1e3a8a;
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
        .ap-modal.theme-light .ap-mode-card,
        .ap-modal.theme-light .ap-pref-card {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ap-modal.theme-light .ap-mode-card:hover,
        .ap-modal.theme-light .ap-pref-card:hover {
          border-color: #93c5fd;
          background: #ffffff;
        }
        .ap-modal.theme-light .ap-mode-card.active,
        .ap-modal.theme-light .ap-pref-card.active {
          background: #eff6ff;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 1px rgba(30, 58, 138, 0.12);
        }
        .ap-modal.theme-light .ap-mode-title {
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-mode-card.active .ap-mode-title,
        .ap-modal.theme-light .ap-pref-card.active .ap-mode-title {
          color: #1e3a8a;
        }
        .ap-modal.theme-light .ap-mode-sub {
          color: #64748b;
        }
        .ap-modal.theme-light .ap-slider {
          background: #cbd5e1;
        }
        .ap-modal.theme-light .ap-slider::-webkit-slider-thumb {
          background: #1e3a8a;
          box-shadow: 0 0 8px rgba(30, 58, 138, 0.3);
        }
        .ap-modal.theme-light .ap-slider::-moz-range-thumb {
          background: #1e3a8a;
          box-shadow: 0 0 8px rgba(30, 58, 138, 0.3);
        }
        .ap-modal.theme-light .ap-cooldown-badge {
          background: #1e3a8a;
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
          background: #eff6ff;
          border-color: #1e3a8a;
          color: #1e3a8a;
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
        .ap-modal.theme-light .ap-active-banner {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .ap-modal.theme-light .ap-active-icon { color: #1e3a8a; }
        .ap-modal.theme-light .ap-active-title {
          color: #1e3a8a;
        }
        .ap-modal.theme-light .ap-active-desc {
          color: #475569;
        }
        .ap-modal.theme-light .ap-btn-resume {
          background: #1e3a8a;
          color: #ffffff;
        }
        .ap-modal.theme-light .ap-btn-resume:hover {
          background: #1e40af;
        }
        .ap-modal.theme-light .ap-btn-reset-session {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .ap-modal.theme-light .ap-btn-reset-session:hover {
          background: #fee2e2;
          color: #b91c1c;
        }
        .ap-modal.theme-light .ap-btn-cancel {
          border-color: #cbd5e1;
          color: #475569;
        }
        .ap-modal.theme-light .ap-btn-cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .ap-modal.theme-light .ap-btn-start {
          background: #1e3a8a;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(30, 58, 138, 0.25);
        }
        .ap-modal.theme-light .ap-btn-start:hover {
          background: #1e40af;
          box-shadow: 0 6px 18px rgba(30, 58, 138, 0.35);
        }
      </style>

      <div class="ap-modal ${this.currentTheme === 'light' ? 'theme-light' : ''}">
        <div class="ap-header">
          <div class="ap-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Auto-Pilot Kuis & Evaluasi
          </div>
          <button class="ap-close-btn" id="btn-close-ap-modal" aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="ap-content">
          ${hasActiveSession ? `
          <div class="ap-active-banner" id="ap-active-session-box">
            <div class="ap-active-left">
              <svg class="ap-active-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
              <div class="ap-active-info">
                <div class="ap-active-title">Sesi Auto-Pilot Aktif / Terjeda (${activeSession.currentIndex + 1}/${activeSession.queue.length})</div>
                <div class="ap-active-desc" title="${activeSession.queue[activeSession.currentIndex]?.courseTitle || ''} - ${activeSession.queue[activeSession.currentIndex]?.sectionName || ''}">
                  ${activeSession.queue[activeSession.currentIndex]?.sectionName || ''}: ${activeSession.queue[activeSession.currentIndex]?.courseTitle || ''} (${activeSession.queue[activeSession.currentIndex]?.type || ''})
                </div>
              </div>
            </div>
            <div class="ap-active-actions">
              <button class="ap-btn-resume" id="btn-resume-session" type="button" title="Lanjutkan pengerjaan sesi ini">Lanjutkan</button>
              <button class="ap-btn-reset-session" id="btn-reset-session" type="button" title="Hapus sesi ini dan mulai antrean baru">Hentikan & Reset</button>
            </div>
          </div>
          ` : ''}

          <div class="ap-banner">
            <svg class="ap-banner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <div class="ap-banner-text">
              Otomatisasi pengerjaan kuis & evaluasi perkuliahan secara berurutan dan aman. Sesuai aturan akademik, <b>Post-Test otomatis dilewati jika Forum Diskusi & Pre-Test pertemuan terkait belum selesai</b>.
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

          <div class="ap-model-grid">
            <div class="ap-field-group">
              <div class="ap-label">
                <span>Model AI Gemini</span>
                <span class="ap-label-hint">Otak Penjawab Kuis</span>
              </div>
              <select id="ap-model-select" class="ap-select">
                ${ALL_MODELS.map(m => `<option value="${m.id}" ${m.id === currentModel ? 'selected' : ''}>${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="ap-field-group">
              <div class="ap-label">
                <span>Thinking Level</span>
                <span class="ap-label-hint">Kecepatan vs Akurasi</span>
              </div>
              <select id="ap-thinking-select" class="ap-select"></select>
            </div>
          </div>

          <div class="ap-field-group" id="ap-kuesioner-pref-group" style="${(selectedMode === 'all' || selectedMode === 'kuesioner') ? '' : 'display:none;'}">
            <div class="ap-label">
              <span>Preferensi Kuesioner Dosen</span>
              <span class="ap-label-hint success">Evaluasi Pembelajaran</span>
            </div>
            <div class="ap-mode-grid" id="ap-kues-pref-container" style="grid-template-columns: repeat(2, 1fr);">
              <div class="ap-pref-card ${selectedKuesPref === 'iya' ? 'active' : ''}" data-kues-pref="iya">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Auto Ya
                </div>
                <div class="ap-mode-sub">Opsi Ya / Sangat Baik, langsung submit</div>
              </div>
              <div class="ap-pref-card ${selectedKuesPref === 'tidak' ? 'active' : ''}" data-kues-pref="tidak">
                <div class="ap-mode-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  Auto Tidak
                </div>
                <div class="ap-mode-sub">Opsi Tidak / Kurang, langsung submit</div>
              </div>
            </div>
          </div>

          <div class="ap-field-group">
            <div class="ap-queue-card">
              <div class="ap-queue-header">
                <span class="ap-label">Pratinjau Antrean Eksekusi</span>
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
            Mulai Auto-Pilot
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

    const close = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 210);
    };
    overlay.querySelector('#btn-close-ap-modal').addEventListener('click', close);
    overlay.querySelector('#btn-cancel-ap').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Event listener untuk tombol Sesi Aktif / Terjeda
    const btnResumeSession = overlay.querySelector('#btn-resume-session');
    if (btnResumeSession && activeSession) {
      btnResumeSession.addEventListener('click', async () => {
        await AutoPilotState.resume();
        const targetUrl = activeSession.queue[activeSession.currentIndex]?.url || activeSession.queue[0]?.url;
        close();
        if (targetUrl) {
          Toast.info('Melanjutkan sesi Auto-Pilot...');
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 300);
        }
      });
    }

    const btnResetSession = overlay.querySelector('#btn-reset-session');
    if (btnResetSession) {
      btnResetSession.addEventListener('click', async () => {
        await AutoPilotState.reset();
        Toast.success('Sesi Auto-Pilot telah direset total.');
        const activeBox = overlay.querySelector('#ap-active-session-box');
        if (activeBox) activeBox.remove();
      });
    }

    const courseSelect = overlay.querySelector('#ap-course-select');
    const modeCards = overlay.querySelectorAll('#ap-mode-container [data-mode]');
    const queueList = overlay.querySelector('#ap-queue-preview-list');
    const queueCount = overlay.querySelector('#ap-queue-count');
    const skippedBox = overlay.querySelector('#ap-skipped-box');
    const btnStart = overlay.querySelector('#btn-start-ap');

    const parseMeetingNum = (secName) => {
      if (!secName) return 999;
      const m = secName.match(/pertemuan\s*(\d+)/i) || secName.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 999;
    };

    const calculateQueue = () => {
      const selectedCourse = courseSelect.value;

      // Ambil seluruh evaluasi untuk analisis prasyarat
      let allCourseEvals = this.evaluations.filter(e => {
        if (selectedMode === 'all' || selectedMode === 'kuesioner') {
          // KUESIONER yang saat ini locked hanya karena menunggu post-test
          // TIDAK boleh dibuang di awal, karena akan dibuka setelah post-test selesai!
          if (e.type === 'KUESIONER') {
            const isPostAlert = e.lockReason && /post[- ]?test/i.test(e.lockReason);
            if (!e.locked || isPostAlert || selectedMode === 'all') return true;
          }
        }
        return !e.locked;
      });
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

      const preQueue = [];
      const postQueue = [];
      const kuesQueue = [];
      const skippedList = [];

      for (const cCode in courseGroups) {
        const cGroup = courseGroups[cCode];

        // Kelompokkan per Pertemuan secara deterministik (normalisasi nomor pertemuan via _getMeetingKey)
        const meetingMap = {};
        cGroup.items.forEach(item => {
          const mKey = this._getMeetingKey(item.meetingNum, item.sectionName);
          if (!meetingMap[mKey]) meetingMap[mKey] = [];
          meetingMap[mKey].push(item);
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
          let postScheduledInQueue = false;

          // 1. PRE-TEST
          if (preItem && !preItem.completion) {
            preQueue.push({
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

          // 2. POST-TEST (Wajib Forum selesai & Pre-Test selesai/terjadwal)
          if (postItem && !postItem.completion) {
            // Cek Forum pertemuan ini menggunakan deterministic meetingKey
            const meetingKey = this._getMeetingKey(postItem.meetingNum, postItem.sectionName);
            const meta = this.courseForumsMeta ? this.courseForumsMeta[postItem.courseCode] : null;
            const sectionForums = (meta && meta.sectionForums) ? meta.sectionForums : {};
            const forum = sectionForums[meetingKey];

            const matchingForum = (this.activeForums || []).find(f =>
              f.courseCode === postItem.courseCode &&
              this._getMeetingKey(f.meetingNum, f.sectionName) === meetingKey
            );
            const isForumDone = Boolean(
              (forum && (forum.completion || forum.answered)) ||
              (matchingForum && (matchingForum.completion === true || matchingForum.answered === true))
            );

            // Cek Pre-Test pertemuan ini: sudah selesai di server ATAU dijadwalkan dalam antrean Pre-Test
            const isPreDone = (preItem && preItem.completion) || preScheduledInQueue || (!preItem);

            if (!isForumDone) {
              let reason = 'Forum Diskusi belum dijawab/diselesaikan';
              if (forum && forum.hasTopics === false) {
                reason = 'Forum Diskusi belum dibuka dosen (soal belum tersedia)';
              } else if (!matchingForum && !forum) {
                reason = 'Forum Diskusi belum dibuka/dibuat dosen';
              }
              skippedList.push({ item: postItem, reason });
            } else if (!isPreDone) {
              skippedList.push({ item: postItem, reason: 'Pre-Test pertemuan ini belum diselesaikan' });
            } else {
              postQueue.push({
                id: postItem.subId,
                courseCode: postItem.courseCode,
                courseTitle: postItem.courseTitle,
                sectionName: postItem.sectionName,
                type: 'POST_TEST',
                name: postItem.name,
                url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(postItem.courseCode)}/exam/${postItem.subId}`,
                status: 'pending'
              });
              postScheduledInQueue = true;
            }
          }

          // 3. KUESIONER
          const kuesItems = mItems.filter(i => i.type === 'KUESIONER');
          for (const kuesItem of kuesItems) {
            if (kuesItem && !kuesItem.completion) {
              const isPostDone = (postItem && postItem.completion) || postScheduledInQueue || (!postItem);

              if (selectedMode === 'all') {
                // Pada mode 'Semua Lengkap', kuesioner dijadwalkan jika post-test sudah selesai atau dijadwalkan
                if (!isPostDone) {
                  continue;
                }
              } else if (selectedMode === 'kuesioner') {
                // Pada mode Kuesioner mandiri, kuesioner bisa dijadwalkan jika post-test sudah selesai
                if (!isPostDone) {
                  continue;
                }
                const isPostAlert = kuesItem.lockReason && /post[- ]?test/i.test(kuesItem.lockReason);
                if (kuesItem.locked && !isPostAlert) {
                  continue;
                }
              } else if (kuesItem.locked) {
                // Mode lainnya: kuesioner terkunci tidak dijalankan
                continue;
              }

              const statusDesc = (postScheduledInQueue && !postItem?.completion)
                ? 'Setelah Post-Test Selesai'
                : 'Siap Diisi';

              kuesQueue.push({
                id: kuesItem.subId,
                sectionCode: kuesItem.sectionCode,
                courseCode: kuesItem.courseCode,
                courseTitle: kuesItem.courseTitle,
                sectionName: kuesItem.sectionName,
                type: 'KUESIONER',
                name: kuesItem.name,
                url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(kuesItem.courseCode)}/kuesioner/${encodeURIComponent(kuesItem.sectionCode || kuesItem.subId)}`,
                status: 'pending',
                statusLabel: statusDesc
              });
            }
          }
        }
      }

      // Gabungkan antrean terurut berdasarkan fase/batch:
      // SEMUA Pre-Test -> SEMUA Post-Test -> SEMUA Kuesioner (Seamless & Non-Interleaved)
      let validQueue = [];
      if (selectedMode === 'all') {
        validQueue = [...preQueue, ...postQueue, ...kuesQueue];
      } else if (selectedMode === 'both') {
        validQueue = [...preQueue, ...postQueue];
      } else if (selectedMode === 'pre') {
        validQueue = [...preQueue];
      } else if (selectedMode === 'post') {
        validQueue = [...postQueue];
      } else if (selectedMode === 'kuesioner') {
        validQueue = [...kuesQueue];
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
            statusLabel = q.statusLabel || 'Siap Diisi';
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

    const kuesPrefGroup = overlay.querySelector('#ap-kuesioner-pref-group');
    const kuesPrefCards = overlay.querySelectorAll('#ap-kues-pref-container [data-kues-pref]');

    kuesPrefCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        kuesPrefCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedKuesPref = card.dataset.kuesPref || 'iya';
        Storage.set({ mentari_kuesioner_preference: selectedKuesPref });
      });
    });

    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.dataset.mode;
        if (kuesPrefGroup) {
          kuesPrefGroup.style.display = (selectedMode === 'all' || selectedMode === 'kuesioner') ? '' : 'none';
        }
        activeValidQueue = calculateQueue();
      });
    });

    const modelSelect = overlay.querySelector('#ap-model-select');
    const thinkingSelect = overlay.querySelector('#ap-thinking-select');

    const syncApThinkingSelect = (modelId, preferredLevel = null) => {
      const resolved = resolveThinkingLevelForModel(modelId, preferredLevel);
      if (!thinkingSelect) return resolved;
      const supported = getSupportedThinkingLevels(modelId);
      thinkingSelect.innerHTML = supported
        .map(lvl => `<option value="${lvl}">${THINKING_LEVEL_META[lvl]?.label || lvl}</option>`)
        .join('');
      thinkingSelect.value = resolved;
      return resolved;
    };

    let selectedThinking = syncApThinkingSelect(currentModel, currentThinking);

    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        const chosen = modelSelect.value;
        if (chosen && validModelIds.includes(chosen)) {
          selectedThinking = syncApThinkingSelect(chosen, selectedThinking);
          Storage.set({ gemini_model: chosen, gemini_thinking_level: selectedThinking });
        }
      });
    }

    if (thinkingSelect) {
      thinkingSelect.addEventListener('change', () => {
        const activeM = (modelSelect && modelSelect.value && validModelIds.includes(modelSelect.value))
          ? modelSelect.value
          : currentModel;
        selectedThinking = resolveThinkingLevelForModel(activeM, thinkingSelect.value);
        Storage.set({ gemini_thinking_level: selectedThinking });
      });
    }

    btnStart.addEventListener('click', async () => {
      if (!activeValidQueue || activeValidQueue.length === 0) {
        Toast.warning('Tidak ada antrean kuis yang valid.');
        return;
      }

      const chosenModel = (modelSelect && modelSelect.value && validModelIds.includes(modelSelect.value))
        ? modelSelect.value
        : currentModel;
      const chosenThinking = resolveThinkingLevelForModel(
        chosenModel,
        thinkingSelect?.value || selectedThinking
      );

      await Storage.set({
        gemini_model: chosenModel,
        gemini_thinking_level: chosenThinking,
        mentari_kuesioner_preference: selectedKuesPref
      });

      await AutoPilotState.set({
        active: true,
        currentIndex: 0,
        cooldownSec: 0,
        queue: activeValidQueue,
        startedAt: Date.now(),
        paused: false,
        total: activeValidQueue.length,
        model: chosenModel,
        thinkingLevel: chosenThinking,
        kuesionerPreference: selectedKuesPref,
        mode: selectedMode,
        courseScope: courseSelect?.value || 'all',
        coursesMeta: coursesWithPending
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
    if (this.evalFilter === 'ready') {
      filtered = filtered.filter(e => e._resolvedStatus?.status === 'READY');
    } else if (this.evalFilter === 'waiting_forum' || this.evalFilter === 'waiting_prereq') {
      filtered = filtered.filter(e => ['WAITING_FORUM', 'FORUM_NOT_OPEN', 'WAITING_POSTTEST', 'WAITING_PRETEST'].includes(e._resolvedStatus?.status));
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
        const filterLabels = {
          ready: 'siap dikerjakan',
          waiting_forum: 'tertahan prasyarat',
          waiting_prereq: 'tertahan prasyarat',
          done: 'sudah selesai',
          pending: 'belum dikerjakan'
        };
        const filterLabel = filterLabels[this.evalFilter] || 'sesuai filter';
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
      const readyInCourse = group.items.filter(e => e._resolvedStatus?.status === 'READY').length;
      const waitingPrereqInCourse = group.items.filter(e => ['WAITING_FORUM', 'FORUM_NOT_OPEN', 'WAITING_POSTTEST', 'WAITING_PRETEST'].includes(e._resolvedStatus?.status)).length;
      const doneInCourse = group.items.filter(e => e.completion).length;
      const isExpanded = this.expandedCourses.has(courseCode);

      let badgesHtml = '';
      if (doneInCourse === group.items.length) {
        badgesHtml = `<span class="badge badge-done">Selesai Semua</span>`;
      } else {
        if (readyInCourse > 0) {
          badgesHtml += `<span class="badge badge-ready">${readyInCourse} Siap</span>`;
        }
        if (waitingPrereqInCourse > 0) {
          badgesHtml += `<span class="badge badge-waiting-forum">${waitingPrereqInCourse} Tertahan</span>`;
        }
        const otherPending = group.items.length - doneInCourse - readyInCourse - waitingPrereqInCourse;
        if (otherPending > 0 && readyInCourse === 0 && waitingPrereqInCourse === 0) {
          badgesHtml += `<span class="badge badge-pending">${otherPending} Belum</span>`;
        }
      }

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
          ${badgesHtml}
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

          const st = e._resolvedStatus || this._resolveEvalStatus(e, group.items);

          let btnHtml = '';
          if (st.status === 'DONE') {
            btnHtml = `<span class="eval-btn-action eval-btn-done">Selesai</span>`;
          } else if (st.isForumAction && st.forumUrl) {
            btnHtml = `<a class="eval-btn-action eval-btn-goto-forum" target="_self" href="${st.forumUrl}" title="Buka forum diskusi pertemuan ini">${st.buttonLabel}</a>`;
          } else if (st.canExecute) {
            const url = e.type === 'KUESIONER'
              ? `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/kuesioner/${encodeURIComponent(e.sectionCode || e.subId)}`
              : `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}/exam/${e.subId}`;
            btnHtml = `<a class="eval-btn-action eval-btn-ready" target="_self" href="${url}">${st.buttonLabel}</a>`;
          } else {
            btnHtml = `<span class="eval-btn-action ${st.buttonClass || 'eval-btn-blocked'}" title="${st.reason || 'Terkunci'}">${st.buttonLabel}</span>`;
          }

          const hintHtml = st.reason ? ` &bull; <span class="eval-status-hint ${st.hintClass || ''}">${st.reason}</span>` : '';
          const scoreHtml = (e.completion && e.type !== 'KUESIONER' && e.subId)
            ? `<span class="eval-quiz-score" data-quiz-id="${escapeHtml(e.subId)}"></span>`
            : '';

          itemDiv.innerHTML = `
            <div class="eval-item-info">
              <div class="eval-item-title">
                ${typeIcons[e.type] || ''}
                ${typeLabels[e.type] || e.type}
                <span class="badge ${st.badgeClass}">${st.badgeLabel}</span>
              </div>
              <div class="eval-item-meta">${e.name} &bull; ${secName}${hintHtml}${scoreHtml}</div>
            </div>
            ${btnHtml}
          `;
          content.appendChild(itemDiv);
        });
      }

      if (isExpanded) {
        this._hydrateQuizResultsForCourse(courseCode, content);
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
          this._hydrateQuizResultsForCourse(courseCode, content);
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

    const fetchGen = this._fetchGeneration;

    this._currentFetchPromise = (async () => {
      const forumContainer = this.shadow?.getElementById('forum-list-container');
      const courseContainer = this.shadow?.getElementById('course-list-container');
      const studentContainer = this.shadow?.getElementById('student-list-container');

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
            if (studentContainer) studentContainer.innerHTML = notFoundHtml;

            const handleRetry = async () => {
              UnpamAuth._cachedToken = null;
              await this._loadCoursesAndForums();
            };
            forumContainer.querySelector('#btn-retry-scan')?.addEventListener('click', handleRetry);
            courseContainer?.querySelector('#btn-retry-scan')?.addEventListener('click', handleRetry);
            studentContainer?.querySelector('#btn-retry-scan')?.addEventListener('click', handleRetry);
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
            if (studentContainer && (!this.students || this.students.length === 0)) {
              studentContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#f59e0b;">Sesi perlu disegarkan untuk memuat daftar mahasiswa.</div>';
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
          this.hasSyncedCourseDetails = true;
          this.courseDetails = {};
          this.students = [];
          if (!silent) {
            if (forumContainer) forumContainer.innerHTML = '<div class="empty-state">Tidak ada forum aktif saat ini.</div>';
            if (courseContainer) courseContainer.innerHTML = '<div class="empty-state">Tidak ada mata kuliah aktif.</div>';
            if (studentContainer) studentContainer.innerHTML = '<div class="empty-state">Tidak ada data mahasiswa.</div>';
          }
          return;
        }

        // Render courses jika modal sedang terbuka
        if (this.isOpen) {
          this._renderCourses(list);
        }

        const forumItems = [];
        const evalItems = [];
        const courseDetailsMap = {};
        const studentSourceEntries = [];
        const chunkSize = 3;

        const storeComp = await Storage.get('mentari_completed_quiz_ids');
        const completedQuizIds = Array.isArray(storeComp?.mentari_completed_quiz_ids) ? storeComp.mentari_completed_quiz_ids : [];
        const staleCompletedQuizIds = new Set();

        for (let i = 0; i < list.length; i += chunkSize) {
          const chunk = list.slice(i, i + chunkSize);
          await Promise.allSettled(chunk.map(async (c) => {
            const courseCode = c.kode_course || c.kode || c.course_code || c.id;
            const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || 'Mata Kuliah';
            let courseLecturer = '';
            const rawDosen = c.nama_dosen || c.dosen || c.dosen_pengampu || c.pengampu || c.lecturer;
            if (typeof rawDosen === 'string' && rawDosen.trim()) {
              courseLecturer = rawDosen.trim();
            } else if (Array.isArray(rawDosen) && rawDosen.length > 0) {
              courseLecturer = rawDosen.map(d => typeof d === 'string' ? d : (d.nama || d.name || d.fullname || '')).filter(Boolean).join(', ');
            } else if (rawDosen && typeof rawDosen === 'object') {
              courseLecturer = (rawDosen.nama || rawDosen.name || rawDosen.fullname || '').trim();
            }

            try {
              const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(courseCode)}`, options);
              if (!cRes.ok) {
                if (this.courseDetails[courseCode]) {
                  courseDetailsMap[courseCode] = this.courseDetails[courseCode];
                }
                return;
              }
              const cData = await cRes.json();
              const parsedDetail = extractCourseDetail(c, cData);
              courseDetailsMap[courseCode] = parsedDetail;
              if (Array.isArray(cData?.peserta)) {
                studentSourceEntries.push({
                  courseCode,
                  courseTitle: parsedDetail.title,
                  peserta: cData.peserta
                });
              }
              if (!courseLecturer && cData && typeof cData === 'object') {
                const cRawDosen = cData.nama_dosen || cData.dosen || cData.dosen_pengampu || cData.pengampu;
                if (typeof cRawDosen === 'string' && cRawDosen.trim()) {
                  courseLecturer = cRawDosen.trim();
                } else if (Array.isArray(cRawDosen) && cRawDosen.length > 0) {
                  courseLecturer = cRawDosen.map(d => typeof d === 'string' ? d : (d.nama || d.name || d.fullname || '')).filter(Boolean).join(', ');
                } else if (cRawDosen && typeof cRawDosen === 'object') {
                  courseLecturer = (cRawDosen.nama || cRawDosen.name || cRawDosen.fullname || '').trim();
                }
              }
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
                  const kt = String(sub.kode_template || sub.template || sub.type || sub.tipe || sub.kode_sub_section || '').trim().toUpperCase();
                  const subTitle = String(sub.nama_sub_section || sub.judul || sub.title || sub.name || sub.deskripsi || '').toLowerCase();
                  let resolvedType = null;
                  if (kt === 'PRE_TEST' || kt === 'PRETEST' || subTitle.includes('pre-test') || subTitle.includes('pre test') || subTitle.includes('pretest')) {
                    resolvedType = 'PRE_TEST';
                  } else if (kt === 'POST_TEST' || kt === 'POSTTEST' || subTitle.includes('post-test') || subTitle.includes('post test') || subTitle.includes('posttest')) {
                    resolvedType = 'POST_TEST';
                  } else if (
                    kt.includes('KUES') || kt.includes('KUIS') || kt.includes('SURV') || kt.includes('ANGKET') || kt.includes('EVAL') || kt.includes('EDOM') ||
                    subTitle.includes('kuesioner') || subTitle.includes('kuisioner') || subTitle.includes('evaluasi') || subTitle.includes('angket') || subTitle.includes('survei') || subTitle.includes('survey') || subTitle.includes('edom')
                  ) {
                    resolvedType = 'KUESIONER';
                  }

                  const validSubId = sub.id || sub._id || sub.id_sub_section || sub.sub_id || (resolvedType ? `${resolvedType}_${meetingNum || section.urutan || 'sec'}` : null);

                  if (resolvedType && validSubId) {
                    const isLocked = !!(sub.warningAlert && sub.warningAlert.length > 0);
                    const isPostTestAlert = isLocked && /post[- ]?test/i.test(sub.warningAlert);

                    // Penentuan completion akurat:
                    // Jika KUESIONER masih mengeluhkan post-test (warningAlert aktif), KUESIONER PASTI BELUM SELESAI!
                    let isLmsCompleted = false;
                    if (resolvedType === 'KUESIONER' && isPostTestAlert) {
                      isLmsCompleted = false;
                    } else if (resolvedType === 'KUESIONER') {
                      // Kuesioner tidak memiliki nilai/score ujian, hanya status penyelesaian eksplisit
                      isLmsCompleted = Boolean(
                        sub.completion === true ||
                        sub.completion === 1 ||
                        sub.completion === '1' ||
                        sub.completion === 'true' ||
                        sub.is_completed === true ||
                        sub.completed === true ||
                        sub.is_done === true ||
                        sub.status === 'completed' ||
                        sub.status === 'done' ||
                        (Array.isArray(sub.history) && sub.history.length > 0)
                      );
                    } else {
                      // Pre-Test & Post-Test
                      isLmsCompleted = Boolean(
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
                    }

                    // Self-healing: jika status resmi di UNPAM belum selesai, buang ID dari storage lokal
                    if (!isLmsCompleted && completedQuizIds.includes(validSubId)) {
                      staleCompletedQuizIds.add(validSubId);
                    }

                    evalItems.push({
                      courseCode,
                      courseTitle,
                      sectionName,
                      meetingNum,
                      sectionCode: section.kode_section || section.nama_section || validSubId,
                      subId: validSubId,
                      type: resolvedType,
                      name: sub.nama_sub_section || sub.judul || resolvedType,
                      completion: isLmsCompleted,
                      locked: isLocked,
                      lockReason: sub.warningAlert || ''
                    });
                  }
                }
              }

              // Evaluasi seluruh forum candidate untuk mata kuliah ini secara paralel
              const courseForumItems = [];
              const courseSectionForums = {};
              await Promise.allSettled(forumCandidates.map(async (fc) => {
                const { sub, meetingNum, sectionName } = fc;
                const isLmsCompleted = Boolean(sub.completion === true);
                let isAnswered = isLmsCompleted;
                let hasTopics = true;

                let topicDetails = [];
                if (!isLmsCompleted) {
                  try {
                    const topicRes = await fetch(`https://mentari.unpam.ac.id/api/forum/topic/${sub.id}`, options);
                    if (topicRes.ok) {
                      const topicData = await topicRes.json();
                      const topics = topicData.topics || topicData.data || (Array.isArray(topicData) ? topicData : []);
                      hasTopics = topics.length > 0;
                      if (hasTopics) {
                        topicDetails = topics.map(t => ({
                          id: t.id,
                          title: t.judul || t.title || t.name || '',
                          message: t.konten || t.deskripsi || t.pesan || t.message || t.content || t.body || ''
                        }));
                      }

                      if (hasTopics && (this._studentName || this._studentNim)) {
                        const searchName = (this._studentName || '').toLowerCase();
                        const searchNim = (this._studentNim || '').toLowerCase();

                        // Fetch replies untuk seluruh topik secara paralel
                        const replyResults = await Promise.allSettled(topics.map(async (topic) => {
                          try {
                            const replyRes = await fetch(`https://mentari.unpam.ac.id/api/forum/reply/${topic.id}`, options);
                            if (replyRes.ok) {
                              const replyData = await replyRes.json();
                              const extractedQuestion = this._extractQuestionFromAny(replyData, topic.id);
                              if (extractedQuestion) {
                                const td = topicDetails.find(t => t.id === topic.id);
                                if (td && !td.message) td.message = extractedQuestion;
                              }
                              const replies = replyData.replies || replyData.data || (Array.isArray(replyData) ? replyData : []);
                              if (!courseLecturer) {
                                for (const r of replies) {
                                  if (!r || typeof r !== 'object') continue;
                                  const rAuthor = (r.fullname || r.nama || r.author || (r.user && (r.user.fullname || r.user.nama || r.user.name)) || '').trim();
                                  const isDosenRole = r.role === 'dosen' || r.is_dosen === true || r.is_dosen === 1;
                                  const hasDegree = /s\.pd|m\.pd|dr\.|prof\.|m\.kom|s\.kom|m\.m|s\.e|m\.si|m\.hum|m\.t|s\.t|ph\.d/i.test(rAuthor);
                                  if ((isDosenRole || hasDegree) && rAuthor) {
                                    courseLecturer = rAuthor;
                                    break;
                                  }
                                }
                              }
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

                const meetingKey = this._getMeetingKey(meetingNum, sectionName);
                courseSectionForums[meetingKey] = {
                  forumId: sub.id,
                  forumName: sub.nama_sub_section || sub.judul || 'Forum Diskusi',
                  hasTopics,
                  completion: isLmsCompleted,
                  answered: isAnswered,
                  sectionName,
                  meetingNum
                };

                if (hasTopics) {
                  if (meetingNum !== null) activeMeetingNums.add(meetingNum);
                  courseForumItems.push({
                    courseCode,
                    courseTitle,
                    courseLecturer: courseLecturer || '',
                    sectionName,
                    meetingNum,
                    forumId: sub.id,
                    forumName: sub.nama_sub_section || sub.judul || 'Forum Diskusi',
                    completion: isLmsCompleted,
                    answered: isAnswered,
                    topics: topicDetails
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
                unavailableRanges,
                unavailableMeetings,
                sectionForums: courseSectionForums
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

        if (fetchGen !== this._fetchGeneration) return;

        this.activeForums = forumItems;
        this.evaluations = evalItems;
        this.courseDetails = courseDetailsMap;
        this.hasSyncedCourseDetails = true;
        if (studentSourceEntries.length > 0 || list.length === 0) {
          this.students = extractUniqueStudents(studentSourceEntries);
        }
        this._lastSyncedAt = Date.now();

        // Render jika modal sedang terbuka
        if (this.isOpen) {
          this._renderForums(forumItems, list);
          this._renderEvaluations(evalItems);
          this._renderCourses(list);
          this._renderStudents(this.students);
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
            courseDetails: this.courseDetails,
            students: this.students,
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
          if (studentContainer) studentContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
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