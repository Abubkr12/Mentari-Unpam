(() => {
  // src/utils/storage.js
  var Storage = {
    /**
     * Memeriksa apakah context extension masih valid dan aktif
     */
    isContextValid() {
      try {
        return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
      } catch {
        return false;
      }
    },
    /**
     * Mengambil satu atau beberapa nilai dari chrome.storage.local
     */
    async get(keys, defaults = {}) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading storage:", chrome.runtime.lastError.message);
                resolve(this._getLocalStorageFallback(keys, defaults));
              } else {
                resolve(Object.assign({}, defaults, result));
              }
            });
          } else {
            resolve(this._getLocalStorageFallback(keys, defaults));
          }
        } catch (e) {
          if (e.message && e.message.includes("Extension context invalidated")) {
            console.warn("[Storage] Extension context invalidated (ekstensi baru di-reload). Menggunakan fallback lokal.");
          } else {
            console.error("[Storage] Get failed:", e);
          }
          resolve(this._getLocalStorageFallback(keys, defaults));
        }
      });
    },
    /**
     * Menyimpan pasangan key-value ke chrome.storage.local
     */
    async set(items) {
      return new Promise((resolve, reject) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
              this._setLocalStorageFallback(items);
              resolve(true);
            });
          } else {
            this._setLocalStorageFallback(items);
            resolve(true);
          }
        } catch (e) {
          this._setLocalStorageFallback(items);
          resolve(true);
        }
      });
    },
    /**
     * Menghapus satu atau beberapa keys dari chrome.storage.local
     */
    async remove(keys) {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(keys, () => resolve(true));
          } else {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach((k) => {
              try {
                localStorage.removeItem(k);
              } catch {
              }
            });
            resolve(true);
          }
        } catch {
          resolve(true);
        }
      });
    },
    _getLocalStorageFallback(keys, defaults = {}) {
      const res = Object.assign({}, defaults);
      if (typeof localStorage === "undefined") return res;
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        try {
          const val = localStorage.getItem(k);
          if (val !== null) {
            try {
              res[k] = JSON.parse(val);
            } catch {
              res[k] = val;
            }
          }
        } catch {
        }
      });
      return res;
    },
    _setLocalStorageFallback(items) {
      if (typeof localStorage === "undefined") return;
      for (const [k, v] of Object.entries(items)) {
        try {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        } catch {
        }
      }
    },
    /**
     * Auto-migrasi transparan dari localStorage lama ke chrome.storage.local.
     * Dipanggil saat ekstensi pertama kali aktif.
     */
    async autoMigrateLegacyStorage() {
      try {
        if (typeof window === "undefined" || !window.localStorage) return;
        const { mentari_legacy_migrated } = await this.get("mentari_legacy_migrated", { mentari_legacy_migrated: false });
        if (mentari_legacy_migrated) return;
        const legacyKeys = [
          "mentari_auth_token",
          "mentari_user_info",
          "mentari_course_data",
          "geminiApiKey",
          "gemini_model",
          "gemini_quota",
          "mentari_auto_finish_quiz",
          "access"
        ];
        const validModels = [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3-flash",
          "gemini-3.1-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
          "gemini-3.7-flash",
          "gemini-3.8-flash"
        ];
        const toMigrate = {};
        let hasData = false;
        const existing = await this.get(["gemini_model", "geminiApiKey"]);
        for (const k of legacyKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (k === "geminiApiKey") {
                if (!existing.geminiApiKey) {
                  try {
                    toMigrate[k] = atob(raw);
                  } catch {
                    toMigrate[k] = raw;
                  }
                  hasData = true;
                }
              } else if (k === "gemini_model") {
                let parsedModel = raw;
                try {
                  parsedModel = JSON.parse(raw);
                } catch {
                }
                if (!existing.gemini_model && validModels.includes(parsedModel)) {
                  toMigrate[k] = parsedModel;
                  hasData = true;
                }
              } else {
                if (!existing[k]) {
                  toMigrate[k] = JSON.parse(raw);
                  hasData = true;
                }
              }
            } catch {
              if (!existing[k]) {
                toMigrate[k] = raw;
                hasData = true;
              }
            }
          }
        }
        toMigrate.mentari_legacy_migrated = true;
        await this.set(toMigrate);
        console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/toast.js
  var ToastManager = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.container = null;
      this._init();
    }
    _init() {
      if (typeof document === "undefined") return;
      this.host = document.createElement("div");
      this.host.id = "mentari-toast-host";
      this.host.style.position = "fixed";
      this.host.style.top = "20px";
      this.host.style.right = "20px";
      this.host.style.zIndex = "2147483647";
      this.host.style.pointerEvents = "none";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      .toast-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
      }
      .toast-card {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(18, 18, 20, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        color: #f0f0f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      .toast-card.hide {
        opacity: 0;
        transform: translateX(30px);
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }
      .toast-content {
        flex-grow: 1;
      }
      .toast-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 2px;
        color: #fff;
      }
      .toast-message {
        color: #b0b3b8;
        font-size: 12px;
        word-break: break-word;
      }
      .toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }
      .toast-close:hover {
        color: #fff;
      }
      /* Variants */
      .toast-info { border-left: 3px solid #3b82f6; }
      .toast-info .toast-icon { color: #3b82f6; }
      .toast-success { border-left: 3px solid #10b981; }
      .toast-success .toast-icon { color: #10b981; }
      .toast-warning { border-left: 3px solid #f59e0b; }
      .toast-warning .toast-icon { color: #f59e0b; }
      .toast-error { border-left: 3px solid #ef4444; }
      .toast-error .toast-icon { color: #ef4444; }
    `;
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.container);
      const mount = () => {
        if (document.body && !document.getElementById("mentari-toast-host")) {
          document.body.appendChild(this.host);
        }
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
      } else {
        mount();
      }
    }
    _getIconSvg(type) {
      switch (type) {
        case "success":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        case "warning":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        case "error":
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        default:
          return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
    }
    show(options) {
      if (!this.container) return;
      if (document.body && !this.host.parentElement) {
        document.body.appendChild(this.host);
      }
      const {
        title = "",
        message = "",
        type = "info",
        // 'info' | 'success' | 'warning' | 'error'
        duration = 4500
      } = typeof options === "string" ? { message: options } : options;
      const card = document.createElement("div");
      card.className = `toast-card toast-${type}`;
      card.innerHTML = `
      <div class="toast-icon">${this._getIconSvg(type)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ""}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Tutup">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
      const closeBtn = card.querySelector(".toast-close");
      const dismiss = () => {
        card.classList.add("hide");
        setTimeout(() => {
          if (card.parentElement) card.remove();
        }, 250);
      };
      closeBtn.addEventListener("click", dismiss);
      if (duration > 0) {
        setTimeout(dismiss, duration);
      }
      this.container.appendChild(card);
    }
    success(message, title = "Berhasil") {
      this.show({ title, message, type: "success" });
    }
    error(message, title = "Terjadi Kesalahan") {
      this.show({ title, message, type: "error", duration: 6e3 });
    }
    warning(message, title = "Perhatian") {
      this.show({ title, message, type: "warning" });
    }
    info(message, title = "Informasi") {
      this.show({ title, message, type: "info" });
    }
  };
  var Toast = new ToastManager();

  // src/content/gemini.js
  var ALL_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" }
  ];
  var GeminiChatbot = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.isOpen = false;
      this.chatHistory = [];
      this._init();
    }
    async _init() {
      const { gemini_chat_history_v2 } = await Storage.get("gemini_chat_history_v2", { gemini_chat_history_v2: [] });
      this.chatHistory = Array.isArray(gemini_chat_history_v2) ? gemini_chat_history_v2 : [];
      this._injectFloatingTrigger();
    }
    _injectFloatingTrigger() {
      if (document.getElementById("mentari-gemini-chat-host")) return;
      this.host = document.createElement("div");
      this.host.id = "mentari-gemini-chat-host";
      this.host.style.position = "fixed";
      this.host.style.bottom = "24px";
      this.host.style.left = "24px";
      this.host.style.zIndex = "2147483640";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
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
      const container = document.createElement("div");
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
              ${ALL_MODELS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}
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
      const trigger = this.shadow.getElementById("btn-trigger");
      const windowEl = this.shadow.getElementById("chat-window");
      const closeBtn = this.shadow.getElementById("btn-close");
      const input = this.shadow.getElementById("chat-input");
      const sendBtn = this.shadow.getElementById("btn-send");
      const body = this.shadow.getElementById("chat-body");
      const modelSelect = this.shadow.getElementById("chat-model-select");
      const validModelIds = ALL_MODELS.map((m) => m.id);
      Storage.get("gemini_model").then(({ gemini_model }) => {
        if (gemini_model && validModelIds.includes(gemini_model)) {
          modelSelect.value = gemini_model;
        } else {
          modelSelect.value = "gemini-2.5-flash";
          Storage.set({ gemini_model: "gemini-2.5-flash" });
        }
      });
      modelSelect.addEventListener("change", () => {
        const chosen = modelSelect.value;
        if (chosen && validModelIds.includes(chosen)) {
          Storage.set({ gemini_model: chosen });
          Toast.info(`Model Chat diubah ke: ${modelSelect.options[modelSelect.selectedIndex].text}`);
        }
      });
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.gemini_model) {
            const newModel = changes.gemini_model.newValue;
            if (newModel && validModelIds.includes(newModel) && modelSelect.value !== newModel) {
              modelSelect.value = newModel;
            }
          }
        });
      }
      trigger.addEventListener("click", () => {
        this.isOpen = !this.isOpen;
        window.dispatchEvent(new CustomEvent("mentari-gemini-chat-toggle", { detail: { isOpen: this.isOpen } }));
        if (this.isOpen) {
          windowEl.classList.add("open");
          input.focus();
        } else {
          windowEl.classList.remove("open");
        }
      });
      closeBtn.addEventListener("click", () => {
        this.isOpen = false;
        window.dispatchEvent(new CustomEvent("mentari-gemini-chat-toggle", { detail: { isOpen: false } }));
        windowEl.classList.remove("open");
      });
      const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        this._appendMessage("user", text);
        input.value = "";
        const loadingEl = this._appendMessage("ai", "Sedang memikirkan jawaban...");
        chrome.runtime.sendMessage({
          action: "generateGeminiContent",
          prompt: text,
          systemInstruction: "Kamu adalah asisten belajar mahasiswa Universitas Pamulang (UNPAM). Jawablah dengan cerdas, ramah, dan solutif.",
          model: modelSelect.value
        }, (res) => {
          if (res && res.success) {
            loadingEl.textContent = res.text;
          } else {
            loadingEl.textContent = "Gagal mendapatkan jawaban: " + (res ? res.error : "Koneksi error");
          }
          body.scrollTop = body.scrollHeight;
        });
      };
      sendBtn.addEventListener("click", handleSend);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSend();
      });
      this.shadow.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          input.value = chip.getAttribute("data-prompt") + " ";
          input.focus();
        });
      });
    }
    _appendMessage(role, text) {
      const body = this.shadow.getElementById("chat-body");
      const msg = document.createElement("div");
      msg.className = `msg msg-${role}`;
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
      return msg;
    }
  };
  if (typeof window !== "undefined") {
    new GeminiChatbot();
  }
})();
