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

  // src/utils/dom.js
  var DOM = {
    /**
     * Mencari tombol berdasarkan teks kontennya (pengganti fatal bug :contains())
     * Aman dari DOMException / SyntaxError pada Chromium modern.
     */
    findButtonByText(keywords, root = document, includeDisabled = false) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const buttons = root.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"], div[role="button"]');
      for (const btn of buttons) {
        if (btn.offsetParent === null && !btn.getClientRects().length) continue;
        if (!includeDisabled) {
          if (btn.disabled || btn.classList.contains("Mui-disabled") || btn.classList.contains("disabled") || btn.getAttribute("aria-disabled") === "true" || btn.getAttribute("disabled") !== null) {
            continue;
          }
        }
        const text = (btn.textContent || btn.value || "").trim().toLowerCase();
        if (normalized.some((kw) => text.includes(kw))) {
          return btn;
        }
      }
      return null;
    },
    /**
     * Mencari semua tombol yang cocok dengan teks konten
     */
    findAllButtonsByText(keywords, root = document) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const matches = [];
      const buttons = root.querySelectorAll('button, a[role="button"], div[role="button"]');
      for (const btn of buttons) {
        const text = (btn.textContent || "").trim().toLowerCase();
        if (normalized.some((kw) => text.includes(kw))) {
          matches.push(btn);
        }
      }
      return matches;
    },
    /**
     * Mencari container header / navbar Mentari UNPAM secara semantic
     * Bebas dari ketergantungan hash class emotion (.css-1yxmbwk)
     */
    findHeaderContainer() {
      const candidates = [
        document.querySelector("header .MuiToolbar-root"),
        document.querySelector(".MuiAppBar-root .MuiToolbar-root"),
        document.querySelector("header"),
        document.querySelector(".MuiAppBar-root"),
        document.querySelector("nav"),
        document.querySelector('[role="banner"]'),
        document.querySelector(".css-1yxmbwk")
        // fallback jika hash kebetulan masih aktif
      ];
      return candidates.find((el) => el !== null) || null;
    },
    /**
     * Mencari opsi radio button pada container soal kuis secara aman
     * Menggantikan selector rapuh .css-1kic1uf / .css-1675apn
     */
    findRadioOptions(questionContainer) {
      if (!questionContainer) return [];
      const inputs = questionContainer.querySelectorAll('input[type="radio"]');
      if (inputs.length > 0) return Array.from(inputs);
      const muiRadios = questionContainer.querySelectorAll('.MuiRadio-root, [role="radio"]');
      if (muiRadios.length > 0) return Array.from(muiRadios);
      const labels = questionContainer.querySelectorAll(".MuiFormControlLabel-root");
      if (labels.length > 0) return Array.from(labels);
      return [];
    },
    /**
     * Menunggu elemen muncul di DOM dengan batas timeout
     */
    waitForElement(selectorOrFn, timeout = 1e4, root = document) {
      return new Promise((resolve) => {
        const check = () => {
          if (typeof selectorOrFn === "function") {
            return selectorOrFn();
          }
          return root.querySelector(selectorOrFn);
        };
        const initial = check();
        if (initial) return resolve(initial);
        let timer = null;
        const observer = new MutationObserver(() => {
          const found = check();
          if (found) {
            cleanup();
            resolve(found);
          }
        });
        const cleanup = () => {
          if (timer) clearTimeout(timer);
          observer.disconnect();
        };
        timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, timeout);
        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
      });
    }
  };

  // src/utils/humanizer.js
  var Humanizer = {
    /**
     * Jeda waktu statis
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    /**
     * Jeda waktu acak (jitter) dalam rentang min dan max
     */
    randomDelay(minMs = 1500, maxMs = 4500) {
      const jitter = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      return this.delay(jitter);
    },
    /**
     * Menghitung jeda baca natural berdasarkan panjang teks soal kuis
     * Asumsi kecepatan baca normal mahasiswa: ~180-220 kata per menit
     */
    async readingPacing(text = "", minBaseMs = 3e3, maxBaseMs = 8e3) {
      const wordCount = (text || "").trim().split(/\s+/).filter(Boolean).length;
      const calculated = minBaseMs + wordCount * 250;
      const targetMs = Math.min(Math.max(calculated, minBaseMs), maxBaseMs);
      const variance = (Math.random() * 0.4 - 0.2) * targetMs;
      const finalDelay = Math.round(targetMs + variance);
      await this.delay(finalDelay);
      return finalDelay;
    },
    /**
     * Mensimulasikan klik mouse natural manusia dengan scrolling halus
     * dan rangkaian event mouse lengkap (pointerdown -> mousedown -> focus -> click).
     */
    async naturalClick(element) {
      if (!element) return false;
      try {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      } catch {
      }
      await this.delay(300 + Math.random() * 300);
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2 + (Math.random() * 4 - 2);
      const clientY = rect.top + rect.height / 2 + (Math.random() * 4 - 2);
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY
      };
      try {
        element.dispatchEvent(new PointerEvent("pointerdown", eventOpts));
        element.dispatchEvent(new MouseEvent("mousedown", eventOpts));
        if (typeof element.focus === "function") element.focus();
        await this.delay(50 + Math.random() * 70);
        element.dispatchEvent(new PointerEvent("pointerup", eventOpts));
        element.dispatchEvent(new MouseEvent("mouseup", eventOpts));
        element.dispatchEvent(new MouseEvent("click", eventOpts));
        if (element.tagName === "INPUT" && !element.checked) {
          element.checked = true;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } catch (e) {
        element.click();
      }
      return true;
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

  // src/content/quiz.js
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
  var VALID_MODEL_IDS = ALL_MODELS.map((m) => m.id);
  var DEFAULT_MODEL = "gemini-2.5-flash";
  var QuizAssistant = class {
    constructor() {
      this.isRunning = false;
      this.isAutoMode = false;
      this.answeredCount = 0;
      this.totalQuestions = 0;
      this.shadow = null;
      this.activeModel = DEFAULT_MODEL;
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] Quiz Assistant aktif.");
      try {
        const { gemini_model } = await Storage.get("gemini_model", { gemini_model: DEFAULT_MODEL });
        if (gemini_model && VALID_MODEL_IDS.includes(gemini_model)) {
          this.activeModel = gemini_model;
        } else {
          this.activeModel = DEFAULT_MODEL;
          await Storage.set({ gemini_model: DEFAULT_MODEL });
        }
      } catch (e) {
        this.activeModel = DEFAULT_MODEL;
      }
      this._injectFloatingControl();
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.gemini_model) {
            const newModel = changes.gemini_model.newValue;
            if (newModel && VALID_MODEL_IDS.includes(newModel)) {
              this.activeModel = newModel;
              const selectModel = this.shadow?.getElementById("quiz-select-model");
              if (selectModel && selectModel.value !== newModel) {
                selectModel.value = newModel;
              }
            }
          }
        });
      }
    }
    _injectFloatingControl() {
      if (document.getElementById("mentari-quiz-control-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-quiz-control-host";
      host.style.position = "fixed";
      host.style.bottom = "24px";
      host.style.right = "24px";
      host.style.zIndex = "2147483641";
      this.shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .quiz-card {
        background: rgba(18, 18, 22, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 250px;
      }
      .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .quiz-title {
        font-size: 13px;
        font-weight: 700;
        color: #d4af37;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .model-select {
        width: 100%;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #e5e5e5;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 11px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .model-select:focus {
        border-color: #d4af37;
      }
      .model-select option {
        background: #18181c;
        color: #fff;
      }
      .btn-action {
        background: #d4af37;
        color: #121212;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
      }
      .btn-action:hover {
        background: #e6be40;
        transform: translateY(-1px);
      }
      .btn-action:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .btn-single {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .btn-single:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
    `;
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Mentari AI Quiz
        </div>
      </div>
      <div>
        <select class="model-select" id="quiz-select-model" title="Pilih Model AI Gemini">
          ${ALL_MODELS.map((m) => `<option value="${m.id}" ${m.id === this.activeModel ? "selected" : ""}>${m.name}</option>`).join("")}
        </select>
      </div>
      <div class="status-text" id="status-text">Siap membantu mengerjakan kuis.</div>
      <div style="display:flex; gap:8px;">
        <button class="btn-single" id="btn-single" type="button">Jawab Ini</button>
        <button class="btn-action" id="btn-auto" type="button">Auto Semua</button>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(card);
      document.body.appendChild(host);
      const selectModel = this.shadow.getElementById("quiz-select-model");
      const btnSingle = this.shadow.getElementById("btn-single");
      const btnAuto = this.shadow.getElementById("btn-auto");
      const statusText = this.shadow.getElementById("status-text");
      if (selectModel) {
        selectModel.value = this.activeModel;
        selectModel.addEventListener("change", () => {
          const chosen = selectModel.value;
          if (chosen && VALID_MODEL_IDS.includes(chosen)) {
            this.activeModel = chosen;
            Storage.set({ gemini_model: chosen });
            const label = selectModel.options[selectModel.selectedIndex]?.text || chosen;
            Toast.info(`Model diubah ke: ${label}`);
          }
        });
      }
      btnSingle.addEventListener("click", async () => {
        btnSingle.disabled = true;
        statusText.textContent = "Menganalisis soal saat ini...";
        try {
          await this.processCurrentQuestion(false);
          statusText.textContent = "Jawaban berhasil dipilih.";
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error(e.message);
        } finally {
          btnSingle.disabled = false;
        }
      });
      btnAuto.addEventListener("click", async () => {
        if (this.isRunning) {
          this.isRunning = false;
          btnAuto.textContent = "Auto Semua";
          statusText.textContent = "Otomatisasi dihentikan.";
          Toast.info("Otomatisasi kuis dihentikan pengguna.");
          return;
        }
        this.isRunning = true;
        btnAuto.textContent = "Hentikan";
        statusText.textContent = "Menjalankan kuis secara bertahap...";
        Toast.info("Mode auto-quiz aktif dengan jeda humanized anti-deteksi.");
        try {
          await this.runAutoLoop(statusText);
        } catch (e) {
          Toast.error(e.message);
        } finally {
          this.isRunning = false;
          btnAuto.textContent = "Auto Semua";
        }
      });
    }
    /**
     * Eksekusi loop menjawab seluruh soal dengan jeda natural manusia
     */
    async runAutoLoop(statusEl) {
      while (this.isRunning) {
        if (statusEl) statusEl.textContent = "Menganalisis soal...";
        const success = await this.processCurrentQuestion(true);
        if (!success) {
          if (statusEl) statusEl.textContent = "Selesai atau tidak ada soal aktif.";
          this.isRunning = false;
          break;
        }
        const nextBtn = DOM.findButtonByText(["selanjutnya", "next", "berikutnya"]);
        if (nextBtn) {
          if (statusEl) statusEl.textContent = "Menuju soal berikutnya...";
          await Humanizer.randomDelay(700, 1500);
          await Humanizer.naturalClick(nextBtn);
          await Humanizer.delay(1200);
        } else {
          this.isRunning = false;
          const finishBtn = DOM.findButtonByText(["selesai quiz", "selesai kuis", "selesai", "finish", "kumpulkan", "akhiri"]);
          if (finishBtn) {
            if (statusEl) statusEl.textContent = "Semua soal terjawab. Selesai!";
            Toast.success("Semua soal kuis berhasil dijawab dengan sukses!");
            const { mentari_auto_finish_quiz } = await Storage.get("mentari_auto_finish_quiz", { mentari_auto_finish_quiz: false });
            if (mentari_auto_finish_quiz) {
              await Humanizer.randomDelay(1500, 2500);
              await Humanizer.naturalClick(finishBtn);
              await Humanizer.delay(800);
              const confirmBtn = DOM.findButtonByText(["ya", "ok", "setuju", "submit", "kirim"]);
              if (confirmBtn) await Humanizer.naturalClick(confirmBtn);
            }
          } else {
            if (statusEl) statusEl.textContent = "Semua soal telah terjawab!";
            Toast.success("Seluruh nomor soal telah berhasil dijawab!");
          }
          break;
        }
      }
    }
    /**
     * Memproses satu soal kuis yang sedang terbuka di layar
     */
    async processCurrentQuestion(isAuto = false) {
      const questionContainer = this._findQuestionContainer();
      if (!questionContainer) {
        throw new Error("Elemen soal kuis tidak ditemukan pada halaman.");
      }
      const { questionText, options } = this._parseQuestionAndOptions(questionContainer);
      if (!questionText || options.length === 0) {
        throw new Error("Gagal mengekstrak teks pertanyaan atau opsi pilihan.");
      }
      const revealedIndex = options.findIndex((o) => {
        const parent = o.element?.closest(".MuiFormControlLabel-root, label, .MuiPaper-root, tr, div");
        if (!parent) return false;
        const html = parent.outerHTML.toLowerCase();
        const text = parent.textContent.toLowerCase();
        return parent.classList.contains("correct") || parent.classList.contains("is-correct") || parent.classList.contains("jawaban-benar") || parent.getAttribute("data-correct") === "true" || html.includes("green") || text.includes("(benar)") || text.includes("(kunci)");
      });
      if (revealedIndex !== -1) {
        const targetElement2 = options[revealedIndex].element;
        await Humanizer.naturalClick(targetElement2);
        Toast.success(`Kunci jawaban terdeteksi! Memilih [${options[revealedIndex].letter || revealedIndex + 1}]`);
        return true;
      }
      if (isAuto) {
        await Humanizer.readingPacing(questionText, 600, 1500);
      }
      const prompt = this._buildPrompt(questionText, options);
      const systemInstruction = `Kamu adalah pakar akademik berintelegensi tinggi. Analisis soal dengan sangat teliti dan pilih SATU jawaban yang 100% paling akurat dan benar. Format output HARUS HANYA HURUF OPSI DAN TEKS JAWABAN SAJA (contoh: "A" atau "B. Jakarta"). Tanpa penjelasan, tanpa pembuka atau penutup.`;
      const selectModel = this.shadow?.getElementById("quiz-select-model");
      const chosenModel = selectModel && selectModel.value && VALID_MODEL_IDS.includes(selectModel.value) ? selectModel.value : this.activeModel || DEFAULT_MODEL;
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "generateGeminiContent",
          prompt,
          systemInstruction,
          model: chosenModel
        }, resolve);
      });
      if (!response || !response.success) {
        throw new Error(response?.error || "Gagal memanggil Gemini AI.");
      }
      const bestOptionIndex = this._determineMatchingOption(response.text, options);
      if (bestOptionIndex === -1) {
        throw new Error("Tidak dapat mencocokkan respon AI dengan opsi kuis.");
      }
      const targetElement = options[bestOptionIndex].element;
      await Humanizer.naturalClick(targetElement);
      Toast.info(`Menjawab [${options[bestOptionIndex].letter || bestOptionIndex + 1}] via ${response.model || "Gemini"}`);
      return true;
    }
    _findQuestionContainer() {
      const candidates = [
        document.querySelector(".question-container"),
        document.querySelector('form[action*="exam"]'),
        document.querySelector(".MuiPaper-root:has(.MuiRadio-root)"),
        document.querySelector('.MuiPaper-root:has(input[type="radio"])'),
        document.querySelector('.MuiCard-root:has(input[type="radio"])'),
        document.querySelector("main .MuiBox-root:has(.MuiRadio-root)"),
        document.querySelector("div:has(> .MuiFormControl-root)"),
        document.body
      ];
      return candidates.find((c) => c && c.querySelector('input[type="radio"], .MuiRadio-root'));
    }
    _parseQuestionAndOptions(container) {
      let questionText = "";
      const textContainers = container.querySelectorAll(".MuiTypography-root, p, .soal-text");
      for (const el of textContainers) {
        if (el.closest(".MuiFormControlLabel-root, label")) continue;
        const t = el.textContent.trim();
        if (t.length > 10) {
          questionText = t;
          break;
        }
      }
      const options = [];
      const radioLabels = container.querySelectorAll('.MuiFormControlLabel-root, label:has(input[type="radio"])');
      radioLabels.forEach((labelEl, idx) => {
        const radioInput = labelEl.querySelector('input[type="radio"]') || labelEl;
        const labelText = labelEl.textContent.trim();
        const letterMatch = labelText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
        options.push({
          index: idx,
          letter: letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + idx),
          text: letterMatch ? letterMatch[2] : labelText,
          fullText: labelText,
          element: radioInput
        });
      });
      return { questionText, options };
    }
    _buildPrompt(questionText, options) {
      const formattedOptions = options.map((o) => `${o.letter}. ${o.text}`).join("\n");
      return `Soal:
${questionText}

Pilihan Jawaban:
${formattedOptions}

Jawaban yang benar adalah:`;
    }
    _determineMatchingOption(aiAnswer, options) {
      if (!aiAnswer) return -1;
      const cleanAnswer = aiAnswer.trim().toUpperCase();
      const letterMatch = cleanAnswer.match(/^([A-E])\b/);
      if (letterMatch) {
        const targetLetter = letterMatch[1];
        const matchIdx = options.findIndex((o) => o.letter === targetLetter);
        if (matchIdx !== -1) return matchIdx;
      }
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (cleanAnswer.includes(opt.text.toUpperCase()) || opt.text.toUpperCase().includes(cleanAnswer)) {
          return i;
        }
      }
      return 0;
    }
  };
  if (typeof window !== "undefined") {
    new QuizAssistant();
  }
})();
