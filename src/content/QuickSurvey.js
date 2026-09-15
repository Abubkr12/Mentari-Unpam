/**
 * Mentari Mod Modern Edition - Quick Survey Assistant
 * Membantu auto-fill survei akademik di portal MyUnpam (e.g. evaluasi sebelum buka KHS).
 */

import { DOM } from '../utils/dom.js';
import { Humanizer } from '../utils/humanizer.js';
import { Toast } from '../utils/toast.js';

class QuickSurveyAssistant {
  constructor() {
    this._init();
  }

  _init() {
    console.log('[Mentari Mod] MyUnpam Quick Survey Assistant aktif.');
    this._injectFloatingButton();
  }

  _injectFloatingButton() {
    if (document.getElementById('mentari-survey-btn-host')) return;

    const host = document.createElement('div');
    host.id = 'mentari-survey-btn-host';
    host.style.position = 'fixed';
    host.style.bottom = '30px';
    host.style.right = '30px';
    host.style.zIndex = '2147483640';

    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .btn-survey-fill {
        background: #3b82f6;
        color: #fff;
        border: none;
        padding: 12px 18px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .btn-survey-fill:hover {
        background: #2563eb;
        transform: translateY(-2px);
      }
      .btn-survey-fill:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;

    const btn = document.createElement('button');
    btn.className = 'btn-survey-fill';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
        Toast.success('Survei berhasil diisi otomatis!');
      } catch (e) {
        Toast.error('Gagal mengisi survei: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
  }

  async fillSurvey() {
    // 1. Temukan rating buttons atau radio inputs pada portal MyUnpam
    const ratingButtons = document.querySelectorAll('.rating-btn, button[data-score], input[type="radio"]');
    let filled = 0;

    if (ratingButtons.length > 0) {
      for (const el of ratingButtons) {
        // Prioritaskan nilai maksimal / rating tinggi (e.g. score 4 atau 5)
        const score = el.getAttribute('data-score') || el.value;
        if (score === '4' || score === '5' || score === 'sangat baik' || el.classList.contains('rating-max')) {
          await Humanizer.naturalClick(el);
          await Humanizer.randomDelay(150, 300);
          filled++;
        }
      }
    }

    // Isi feedback textarea jika ada
    const textareas = document.querySelectorAll('textarea');
    for (const ta of textareas) {
      if (!ta.value.trim()) {
        ta.value = 'Layanan dan fasilitas perkuliahan sudah sangat baik dan mendukung proses belajar.';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    Toast.info(`Survei diproses (${filled} pilihan terisi).`);
  }
}

if (typeof window !== 'undefined') {
  new QuickSurveyAssistant();
}