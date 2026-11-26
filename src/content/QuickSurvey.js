/**
 * Mentari Mod Modern Edition - Quick Survey Assistant
 * Membantu auto-fill survei akademik di portal MyUnpam (e.g. evaluasi sebelum buka KHS).
 * Terintegrasi dengan Unified Floating Dock dan event 'mentari-survey-trigger'.
 */

import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';
import { ThemeHelper } from '../utils/theme.js';

class QuickSurveyAssistant {
  constructor() {
    this.currentTheme = ThemeHelper.detectSystemTheme();
    this.shadow = null;
    this._init();
  }

  async _init() {
    console.log('[Mentari Mod] MyUnpam Quick Survey Assistant aktif.');
    this.currentTheme = await ThemeHelper.getEffectiveTheme();
    ThemeHelper.watchTheme((t) => {
      this.currentTheme = t;
      this._applyTheme(t);
    });

    // Dengarkan event trigger dari Unified Floating Dock di presensi.js
    window.addEventListener('mentari-survey-trigger', async () => {
      try {
        await this.fillSurvey();
      } catch (e) {
        Toast.error('Gagal mengisi survei: ' + e.message);
      }
    });

    // Injeksi fallback standalone button hanya jika dock terpadu belum ada
    this._injectFloatingButtonIfNeeded();
  }

  _applyTheme(theme = this.currentTheme) {
    const isLight = theme === 'light';
    this.shadow?.querySelector('.btn-survey-fill')?.classList.toggle('theme-light', isLight);
  }

  _injectFloatingButtonIfNeeded() {
    // Beri jeda sejenak untuk memastikan apakah Unified Dock sudah ter-mount oleh presensi.js
    setTimeout(() => {
      // Jika dock terpadu sudah aktif, JANGAN buat tombol mengambang terpisah
      if (document.getElementById('mentari-myunpam-dock-host') || document.getElementById('mentari-survey-btn-host')) {
        return;
      }

      const host = document.createElement('div');
      host.id = 'mentari-survey-btn-host';
      host.style.position = 'fixed';
      host.style.bottom = '24px';
      host.style.right = '24px';
      host.style.zIndex = '2147483640';

      const shadow = host.attachShadow({ mode: 'closed' });
      this.shadow = shadow;

      const style = document.createElement('style');
      style.textContent = `
        .btn-survey-fill {
          background: rgba(13, 17, 28, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: #d1fae5;
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 10px 18px;
          border-radius: 9999px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-survey-fill:hover {
          background: #059669;
          color: #fff;
          border-color: #10b981;
          transform: translateY(-2px);
          box-shadow: 0 14px 35px rgba(16, 185, 129, 0.4);
        }
        .btn-survey-fill.theme-light {
          background: rgba(255, 255, 255, 0.96);
          color: #1e3a8a;
          border-color: #cbd5e1;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
        }
        .btn-survey-fill.theme-light:hover {
          background: #1e3a8a;
          color: #ffffff;
          border-color: #1e3a8a;
          box-shadow: 0 14px 32px rgba(30, 58, 138, 0.25);
        }
        .btn-survey-fill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;

      const btn = document.createElement('button');
      btn.className = `btn-survey-fill ${this.currentTheme === 'light' ? 'theme-light' : ''}`;
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Auto-Isi Survei MyUnpam
      `;

      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Mengisi survei...';

        try {
          await this.fillSurvey();
        } catch (e) {
          Toast.error('Gagal mengisi survei: ' + e.message);
        } finally {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Auto-Isi Survei MyUnpam
          `;
        }
      });

      shadow.appendChild(style);
      shadow.appendChild(btn);
      document.body.appendChild(host);
      this._applyTheme(this.currentTheme);
    }, 400);
  }

  async fillSurvey() {
    // Temukan rating buttons atau radio inputs pada portal MyUnpam
    const radioGroups = {};
    const radios = document.querySelectorAll('input[type="radio"]');

    // Kelompokkan radio berdasarkan atribut name
    radios.forEach(r => {
      const name = r.name || 'default_group';
      if (!radioGroups[name]) radioGroups[name] = [];
      radioGroups[name].push(r);
    });

    let filledCount = 0;

    // Untuk setiap grup radio di survei MyUnpam:
    for (const groupName in radioGroups) {
      const groupRadios = radioGroups[groupName];
      let targetRadio = null;

      // Cari radio dengan skor tertinggi (value 4 atau 5, atau sangat baik / setuju)
      for (const r of groupRadios) {
        const val = (r.value || '').toLowerCase();
        const labelText = (r.closest('label')?.textContent || r.parentElement?.textContent || '').toLowerCase();

        if (
          val === '4' || val === '5' || val === 'sangat baik' || val === 'sangat setuju' ||
          labelText.includes('sangat baik') || labelText.includes('sangat setuju') || labelText.includes('sangat puas')
        ) {
          targetRadio = r;
          break;
        }
      }

      // Jika tidak ada label khusus, pilih opsi terakhir dalam grup (umumnya rating tertinggi)
      if (!targetRadio && groupRadios.length > 0) {
        targetRadio = groupRadios[groupRadios.length - 1];
      }

      if (targetRadio && !targetRadio.checked) {
        await Humanizer.naturalClick(targetRadio);
        targetRadio.checked = true;
        targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
        targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
        await Humanizer.randomDelay(80, 160);
        filledCount++;
      }
    }

    // Rating buttons / custom score pills
    const customRatingBtns = document.querySelectorAll('.rating-btn, button[data-score], .btn-score');
    for (const el of customRatingBtns) {
      const score = el.getAttribute('data-score') || el.textContent.trim();
      if (score === '4' || score === '5' || el.classList.contains('rating-max')) {
        await Humanizer.naturalClick(el);
        await Humanizer.randomDelay(80, 160);
        filledCount++;
      }
    }

    // Tangani masukan kritik/saran pada textarea
    const textareas = document.querySelectorAll('textarea');
    let textFilled = 0;
    const feedbackList = [
      'Proses pembelajaran dan pelayanan akademik sudah sangat baik, komunikatif, dan memfasilitasi kebutuhan mahasiswa dengan optimal.',
      'Fasilitas dan penyampaian materi perkuliahan sangat memuaskan dan mendukung efektivitas studi.',
      'Sangat baik dan profesional. Semoga standar mutu ini terus dipertahankan dan ditingkatkan.'
    ];

    for (const ta of textareas) {
      if (!ta.value.trim()) {
        const randomFeedback = feedbackList[Math.floor(Math.random() * feedbackList.length)];
        ta.value = randomFeedback;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        textFilled++;
      }
    }

    if (filledCount > 0 || textFilled > 0) {
      Toast.success(`Survei akademik berhasil diisi otomatis (${filledCount} opsi, ${textFilled} saran).`, 'Survei Terisi');
    } else {
      Toast.warning('Tidak ditemukan form survei aktif pada halaman saat ini.', 'Info Survei');
    }
  }
}

if (typeof window !== 'undefined') {
  new QuickSurveyAssistant();
}