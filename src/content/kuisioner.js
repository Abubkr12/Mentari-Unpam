/**
 * Mentari Mod Modern Edition - Auto Kuisioner Evaluasi
 * Mengisi evaluasi dosen & mata kuliah secara otomatis, aman, dan tanpa bug CSS.
 */

import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';

class KuisionerAssistant {
  constructor() {
    this.isProcessing = false;
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] Kuisioner Assistant siap.');
    this._injectFloatingButton();
  }

  _injectFloatingButton() {
    if (document.getElementById('mentari-kuisioner-btn-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-kuisioner-btn-host';
    host.style.position = 'fixed';
    host.style.bottom = '30px';
    host.style.right = '30px';
    host.style.zIndex = '2147483640';

    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .btn-auto-fill {
        background: #10b981;
        color: #fff;
        border: none;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .btn-auto-fill:hover {
        background: #059669;
        transform: translateY(-2px);
        box-shadow: 0 14px 30px rgba(16, 185, 129, 0.5);
      }
      .btn-auto-fill:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
    `;

    const btn = document.createElement('button');
    btn.className = 'btn-auto-fill';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
      </svg>
      Auto-Isi Kuesioner (Bagus Semua)
    `;

    btn.addEventListener('click', async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      btn.disabled = true;
      btn.textContent = 'Mengisi kuesioner...';

      try {
        await this.autoFillAllRatings();
        Toast.success('Kuesioner berhasil diisi dengan penilaian terbaik!');
      } catch (e) {
        Toast.error('Gagal mengisi kuesioner: ' + e.message);
      } finally {
        this.isProcessing = false;
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          Auto-Isi Kuesioner
        `;
      }
    });

    shadow.appendChild(style);
    shadow.appendChild(btn);
    document.body.appendChild(host);
  }

  async autoFillAllRatings() {
    // 1. Temukan seluruh baris / grup pertanyaan kuesioner
    // Kuesioner Mentari biasanya berupa tabel atau form dengan rating radio 1-4 atau 1-5
    const radioGroups = document.querySelectorAll('[role="radiogroup"], tr, .MuiFormGroup-root');
    let filledCount = 0;

    for (const group of radioGroups) {
      const radios = group.querySelectorAll('input[type="radio"], .MuiRadio-root');
      if (radios.length > 0) {
        // Pilih opsi terbaik (biasanya radio terakhir: 'Sangat Baik' / nilai 4 atau 5)
        const bestRadio = radios[radios.length - 1];
        if (bestRadio && !bestRadio.checked) {
          await Humanizer.naturalClick(bestRadio);
          filledCount++;
          // Jeda acak antar pertanyaan (150ms - 350ms)
          await Humanizer.randomDelay(150, 350);
        }
      }
    }

    // 2. Isi kolom masukan saran jika ada (textarea / text input)
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    const positiveFeedbacks = [
      'Pembelajaran sangat interaktif dan materi disampaikan dengan sangat jelas.',
      'Dosen sangat menguasai materi perkuliahan dan responsif terhadap mahasiswa.',
      'Sangat baik, penjelasan mudah dipahami dan tepat waktu.',
      'Materi yang diberikan sangat relevan dan bermanfaat.'
    ];

    for (const ta of textareas) {
      if (!ta.value.trim()) {
        const randomText = positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];
        ta.value = randomText;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (filledCount === 0) {
      // Coba fallback langsung ke semua radio terakhir per baris form
      const allRadios = document.querySelectorAll('input[type="radio"]');
      const byName = {};
      allRadios.forEach(r => {
        const name = r.name || 'default';
        if (!byName[name]) byName[name] = [];
        byName[name].push(r);
      });

      for (const name in byName) {
        const group = byName[name];
        const last = group[group.length - 1];
        if (last && !last.checked) {
          await Humanizer.naturalClick(last);
          await Humanizer.randomDelay(120, 280);
          filledCount++;
        }
      }
    }

    Toast.info(`${filledCount} item evaluasi berhasil diisi otomatis.`);
  }
}

if (typeof window !== 'undefined') {
  new KuisionerAssistant();
}