/**
 * Mentari Mod Modern Edition - Inline Gemini Chatbot Assistant
 * Floating AI chatbot terisolasi dalam Closed Shadow DOM dengan prompt chips & memory.
 */

import { Storage } from '../utils/storage.js';
import { Toast } from '../utils/toast.js';

const ALL_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' }
];

class GeminiChatbot {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.isOpen = false;
    this.chatHistory = [];
    this._init();
  }

  async _init() {
    // Muat riwayat chat
    const { gemini_chat_history_v2 } = await Storage.get('gemini_chat_history_v2', { gemini_chat_history_v2: [] });
    this.chatHistory = Array.isArray(gemini_chat_history_v2) ? gemini_chat_history_v2 : [];

    this._injectFloatingTrigger();
  }

  _injectFloatingTrigger() {
    if (document.getElementById('mentari-gemini-chat-host')) return;

    this.host = document.createElement('div');
    this.host.id = 'mentari-gemini-chat-host';
    this.host.style.position = 'fixed';
    this.host.style.bottom = '24px';
    this.host.style.left = '24px';
    this.host.style.zIndex = '2147483640';

    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .chat-trigger {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #d4af37, #b8860b);
        color: #121212;
        border: none;
        box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .chat-trigger:hover {
        transform: scale(1.1);
      }
      .chat-window {
        position: absolute;
        bottom: 60px;
        left: 0;
        width: 380px;
        max-width: 90vw;
        height: 520px;
        max-height: 80vh;
        background: #141418;
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px) scale(0.95);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .chat-window.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }
      .chat-header {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #fff;
        gap: 8px;
      }
      .chat-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        overflow: hidden;
      }
      .chat-title-group svg {
        color: #d4af37;
        flex-shrink: 0;
      }
      .chat-model-select {
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #d4af37;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        outline: none;
        cursor: pointer;
        max-width: 170px;
      }
      .chat-model-select option {
        background: #18181c;
        color: #fff;
      }
      .chat-close {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-close:hover { color: #fff; }
      .chat-body {
        flex-grow: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.45;
        word-break: break-word;
      }
      .msg-user {
        align-self: flex-end;
        background: #d4af37;
        color: #121212;
        border-bottom-right-radius: 2px;
      }
      .msg-ai {
        align-self: flex-start;
        background: #202026;
        color: #e5e5e5;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-bottom-left-radius: 2px;
      }
      .chips-row {
        display: flex;
        gap: 6px;
        padding: 8px 14px;
        overflow-x: auto;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
      .chip {
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #ccc;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .chip:hover {
        background: rgba(212, 175, 55, 0.2);
        color: #d4af37;
      }
      .chat-footer {
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        gap: 8px;
      }
      .chat-input {
        flex-grow: 1;
        background: #1e1e24;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 9px 12px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }
      .chat-input:focus { border-color: #d4af37; }
      .chat-send {
        background: #d4af37;
        color: #121212;
        border: none;
        border-radius: 10px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .chat-send:hover { background: #e6be40; }
    `;

    const container = document.createElement('div');
    container.innerHTML = `
      <button class="chat-trigger" id="btn-trigger" title="Tanya AI Gemini">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div class="chat-window" id="chat-window">
        <div class="chat-header">
          <div class="chat-title-group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <select class="chat-model-select" id="chat-model-select" title="Ganti Model AI">
              ${ALL_MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
          <button class="chat-close" id="btn-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="chat-body" id="chat-body">
          <div class="msg msg-ai">Halo! Ada materi kuliah atau soal Mentari yang ingin kamu diskusikan?</div>
        </div>

        <div class="chips-row">
          <button class="chip" data-prompt="Jelaskan secara ringkas poin utama materi ini:">Ringkas</button>
          <button class="chip" data-prompt="Buatkan contoh penerapan di dunia nyata untuk:">Contoh Nyata</button>
          <button class="chip" data-prompt="Buatkan rangkuman dalam format poin-poin:">Poin-poin</button>
        </div>

        <div class="chat-footer">
          <input type="text" class="chat-input" id="chat-input" placeholder="Ketik pertanyaan...">
          <button class="chat-send" id="btn-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(container);
    document.body.appendChild(this.host);

    const trigger = this.shadow.getElementById('btn-trigger');
    const windowEl = this.shadow.getElementById('chat-window');
    const closeBtn = this.shadow.getElementById('btn-close');
    const input = this.shadow.getElementById('chat-input');
    const sendBtn = this.shadow.getElementById('btn-send');
    const body = this.shadow.getElementById('chat-body');
    const modelSelect = this.shadow.getElementById('chat-model-select');
    const validModelIds = ALL_MODELS.map(m => m.id);

    // Sinkronisasi model yang tersimpan
    Storage.get('gemini_model').then(({ gemini_model }) => {
      if (gemini_model && validModelIds.includes(gemini_model)) {
        modelSelect.value = gemini_model;
      } else {
        modelSelect.value = 'gemini-2.5-flash';
        Storage.set({ gemini_model: 'gemini-2.5-flash' });
      }
    });

    modelSelect.addEventListener('change', () => {
      const chosen = modelSelect.value;
      if (chosen && validModelIds.includes(chosen)) {
        Storage.set({ gemini_model: chosen });
        Toast.info(`Model Chat diubah ke: ${modelSelect.options[modelSelect.selectedIndex].text}`);
      }
    });

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.gemini_model) {
          const newModel = changes.gemini_model.newValue;
          if (newModel && validModelIds.includes(newModel) && modelSelect.value !== newModel) {
            modelSelect.value = newModel;
          }
        }
      });
    }

    trigger.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      window.dispatchEvent(new CustomEvent('mentari-gemini-chat-toggle', { detail: { isOpen: this.isOpen } }));
      if (this.isOpen) {
        windowEl.classList.add('open');
        input.focus();
      } else {
        windowEl.classList.remove('open');
      }
    });

    closeBtn.addEventListener('click', () => {
      this.isOpen = false;
      window.dispatchEvent(new CustomEvent('mentari-gemini-chat-toggle', { detail: { isOpen: false } }));
      windowEl.classList.remove('open');
    });

    const handleSend = () => {
      const text = input.value.trim();
      if (!text) return;

      this._appendMessage('user', text);
      input.value = '';

      const loadingEl = this._appendMessage('ai', 'Sedang memikirkan jawaban...');

      chrome.runtime.sendMessage({
        action: 'generateGeminiContent',
        prompt: text,
        systemInstruction: 'Kamu adalah asisten belajar mahasiswa Universitas Pamulang (UNPAM). Jawablah dengan cerdas, ramah, dan solutif.',
        model: modelSelect.value
      }, (res) => {
        if (res && res.success) {
          loadingEl.textContent = res.text;
        } else {
          loadingEl.textContent = 'Gagal mendapatkan jawaban: ' + (res ? res.error : 'Koneksi error');
        }
        body.scrollTop = body.scrollHeight;
      });
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Chip click
    this.shadow.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.getAttribute('data-prompt') + ' ';
        input.focus();
      });
    });
  }

  _appendMessage(role, text) {
    const body = this.shadow.getElementById('chat-body');
    const msg = document.createElement('div');
    msg.className = `msg msg-${role}`;
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }
}

if (typeof window !== 'undefined') {
  new GeminiChatbot();
}