/**
 * Mentari Mod Modern Edition - Presensi Tracker (MyUnpam)
 * Menampilkan rekap kehadiran perkuliahan mahasiswa secara real-time via API resmi MyUnpam.
 */

import { UnpamAuth } from '../utils/unpam-auth.js';
import { Toast } from '../utils/toast.js';

class PresensiTracker {
  constructor() {
    this.host = null;
    this.shadow = null;
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] Presensi Tracker aktif di MyUnpam.');

    // Pasang sniffer
    UnpamAuth.installLiveSniffer();

    // Fallback inject main-sniffer jika belum ada
    this._injectMainSniffer();

    // Dengarkan event pembuka
    window.addEventListener('mentari-presensi-popup', () => {
      this.openModal();
    });

    // Pasang tombol floating di pojok MyUnpam
    this._injectFloatingButton();
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

  _injectFloatingButton() {
    if (document.getElementById('mentari-presensi-trigger-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-presensi-trigger-host';
    host.style.position = 'fixed';
    host.style.bottom = '85px';
    host.style.right = '30px';
    host.style.zIndex = '2147483640';

    const shadow = host.attachShadow({ mode: 'closed' });

    const btn = document.createElement('button');
    btn.style.cssText = `
      background: #4f46e5;
      color: #fff;
      border: none;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      Cek Rekap Presensi
    `;

    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.background = '#4338ca';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'none';
      btn.style.background = '#4f46e5';
    });

    btn.addEventListener('click', () => this.openModal());

    shadow.appendChild(btn);
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
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
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
        width: 740px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #121215;
        border: 1px solid rgba(79, 70, 229, 0.35);
        border-radius: 16px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e5e5e5;
      }
      .header {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn-refresh {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #ccc;
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
      }
      .btn-refresh:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .close-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        display: flex;
        border-radius: 6px;
        transition: all 0.2s;
      }
      .close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.08);
      }
      .info-bar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        padding: 14px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .info-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 12px;
      }
      .info-label {
        font-size: 10px;
        font-weight: 700;
        color: #888;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .info-value {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .content {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .course-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .course-card:hover {
        border-color: rgba(79, 70, 229, 0.5);
      }
      .course-header {
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }
      .course-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .course-name {
        font-size: 14px;
        font-weight: 700;
        color: #fff;
      }
      .course-stats-line {
        font-size: 12px;
        color: #888;
        display: flex;
        align-items: center;
        gap: 12px;
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
        color: #10b981;
      }
      .badge-rate-mid {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      .badge-rate-low {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      .meeting-details {
        padding: 0 16px 14px;
        display: none;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        margin-top: 4px;
      }
      .meeting-details.open {
        display: block;
      }
      .meeting-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 8px;
        margin-top: 12px;
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
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .meeting-pill.hadir {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.25);
        color: #10b981;
      }
      .meeting-pill.alpa {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #ef4444;
      }
      .meeting-pill.pending {
        background: rgba(100, 116, 139, 0.1);
        border-color: rgba(100, 116, 139, 0.25);
        color: #94a3b8;
      }
      .loader {
        text-align: center;
        padding: 40px;
        color: #888;
        font-size: 13px;
      }
      .btn-scan {
        background: #4f46e5;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        margin-top: 12px;
      }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Rekap Kehadiran Kuliah MyUnpam
          </div>
          <div class="header-actions">
            <button class="btn-refresh" id="btn-refresh-presensi" type="button">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Muat Ulang
            </button>
            <button class="close-btn" id="btn-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div id="presensi-info-bar"></div>
        <div class="content" id="presensi-list">
          <div class="loader">Memuat data jadwal & presensi dari server MyUnpam...</div>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(overlay);
    document.body.appendChild(this.host);

    const close = () => overlay.classList.remove('open');
    this.shadow.getElementById('btn-close').addEventListener('click', close);
    this.shadow.getElementById('btn-refresh-presensi').addEventListener('click', () => {
      UnpamAuth._cachedToken = null;
      this._loadJadwal();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  async _loadJadwal() {
    const listEl = this.shadow.getElementById('presensi-list');
    const infoBarEl = this.shadow.getElementById('presensi-info-bar');
    listEl.innerHTML = '<div class="loader">Menghubungkan ke API MyUnpam...</div>';
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
          <div class="loader" style="color:#f59e0b; line-height:1.6;">
            <div style="font-weight:700; font-size:14px; margin-bottom:6px;">Sesi Login Belum Terdeteksi</div>
            <div style="font-size:12px; color:#aaa; max-width:420px; margin:0 auto 12px;">
              Silakan klik menu perkuliahan/presensi di halaman MyUnpam atau refresh tab agar ekstensi dapat menyadap token aktif kamu secara otomatis.
            </div>
            <button class="btn-scan" id="btn-rescan-token">Pindai Sesi Sekarang</button>
          </div>
        `;
        this.shadow.getElementById('btn-rescan-token')?.addEventListener('click', () => {
          UnpamAuth._cachedToken = null;
          this._loadJadwal();
        });
        return;
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
        listEl.innerHTML = '<div class="loader">Tidak ada jadwal kuliah aktif ditemukan pada semester ini.</div>';
        return;
      }

      listEl.innerHTML = '<div class="loader">Memuat rincian kehadiran tiap pertemuan...</div>';

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
      listEl.innerHTML = `<div class="loader" style="color:#ef4444;">Error: ${e.message}</div>`;
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

    // Kalkulasi total kehadiran seluruh mata kuliah
    let totalPertemuanSemua = 0;
    let totalHadirSemua = 0;

    courses.forEach(c => {
      const meetings = c.pertemuan || [];
      totalPertemuanSemua += meetings.length;
      totalHadirSemua += meetings.filter(m => {
        const s = (m.presensi_status || m.status || '').toLowerCase();
        return s === 'hadir' || s === 'h';
      }).length;
    });

    const totalPersentase = totalPertemuanSemua > 0
      ? ((totalHadirSemua / totalPertemuanSemua) * 100).toFixed(1)
      : '0.0';

    const rateColor = Number(totalPersentase) >= 80 ? '#10b981' : (Number(totalPersentase) >= 70 ? '#f59e0b' : '#ef4444');

    // Render info bar
    infoBarEl.innerHTML = `
      <div class="info-bar">
        <div class="info-card">
          <div class="info-label">MAHASISWA</div>
          <div class="info-value" title="${namaMhs}">${namaMhs}</div>
        </div>
        <div class="info-card">
          <div class="info-label">NIM</div>
          <div class="info-value">${nim}</div>
        </div>
        <div class="info-card">
          <div class="info-label">SEMESTER</div>
          <div class="info-value">${semester}</div>
        </div>
        <div class="info-card" style="border-color:${rateColor}; background:rgba(255,255,255,0.03);">
          <div class="info-label" style="color:${rateColor};">TOTAL KEHADIRAN</div>
          <div class="info-value" style="color:${rateColor}; font-size:15px;">${totalPersentase}%</div>
        </div>
      </div>
    `;

    // Render course cards
    listEl.innerHTML = '';
    courses.forEach((c, idx) => {
      const meetings = c.pertemuan || [];
      const hadirCount = meetings.filter(m => {
        const s = (m.presensi_status || m.status || '').toLowerCase();
        return s === 'hadir' || s === 'h';
      }).length;
      const totalMeetings = meetings.length;
      const alpaCount = meetings.filter(m => {
        const s = (m.presensi_status || m.status || '').toLowerCase();
        return s === 'alpa' || s === 'tidak hadir' || s === 'a';
      }).length;

      const coursePct = totalMeetings > 0 ? ((hadirCount / totalMeetings) * 100).toFixed(1) : '0.0';
      const badgeClass = Number(coursePct) >= 80 ? 'badge-rate-high' : (Number(coursePct) >= 70 ? 'badge-rate-mid' : 'badge-rate-low');

      const card = document.createElement('div');
      card.className = 'course-card';

      let meetingItemsHtml = '';
      if (meetings.length === 0) {
        meetingItemsHtml = '<div style="font-size:11px; color:#888; padding:8px 0;">Data per pertemuan belum diterbitkan oleh dosen kelas ini.</div>';
      } else {
        meetingItemsHtml = `
          <div class="meeting-grid">
            ${meetings.map((m, mIdx) => {
              const status = (m.presensi_status || m.status || '').toLowerCase();
              let pillClass = 'pending';
              let label = 'Belum Ada';
              if (status === 'hadir' || status === 'h') {
                pillClass = 'hadir';
                label = 'Hadir';
              } else if (status === 'alpa' || status === 'tidak hadir' || status === 'a') {
                pillClass = 'alpa';
                label = 'Alpa';
              } else if (status) {
                pillClass = 'pending';
                label = m.presensi_status || m.status;
              }

              return `
                <div class="meeting-pill ${pillClass}">
                  <span>Pertemuan ${m.urutan || (mIdx + 1)}</span>
                  <span>${label}</span>
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
            <div class="course-stats-line">
              <span>SKS: <b>${c.sks || '-'}</b></span>
              <span>Hadir: <b style="color:#10b981;">${hadirCount}</b></span>
              <span>Mangkir: <b style="color:#ef4444;">${alpaCount}</b></span>
              <span>Total: <b>${totalMeetings || 14} Pertemuan</b></span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="badge-rate ${badgeClass}">${coursePct}%</div>
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div class="meeting-details" id="details-${idx}">
          ${meetingItemsHtml}
        </div>
      `;

      // Event listener toggle accordion
      const headerEl = card.querySelector('.course-header');
      const detailsEl = card.querySelector(`#details-${idx}`);
      const chevronEl = card.querySelector('.chevron-icon');

      headerEl.addEventListener('click', () => {
        const isOpen = detailsEl.classList.toggle('open');
        chevronEl.style.transform = isOpen ? 'rotate(180deg)' : 'none';
      });

      listEl.appendChild(card);
    });
  }
}

if (typeof window !== 'undefined') {
  new PresensiTracker();
}