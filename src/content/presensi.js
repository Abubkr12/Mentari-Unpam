/**
 * Mentari Mod Modern Edition - Presensi Tracker (MyUnpam)
 * Menampilkan rekap kehadiran perkuliahan mahasiswa secara real-time via API resmi MyUnpam.
 * Dilengkapi:
 * 1. Foto profil asli mahasiswa dari portal MyUnpam
 * 2. Dua Penghitungan Kehadiran (Kehadiran Berjalan Realistis vs Progres Akumulasi Semester)
 * 3. 75% UAS Target Gauge & Marker
 * 4. Unified Floating Dock
 * 5. Single-Open Exclusive Accordion
 */

import { Storage } from '../utils/storage.js';
import { UnpamAuth } from '../utils/unpam-auth.js';
import { Toast } from '../utils/toast.js';

class PresensiTracker {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.coursesData = [];
    this.mentariCache = null;
    this.studentPhotoUrl = null;
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] Presensi Tracker & Unified Dock aktif di MyUnpam.');

    // Pasang sniffer auth
    UnpamAuth.installLiveSniffer();

    // Injeksi main-sniffer jika belum ada
    this._injectMainSniffer();

    // Dengarkan event eksternal pembuka modal
    window.addEventListener('mentari-presensi-popup', () => {
      this.openModal();
    });

    // Pasang Unified Floating Dock di pojok kanan bawah MyUnpam
    this._injectUnifiedDock();

    // Coba scan foto profil mahasiswa secara preemptive dari DOM MyUnpam
    this._tryExtractStudentPhoto();
  }

  _injectMainSniffer() {
    if (document.getElementById('mentari-main-sniffer')) return;
    try {
      const isDist = chrome.runtime.getURL('manifest.json').includes('/dist/') || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith('dist/');
      const s = document.createElement('script');
      s.id = 'mentari-main-sniffer';
      s.src = chrome.runtime.getURL(isDist ? 'content/main-sniffer.js' : 'dist/content/main-sniffer.js');
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /**
   * Mengambil URL foto profil mahasiswa dari DOM MyUnpam (sidebar / nav / user card)
   */
  _tryExtractStudentPhoto(courseObj = {}) {
    // 1. Cek dari field API jika tersedia
    const apiCandidate = courseObj.foto || courseObj.foto_url || courseObj.url_foto ||
                         courseObj.foto_mahasiswa || courseObj.avatar || courseObj.photo;
    if (apiCandidate && typeof apiCandidate === 'string' && (apiCandidate.startsWith('http') || apiCandidate.startsWith('/'))) {
      this.studentPhotoUrl = apiCandidate;
      return apiCandidate;
    }

    if (this.studentPhotoUrl) return this.studentPhotoUrl;

    if (typeof document !== 'undefined') {
      // 2. Scan gambar di sidebar profil MyUnpam (seperti pada sidebar kiri)
      const sidebarImgs = document.querySelectorAll('.sidebar img, aside img, nav img, .user-panel img, .profile-user-img, img.rounded-circle, img.rounded-full');
      for (const img of sidebarImgs) {
        const src = img.currentSrc || img.src || '';
        if (!src) continue;
        const sLower = src.toLowerCase();
        if (sLower.includes('logo') || sLower.includes('icon') || sLower.includes('.svg') || sLower.includes('banner')) {
          continue;
        }
        if (img.naturalWidth >= 28 || img.getBoundingClientRect().width >= 28) {
          this.studentPhotoUrl = src;
          return src;
        }
      }

      // 3. Scan semua img di halaman MyUnpam yang mengarah ke storage / foto / avatar
      const allImgs = document.querySelectorAll('img');
      for (const img of allImgs) {
        const src = img.currentSrc || img.src || '';
        const alt = (img.alt || '').toLowerCase();
        const sLower = src.toLowerCase();
        if (sLower.includes('logo') || sLower.includes('icon') || sLower.includes('.svg')) continue;
        if (
          sLower.includes('/storage/') || sLower.includes('/foto') || sLower.includes('/mahasiswa') ||
          sLower.includes('/avatar') || sLower.includes('/upload') || sLower.includes('/profile') ||
          alt.includes('foto') || alt.includes('profil') || alt.includes('mahasiswa')
        ) {
          this.studentPhotoUrl = src;
          return src;
        }
      }

      // 4. Scan background-image di container profil
      const bgCandidates = document.querySelectorAll('.sidebar [style*="background-image"], aside [style*="background-image"], .user-panel [style*="background-image"]');
      for (const el of bgCandidates) {
        const bg = el.style.backgroundImage || '';
        const m = bg.match(/url\(["']?([^"']+)["']?\)/);
        if (m && m[1] && !m[1].includes('logo') && !m[1].includes('.svg')) {
          this.studentPhotoUrl = m[1];
          return m[1];
        }
      }
    }

    return null;
  }

  _injectUnifiedDock() {
    if (document.getElementById('mentari-myunpam-dock-host')) return;

    // Bersihkan legacy floating button jika sempat terpasang
    document.getElementById('mentari-presensi-trigger-host')?.remove();
    document.getElementById('mentari-survey-btn-host')?.remove();

    const host = document.createElement('div');
    host.id = 'mentari-myunpam-dock-host';
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = '2147483640';

    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .dock-container {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(13, 17, 28, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(212, 175, 55, 0.28);
        border-radius: 9999px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.15);
        user-select: none;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .dock-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 12px rgba(212, 175, 55, 0.3);
      }
      .dock-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px 4px 8px;
        background: rgba(212, 175, 55, 0.12);
        border: 1px solid rgba(212, 175, 55, 0.25);
        border-radius: 9999px;
      }
      .dock-brand-icon {
        color: #f59e0b;
        display: flex;
        align-items: center;
      }
      .dock-brand-text {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .dock-divider {
        width: 1px;
        height: 18px;
        background: rgba(255, 255, 255, 0.12);
      }
      .dock-btn {
        border: none;
        padding: 8px 14px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
      }
      .dock-btn-presensi {
        background: rgba(99, 102, 241, 0.18);
        border: 1px solid rgba(99, 102, 241, 0.35);
        color: #e0e7ff;
      }
      .dock-btn-presensi:hover {
        background: #4f46e5;
        border-color: #6366f1;
        color: #fff;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
      }
      .dock-btn-survey {
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #d1fae5;
      }
      .dock-btn-survey:hover {
        background: #059669;
        border-color: #10b981;
        color: #fff;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
      }
      .dock-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spinning {
        animation: spin 0.8s linear infinite;
      }
    `;

    const container = document.createElement('div');
    container.className = 'dock-container';
    container.innerHTML = `
      <div class="dock-brand">
        <span class="dock-brand-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </span>
        <span class="dock-brand-text">MENTARI</span>
      </div>
      <div class="dock-divider"></div>
      <button class="dock-btn dock-btn-presensi" id="btn-dock-presensi" type="button" title="Buka Rekap Kehadiran Kuliah">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Rekap Presensi</span>
      </button>
      <button class="dock-btn dock-btn-survey" id="btn-dock-survey" type="button" title="Auto-Isi Survei Akademik MyUnpam">
        <svg id="survey-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span id="survey-label">Auto-Isi Survei</span>
      </button>
    `;

    // Presensi button click
    const btnPresensi = container.querySelector('#btn-dock-presensi');
    btnPresensi.addEventListener('click', () => this.openModal());

    // Auto-survey button click
    const btnSurvey = container.querySelector('#btn-dock-survey');
    const surveyLabel = container.querySelector('#survey-label');
    const surveyIcon = container.querySelector('#survey-icon');

    btnSurvey.addEventListener('click', async () => {
      btnSurvey.disabled = true;
      surveyLabel.textContent = 'Mengisi...';
      surveyIcon.classList.add('spinning');

      // Siarkan event ke QuickSurvey assistant
      window.dispatchEvent(new CustomEvent('mentari-survey-trigger'));

      setTimeout(() => {
        btnSurvey.disabled = false;
        surveyLabel.textContent = 'Auto-Isi Survei';
        surveyIcon.classList.remove('spinning');
      }, 2000);
    });

    shadow.appendChild(style);
    shadow.appendChild(container);
    document.body.appendChild(host);
  }

  async openModal() {
    if (!this.host) {
      this._createModal();
    }
    const overlay = this.shadow.querySelector('.overlay');
    overlay.classList.add('open');
    await this._loadJadwal();
  }

  _createModal() {
    this.host = document.createElement('div');
    this.host.id = 'mentari-presensi-modal-host';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      
      /* Scrollbar halus modern */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(212, 175, 55, 0.4);
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 7, 15, 0.82);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
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
        width: 860px;
        max-width: 95vw;
        height: 700px;
        max-height: 90vh;
        background: #0d111c;
        border: 1px solid rgba(212, 175, 55, 0.28);
        border-radius: 18px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f1f5f9;
        position: relative;
      }
      .header {
        padding: 16px 22px;
        background: rgba(15, 23, 42, 0.85);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        user-select: none;
      }
      .title-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .title-icon-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(99, 102, 241, 0.2));
        border: 1px solid rgba(212, 175, 55, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fbbf24;
      }
      .title-text {
        font-size: 15px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.2px;
      }
      .title-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #34d399;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: default;
      }
      .btn-refresh {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #cbd5e1;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .btn-refresh:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border-color: rgba(212, 175, 55, 0.4);
      }
      .close-btn {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 6px;
        display: flex;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .close-btn:hover {
        color: #fff;
        background: rgba(239, 68, 68, 0.2);
      }

      /* Hero Profile & Dual Attendance Metrics */
      .profile-hero {
        padding: 18px 22px;
        background: rgba(15, 23, 42, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .profile-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .profile-student {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .student-avatar {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(79, 70, 229, 0.3));
        border: 2px solid #f59e0b;
        box-shadow: 0 0 14px rgba(245, 158, 11, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fbbf24;
        flex-shrink: 0;
        overflow: hidden;
        position: relative;
      }
      .student-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
      .student-info {
        flex: 1;
        min-width: 0;
      }
      .student-name {
        font-size: 16px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.35;
        margin-bottom: 6px;
        word-break: break-word;
      }
      .student-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      .meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
      }
      .meta-pill b {
        color: #fff;
        font-weight: 700;
      }

      /* Dual Attendance Metrics Grid */
      .attendance-dual-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 680px) {
        .attendance-dual-grid {
          grid-template-columns: 1fr;
        }
      }
      .att-box {
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .att-box.primary {
        border-color: rgba(16, 185, 129, 0.35);
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0.02));
      }
      .att-box.secondary {
        border-color: rgba(212, 175, 55, 0.25);
        background: linear-gradient(135deg, rgba(212, 175, 55, 0.04), rgba(255, 255, 255, 0.02));
      }
      .att-box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .att-box-title {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.6px;
        color: #94a3b8;
      }
      .att-badge-tag {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .tag-active {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.4);
      }
      .tag-target {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.4);
      }

      .att-metric-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .att-percentage {
        font-size: 24px;
        font-weight: 900;
        line-height: 1;
      }
      .att-percentage.safe { color: #34d399; }
      .att-percentage.warn { color: #fbbf24; }
      .att-percentage.danger { color: #f87171; }
      .att-percentage.neutral { color: #94a3b8; }
      .att-counts {
        font-size: 11px;
        color: #94a3b8;
      }
      .att-counts b {
        color: #fff;
      }
      
      .att-status-line {
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .att-status-line.safe { color: #34d399; }
      .att-status-line.warn { color: #fbbf24; }
      .att-status-line.danger { color: #f87171; }
      .att-status-line.neutral { color: #94a3b8; }

      /* Progress Track */
      .att-progress-track {
        height: 7px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        position: relative;
        overflow: hidden;
      }
      .att-progress-fill {
        height: 100%;
        border-radius: 9999px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .att-progress-fill.safe {
        background: linear-gradient(90deg, #10b981, #34d399);
      }
      .att-progress-fill.warn {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }
      .att-progress-fill.danger {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }
      .att-progress-fill.semester {
        background: linear-gradient(90deg, #6366f1, #818cf8);
      }

      /* Pinned 75% UAS Marker */
      .att-track-wrapper {
        position: relative;
        padding-top: 14px;
      }
      .uas-marker {
        position: absolute;
        left: 75%;
        top: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
      }
      .uas-marker-tag {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        font-size: 8px;
        font-weight: 800;
        color: #fbbf24;
        background: rgba(245, 158, 11, 0.25);
        border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 0 4px;
        border-radius: 3px;
        white-space: nowrap;
      }
      .uas-marker-line {
        position: absolute;
        top: 14px;
        bottom: 0;
        width: 2px;
        background: #f59e0b;
        box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);
      }
      .att-note-sub {
        font-size: 10px;
        color: #64748b;
        margin-top: 6px;
      }

      /* Content Area */
      .content {
        padding: 18px 22px;
        overflow-y: auto;
        flex: 1;
        min-height: 0; /* CRITICAL: Mencegah overflow layout bug pada nested flex */
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      /* Course Card - Anti Flex-Shrink Bug */
      .course-card {
        flex-shrink: 0 !important; /* CRITICAL FIX: Mencegah card lain menciut gepeng saat accordion dibuka */
        width: 100%;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .course-card:hover {
        border-color: rgba(212, 175, 55, 0.35);
        background: rgba(255, 255, 255, 0.04);
      }
      .course-card.is-open {
        border-color: rgba(99, 102, 241, 0.5);
        background: rgba(255, 255, 255, 0.045);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
      }
      .course-header {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
        gap: 12px;
      }
      .course-title-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }
      .course-name {
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.4;
      }
      .course-stats-badges {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        line-height: 1.4;
      }
      .stat-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.35;
      }
      .stat-pill b { font-weight: 700; }
      .stat-pill.sks { background: rgba(148, 163, 184, 0.12); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.2); }
      .stat-pill.hadir { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
      .stat-pill.alpa { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
      .stat-pill.berjalan { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); }
      .stat-pill.total { background: rgba(99, 102, 241, 0.12); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.25); }

      .course-header-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .badge-rate {
        font-size: 12px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 8px;
        white-space: nowrap;
      }
      .badge-rate-high {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .badge-rate-mid {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .badge-rate-low {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .badge-rate-neutral {
        background: rgba(100, 116, 139, 0.15);
        color: #94a3b8;
        border: 1px solid rgba(100, 116, 139, 0.3);
      }
      .chevron-icon {
        color: #94a3b8;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Meeting Details Grid */
      .meeting-details {
        padding: 14px 18px 18px;
        display: none;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .meeting-details.open {
        display: block;
      }
      .meeting-grid-title {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .meeting-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 8px;
      }
      .meeting-pill {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .meeting-pill.hadir {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.28);
        color: #34d399;
      }
      .meeting-pill.alpa {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.28);
        color: #f87171;
      }
      .meeting-pill.pending {
        background: rgba(100, 116, 139, 0.08);
        border-color: rgba(100, 116, 139, 0.2);
        color: #64748b;
      }
      .pill-status-text {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 700;
      }

      /* Loader & Empty states */
      .loader-container {
        text-align: center;
        padding: 50px 20px;
        color: #94a3b8;
        font-size: 13px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .loader-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(212, 175, 55, 0.2);
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .btn-scan {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        border: none;
        padding: 9px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        transition: opacity 0.2s;
      }
      .btn-scan:hover {
        opacity: 0.9;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal" id="presensi-modal-dialog">
        <div class="header" id="presensi-modal-header">
          <div class="title-group">
            <div class="title-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <div class="title-text">Rekap Kehadiran Kuliah MyUnpam</div>
            </div>
            <span class="title-badge">Live Sync</span>
          </div>
          <div class="header-actions">
            <button class="btn-refresh" id="btn-refresh-presensi" type="button">
              <svg id="refresh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Muat Ulang
            </button>
            <button class="close-btn" id="btn-close" aria-label="Tutup Modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div id="presensi-info-bar"></div>
        <div class="content" id="presensi-list">
          <div class="loader-container">
            <div class="loader-spinner"></div>
            <div>Memuat data jadwal & presensi dari server MyUnpam...</div>
          </div>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    const close = () => overlay.classList.remove('open');
    this.shadow.getElementById('btn-close').addEventListener('click', close);
    
    // Refresh button
    const refreshBtn = this.shadow.getElementById('btn-refresh-presensi');
    const refreshIcon = this.shadow.getElementById('refresh-icon');
    refreshBtn.addEventListener('click', async () => {
      refreshIcon.classList.add('spinning');
      UnpamAuth._cachedToken = null;
      await this._loadJadwal();
      refreshIcon.classList.remove('spinning');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Pasang Draggable pada modal header
    const modalEl = this.shadow.getElementById('presensi-modal-dialog');
    const headerEl = this.shadow.getElementById('presensi-modal-header');
    this._makeDraggable(modalEl, headerEl);
  }

  _makeDraggable(modalEl, handleEl) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a, input, select')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = modalEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      modalEl.style.position = 'fixed';
      modalEl.style.left = `${initialLeft}px`;
      modalEl.style.top = `${initialTop}px`;
      modalEl.style.margin = '0';
      modalEl.style.transform = 'none';

      const onMouseMove = (ev) => {
        if (!isDragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = window.innerWidth - rect.width - 10;
        const maxTop = window.innerHeight - rect.height - 10;

        newLeft = Math.max(10, Math.min(maxLeft, newLeft));
        newTop = Math.max(10, Math.min(maxTop, newTop));

        modalEl.style.left = `${newLeft}px`;
        modalEl.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  async _loadJadwal() {
    const listEl = this.shadow.getElementById('presensi-list');
    const infoBarEl = this.shadow.getElementById('presensi-info-bar');
    listEl.innerHTML = `
      <div class="loader-container">
        <div class="loader-spinner"></div>
        <div>Menghubungkan ke API MyUnpam...</div>
      </div>
    `;
    infoBarEl.innerHTML = '';

    try {
      let options = await UnpamAuth.getFetchOptions();

      if (!options.headers['Authorization']) {
        window.dispatchEvent(new CustomEvent('mentari-request-token-sync'));
        await new Promise(r => setTimeout(r, 600));
        options = await UnpamAuth.getFetchOptions();
      }

      if (!options.headers['Authorization']) {
        listEl.innerHTML = `
          <div class="loader-container" style="color:#fbbf24;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div style="font-weight:700; font-size:15px; color:#fff;">Sesi Login Belum Terdeteksi</div>
            <div style="font-size:12px; color:#94a3b8; max-width:440px; line-height:1.5;">
              Silakan klik menu perkuliahan/presensi di halaman MyUnpam atau refresh tab agar ekstensi dapat menyadap token aktif kamu secara otomatis.
            </div>
            <button class="btn-scan" id="btn-rescan-token">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Pindai Sesi Sekarang
            </button>
          </div>
        `;
        this.shadow.getElementById('btn-rescan-token')?.addEventListener('click', () => {
          UnpamAuth._cachedToken = null;
          this._loadJadwal();
        });
        return;
      }

      // Ambil cache Mentari jika ada untuk sinkronisasi ketersediaan forum/modul
      try {
        const token = await UnpamAuth.getAuthToken();
        const userId = UnpamAuth.getUserIdentifier(token);
        const stored = await Storage.get([`mentari_cached_data_${userId}`, 'mentari_cached_courses', 'mentari_cached_forums']);
        this.mentariCache = stored[`mentari_cached_data_${userId}`] || {};
      } catch (e) {
        this.mentariCache = {};
      }

      const res = await fetch('https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-kuliah', {
        method: 'GET',
        headers: options.headers,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengambil jadwal presensi.`);
      }

      const data = await res.json();
      const rawCourses = Array.isArray(data) ? data : (data.data || []);

      if (rawCourses.length === 0) {
        listEl.innerHTML = `
          <div class="loader-container">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div style="color:#cbd5e1; font-weight:600;">Tidak ada jadwal kuliah aktif ditemukan pada semester ini.</div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = `
        <div class="loader-container">
          <div class="loader-spinner"></div>
          <div>Memuat rincian kehadiran tiap pertemuan...</div>
        </div>
      `;

      // Coba scan foto profil mahasiswa dari data jadwal atau DOM
      this._tryExtractStudentPhoto(rawCourses[0] || {});

      // Ambil rincian pertemuan untuk setiap mata kuliah secara paralel
      const enrichedCourses = await Promise.all(rawCourses.map(async (c) => {
        const idKelas = c.id_kelas || c.id;
        const idMataKuliah = c.id_mata_kuliah || c.id_mk;
        let pertemuan = [];

        if (idKelas && idMataKuliah) {
          try {
            const pRes = await fetch(`https://my.unpam.ac.id/api/presensi/mahasiswa/jadwal-pertemuan/${idKelas}/${idMataKuliah}`, {
              method: 'GET',
              headers: options.headers,
              credentials: 'include'
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              pertemuan = Array.isArray(pData) ? pData : (pData.data || []);
            }
          } catch (err) {
            console.log(`[Presensi] Info fetch pertemuan ${c.nama_mata_kuliah}:`, err.message);
          }
        }

        return {
          ...c,
          pertemuan
        };
      }));

      this.coursesData = enrichedCourses;
      this._renderPresensiDashboard(enrichedCourses);
    } catch (e) {
      listEl.innerHTML = `
        <div class="loader-container" style="color:#f87171;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style="font-weight:700;">Terjadi Kesalahan: ${e.message}</div>
        </div>
      `;
      Toast.error('Gagal mengambil data presensi: ' + e.message);
    }
  }

  _renderPresensiDashboard(courses) {
    const listEl = this.shadow.getElementById('presensi-list');
    const infoBarEl = this.shadow.getElementById('presensi-info-bar');

    // Mahasiswa profile
    const first = courses[0] || {};
    const nim = first.nim || '-';
    const namaMhs = first.nama_mahasiswa || '-';
    const semester = first.nama_semester_registrasi || first.semester || '-';

    // Scan ulang foto profil jika belum ada
    const photoUrl = this.studentPhotoUrl || this._tryExtractStudentPhoto(first);

    // Total SKS
    const totalSks = courses.reduce((acc, c) => acc + (Number(c.sks) || 0), 0);

    // Hitung dua jenis total:
    // 1. Kehadiran Berjalan (Sesi Aktif / Terlaksana) -> Acuan Utama Mahasiswa!
    // 2. Progres Akumulasi Semester (Target Penuh 105 Sesi)
    let totalSesiAktifSemua = 0;
    let totalHadirSemua = 0;
    let totalAlpaSemua = 0;
    let totalIzinSemua = 0;
    let totalPertemuanSemester = 0;

    courses.forEach(c => {
      const meetings = c.pertemuan || [];
      totalPertemuanSemester += meetings.length;

      meetings.forEach(m => {
        const s = (m.presensi_status || m.status || '').toLowerCase().trim();
        const isHadir = s === 'hadir' || s === 'h';
        const isAlpa = s === 'alpa' || s === 'tidak hadir' || s === 'a' || s === 'mangkir';
        const isIzinSakit = s === 'izin' || s === 'sakit' || s === 'i' || s === 's';

        if (isHadir) {
          totalHadirSemua++;
          totalSesiAktifSemua++;
        } else if (isAlpa) {
          totalAlpaSemua++;
          totalSesiAktifSemua++;
        } else if (isIzinSakit) {
          totalIzinSemua++;
          totalSesiAktifSemua++;
        }
      });
    });

    // 1. Persentase Kehadiran Berjalan (Acuan Nyata Mahasiswa)
    const totalPersentaseBerjalan = totalSesiAktifSemua > 0
      ? ((totalHadirSemua / totalSesiAktifSemua) * 100).toFixed(1)
      : '100.0';

    const numPctBerjalan = Number(totalPersentaseBerjalan);
    let uasStatusClass = 'safe';
    let uasStatusText = '✓ Syarat UAS Terpenuhi';

    if (numPctBerjalan >= 75) {
      uasStatusClass = 'safe';
      uasStatusText = '✓ Syarat UAS Terpenuhi (≥75%)';
    } else if (numPctBerjalan >= 70) {
      uasStatusClass = 'warn';
      uasStatusText = '⚠ Waspada Batas UAS (70–74%)';
    } else {
      uasStatusClass = 'danger';
      uasStatusText = '✕ Di Bawah Batas UAS (<75%)';
    }

    // 2. Persentase Progres Semester Penuh
    const totalPersentaseSemester = totalPertemuanSemester > 0
      ? ((totalHadirSemua / totalPertemuanSemester) * 100).toFixed(1)
      : '0.0';

    // Target minimal sesi hadir untuk memenuhi 75% UAS di akhir semester
    const targetUasSessions = Math.ceil(totalPertemuanSemester * 0.75);

    // Render Hero Profile & Dual Attendance Metrics
    infoBarEl.innerHTML = `
      <div class="profile-hero">
        <div class="profile-top-row">
          <div class="profile-student">
            <div class="student-avatar ${photoUrl ? 'has-photo' : ''}">
              ${photoUrl ? `
                <img src="${photoUrl}" alt="${namaMhs}" class="student-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="student-avatar-fallback" style="display:none; width:100%; height:100%; align-items:center; justify-content:center;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              ` : `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              `}
            </div>
            <div class="student-info">
              <div class="student-name" title="${namaMhs}">${namaMhs}</div>
              <div class="student-meta-row">
                <span class="meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="7" y1="9" x2="17" y2="9"></line>
                    <line x1="7" y1="13" x2="13" y2="13"></line>
                  </svg>
                  NIM: <b>${nim}</b>
                </span>
                <span class="meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  <b>${semester}</b>
                </span>
                <span class="meta-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <b>${courses.length} MK</b> (${totalSks} SKS)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="attendance-dual-grid">
          <!-- Card 1: Kehadiran Berjalan (Acuan Utama Mahasiswa) -->
          <div class="att-box primary">
            <div class="att-box-header">
              <span class="att-box-title">KEHADIRAN BERJALAN</span>
              <span class="att-badge-tag tag-active">Acuan Utama</span>
            </div>
            <div class="att-metric-row">
              <div class="att-percentage ${uasStatusClass}">${totalPersentaseBerjalan}%</div>
              <div class="att-counts"><b>${totalHadirSemua}</b> / ${totalSesiAktifSemua} Sesi Terlaksana</div>
            </div>
            <div class="att-status-line ${uasStatusClass}">
              ${uasStatusText} (Mangkir: ${totalAlpaSemua})
            </div>
            <div class="att-progress-track">
              <div class="att-progress-fill ${uasStatusClass}" style="width: ${Math.min(100, Math.max(0, numPctBerjalan))}%;"></div>
            </div>
            <div class="att-note-sub">Dihitung murni dari sesi yang sudah dibuka/berjalan di Mentari.</div>
          </div>

          <!-- Card 2: Progres Semester Penuh (Target Akhir) -->
          <div class="att-box secondary">
            <div class="att-box-header">
              <span class="att-box-title">PROGRES SEMESTER</span>
              <span class="att-badge-tag tag-target">Target Penuh</span>
            </div>
            <div class="att-metric-row">
              <div class="att-percentage" style="color:#cbd5e1;">${totalPersentaseSemester}%</div>
              <div class="att-counts"><b>${totalHadirSemua}</b> / ${totalPertemuanSemester} Sesi Semester</div>
            </div>
            <div class="att-status-line" style="color:#fbbf24;">
              Target 75% UAS: Minimal <b>${targetUasSessions} Sesi</b> Hadir
            </div>
            <div class="att-track-wrapper">
              <div class="uas-marker" title="Target Kelulusan Presensi UAS UNPAM (75%)">
                <span class="uas-marker-tag">75% UAS</span>
                <span class="uas-marker-line"></span>
              </div>
              <div class="att-progress-track">
                <div class="att-progress-fill semester" style="width: ${Math.min(100, Math.max(0, Number(totalPersentaseSemester)))}%;"></div>
              </div>
            </div>
            <div class="att-note-sub">Akumulasi sesi dari awal hingga akhir semester.</div>
          </div>
        </div>
      </div>
    `;

    // Render course cards
    listEl.innerHTML = '';
    courses.forEach((c, idx) => {
      const meetings = c.pertemuan || [];
      const totalMeetings = meetings.length;

      let hadirCount = 0;
      let alpaCount = 0;
      let izinCount = 0;
      let sesiAktifCourse = 0;

      meetings.forEach(m => {
        const s = (m.presensi_status || m.status || '').toLowerCase().trim();
        if (s === 'hadir' || s === 'h') {
          hadirCount++;
          sesiAktifCourse++;
        } else if (s === 'alpa' || s === 'tidak hadir' || s === 'a' || s === 'mangkir') {
          alpaCount++;
          sesiAktifCourse++;
        } else if (s === 'izin' || s === 'sakit' || s === 'i' || s === 's') {
          izinCount++;
          sesiAktifCourse++;
        }
      });

      // Persentase Berjalan untuk matkul ini
      const courseBerjalanPct = sesiAktifCourse > 0
        ? ((hadirCount / sesiAktifCourse) * 100).toFixed(1)
        : null;

      let badgeClass = 'badge-rate-neutral';
      let badgeLabel = 'Belum Ada Sesi';

      if (courseBerjalanPct !== null) {
        const numC = Number(courseBerjalanPct);
        badgeLabel = `${courseBerjalanPct}%`;
        if (numC >= 75) {
          badgeClass = 'badge-rate-high';
        } else if (numC >= 70) {
          badgeClass = 'badge-rate-mid';
        } else {
          badgeClass = 'badge-rate-low';
        }
      }

      const card = document.createElement('div');
      card.className = 'course-card';

      let meetingItemsHtml = '';
      if (meetings.length === 0) {
        meetingItemsHtml = `
          <div style="font-size:12px; color:#94a3b8; padding:12px 4px; display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Data rincian presensi per pertemuan belum diterbitkan oleh dosen kelas ini.
          </div>
        `;
      } else {
        meetingItemsHtml = `
          <div class="meeting-grid-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Rincian Status Kehadiran (${hadirCount} Hadir dari ${sesiAktifCourse} Sesi Berjalan, Total ${totalMeetings} Pertemuan)
          </div>
          <div class="meeting-grid">
            ${meetings.map((m, mIdx) => {
              const status = (m.presensi_status || m.status || '').toLowerCase().trim();
              let pillClass = 'pending';
              let label = 'Belum Tersedia';
              let iconSvg = `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              `;

              if (status === 'hadir' || status === 'h') {
                pillClass = 'hadir';
                label = 'Hadir';
                iconSvg = `
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                `;
              } else if (status === 'alpa' || status === 'tidak hadir' || status === 'a' || status === 'mangkir') {
                pillClass = 'alpa';
                label = 'Alpa';
                iconSvg = `
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                `;
              } else if (status === 'izin' || status === 'sakit' || status === 'i' || status === 's') {
                pillClass = 'pending';
                label = status.toUpperCase();
                iconSvg = `
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                `;
              } else if (status) {
                pillClass = 'pending';
                label = m.presensi_status || m.status;
              }

              return `
                <div class="meeting-pill ${pillClass}">
                  <span>P-${m.urutan || (mIdx + 1)}</span>
                  <span class="pill-status-text">${iconSvg} ${label}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="course-header" data-target="details-${idx}">
          <div class="course-title-group">
            <div class="course-name">${c.nama_mata_kuliah || c.mata_kuliah || 'Mata Kuliah'}</div>
            <div class="course-stats-badges">
              <span class="stat-pill sks">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                SKS: <b>${c.sks || '-'}</b>
              </span>
              <span class="stat-pill hadir">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Hadir: <b>${hadirCount}</b>
              </span>
              <span class="stat-pill alpa">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Mangkir: <b>${alpaCount}</b>
              </span>
              <span class="stat-pill berjalan">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Sesi Berjalan: <b>${sesiAktifCourse}</b>
              </span>
              <span class="stat-pill total">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Target: <b>${totalMeetings || 14} Sesi</b>
              </span>
            </div>
          </div>
          <div class="course-header-right">
            <div class="badge-rate ${badgeClass}">${badgeLabel}</div>
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="meeting-details" id="details-${idx}">
          ${meetingItemsHtml}
        </div>
      `;

      // Event listener: Single-Open Exclusive Accordion
      const headerEl = card.querySelector('.course-header');
      const detailsEl = card.querySelector(`#details-${idx}`);
      const chevronEl = card.querySelector('.chevron-icon');

      headerEl.addEventListener('click', () => {
        const isCurrentlyOpen = detailsEl.classList.contains('open');

        // Tutup seluruh card lain yang sedang terbuka
        this.shadow.querySelectorAll('.meeting-details.open').forEach(openDetails => {
          openDetails.classList.remove('open');
          const parent = openDetails.closest('.course-card');
          if (parent) {
            parent.classList.remove('is-open');
            const chev = parent.querySelector('.chevron-icon');
            if (chev) chev.style.transform = 'none';
          }
        });

        // Toggle card yang diklik
        if (!isCurrentlyOpen) {
          detailsEl.classList.add('open');
          card.classList.add('is-open');
          chevronEl.style.transform = 'rotate(180deg)';
        }
      });

      listEl.appendChild(card);
    });
  }
}

if (typeof window !== 'undefined') {
  new PresensiTracker();
}