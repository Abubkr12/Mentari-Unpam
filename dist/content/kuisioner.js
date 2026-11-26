(() => {
  // src/utils/dom.js
  var DOM = {
    /**
     * Mencari tombol berdasarkan teks kontennya (pengganti fatal bug :contains())
     * Aman dari DOMException / SyntaxError pada Chromium modern.
     */
    findButtonByText(keywords, root = document, includeDisabled = false) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const buttons = root.querySelectorAll('button, a, input[type="button"], input[type="submit"], div[role="button"], span[role="button"], .MuiButton-root, .MuiButtonBase-root');
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
      const buttons = root.querySelectorAll('button, a, input[type="button"], input[type="submit"], div[role="button"], span[role="button"], .MuiButton-root, .MuiButtonBase-root');
      for (const btn of buttons) {
        if (btn.offsetParent === null && !btn.getClientRects().length) continue;
        const text = (btn.textContent || btn.value || "").trim().toLowerCase();
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
    },
    /**
     * Mengisi value input atau textarea yang kompatibel dengan React Controlled Components
     */
    setNativeValue(element, value) {
      if (!element) return;
      const proto = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    /**
     * Mencentang radio button dengan React native property setter & synthetic events
     */
    setNativeRadioChecked(inputEl) {
      if (!inputEl) return;
      const input = inputEl.tagName === "INPUT" ? inputEl : inputEl.querySelector?.('input[type="radio"]') || inputEl;
      if (!input || input.tagName !== "INPUT") {
        try {
          inputEl.click();
        } catch (_) {
        }
        return;
      }
      const parentLabel = input.closest("label, .MuiFormControlLabel-root");
      const radioContainer = input.closest('.MuiRadio-root, [role="radio"]');
      if (input._valueTracker) {
        input._valueTracker.setValue("");
      }
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set;
      if (nativeSetter) {
        nativeSetter.call(input, true);
      } else {
        input.checked = true;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (parentLabel) {
        try {
          parentLabel.click();
        } catch (_) {
        }
      } else if (radioContainer) {
        try {
          radioContainer.click();
        } catch (_) {
        }
      } else {
        try {
          input.click();
        } catch (_) {
        }
      }
      if (!input.checked) {
        if (nativeSetter) nativeSetter.call(input, true);
        else input.checked = true;
      }
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
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
     * Dioptimalkan agar gesit dan responsif (350 - 600ms) tanpa membebani browser
     */
    async readingPacing(text = "", minBaseMs = 350, maxBaseMs = 700) {
      const wordCount = (text || "").trim().split(/\s+/).filter(Boolean).length;
      const calculated = minBaseMs + wordCount * 15;
      const targetMs = Math.min(Math.max(calculated, minBaseMs), maxBaseMs);
      const variance = (Math.random() * 0.2 - 0.1) * targetMs;
      const finalDelay = Math.round(targetMs + variance);
      await this.delay(finalDelay);
      return finalDelay;
    },
    /**
     * Mensimulasikan klik mouse natural manusia dengan scrolling halus
     * dan rangkaian event mouse lengkap (pointerdown -> mousedown -> focus -> click).
     * Mendukung mode fast untuk transisi cepat kuis.
     */
    async naturalClick(element, fast = false) {
      if (!element) return false;
      try {
        element.scrollIntoView({
          behavior: fast ? "auto" : "smooth",
          block: "center",
          inline: "nearest"
        });
      } catch {
      }
      await this.delay(fast ? 40 + Math.random() * 40 : 150 + Math.random() * 150);
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
        await this.delay(fast ? 20 + Math.random() * 20 : 40 + Math.random() * 30);
        element.dispatchEvent(new PointerEvent("pointerup", eventOpts));
        element.dispatchEvent(new MouseEvent("mouseup", eventOpts));
        if (typeof element.click === "function") {
          element.click();
        } else {
          element.dispatchEvent(new MouseEvent("click", eventOpts));
        }
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

  // src/utils/models.js
  var ACTIVE_FREE_MODELS = [
    {
      id: "gemini-4-hydrogen",
      name: "Gemini 4 Hydrogen",
      label: "Gemini 4 Hydrogen (Terbaru - Rekomendasi Free Tier)",
      desc: "Generasi 4 terbaru gratis di AI Studio, konteks 1M token, akurasi & kecepatan tinggi",
      thinkingLevels: ["low", "medium", "high", "xhigh"],
      defaultThinkingLevel: "low"
    },
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      label: "Gemini 3.8 Flash (Flagship Gen-3)",
      desc: "Flagship generasi 3 di Free Tier untuk penalaran kompleks",
      thinkingLevels: ["low", "medium", "high"],
      defaultThinkingLevel: "low"
    },
    {
      id: "gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      label: "Gemini 3.6 Flash (Seimbang)",
      desc: "Seimbang antara kecepatan respon dan pemahaman teks",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash-Lite",
      label: "Gemini 3.5 Flash-Lite (Kuota Tinggi)",
      desc: "Model ringan untuk eksekusi berulang dengan kuota harian tinggi",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash-Lite",
      label: "Gemini 3.1 Flash-Lite (Ringan & Cepat)",
      desc: "Latensi rendah dan hemat token di Free Tier",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      label: "Gemini 3 Flash Preview (Free Tier)",
      desc: "Varian preview cepat yang tersedia gratis di AI Studio",
      thinkingLevels: ["minimal", "low", "medium", "high"],
      defaultThinkingLevel: "minimal"
    }
  ];
  var VALID_FREE_MODEL_IDS = ACTIVE_FREE_MODELS.map((m) => m.id);

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
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
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
    /**
     * Mengambil semua data dari chrome.storage.local (atau fallback localStorage)
     */
    async getAll() {
      return new Promise((resolve) => {
        try {
          if (this.isContextValid() && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(null, (result) => {
              if (chrome.runtime?.lastError) {
                console.log("[Storage] Info reading all storage:", chrome.runtime.lastError.message);
                resolve(this._getAllLocalStorageFallback());
              } else {
                resolve(result || {});
              }
            });
          } else {
            resolve(this._getAllLocalStorageFallback());
          }
        } catch (e) {
          resolve(this._getAllLocalStorageFallback());
        }
      });
    },
    _getAllLocalStorageFallback() {
      const res = {};
      if (typeof localStorage === "undefined") return res;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
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
      }
      return res;
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
      const sensitiveKeys = [
        "geminiApiKey",
        "geminiApiKeys",
        "mentari_auth_token",
        "mentari_smart_question_memory",
        "mentari_completed_quiz_ids",
        "mentari_auto_pilot_state"
      ];
      for (const [k, v] of Object.entries(items)) {
        if (sensitiveKeys.includes(k)) continue;
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
        const validModels = VALID_FREE_MODEL_IDS;
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
        try {
          localStorage.removeItem("geminiApiKey");
        } catch {
        }
        console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };
  var AutoPilotState = {
    KEY: "mentari_auto_pilot_state",
    async get() {
      const res = await Storage.get(this.KEY);
      const state = res?.[this.KEY];
      if (state && typeof state === "object" && Array.isArray(state.queue)) {
        return state;
      }
      return null;
    },
    async set(state) {
      return Storage.set({ [this.KEY]: state });
    },
    async reset() {
      return Storage.set({
        [this.KEY]: {
          active: false,
          finished: false,
          paused: false,
          queue: [],
          currentIndex: 0,
          pauseReason: null,
          updatedAt: Date.now()
        }
      });
    },
    async pause(reason = "Terjeda") {
      const state = await this.get();
      if (!state) return null;
      state.paused = true;
      state.pauseReason = reason;
      state.updatedAt = Date.now();
      await this.set(state);
      return state;
    },
    async resume() {
      const state = await this.get();
      if (!state) return null;
      state.active = true;
      state.paused = false;
      state.pauseReason = null;
      state.updatedAt = Date.now();
      await this.set(state);
      return state;
    }
  };

  // src/utils/theme.js
  var ThemeHelper = {
    detectSystemTheme() {
      try {
        if (typeof window !== "undefined" && window.matchMedia) {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
      } catch {
      }
      return "light";
    },
    async getEffectiveTheme() {
      try {
        const res = await Storage.get("mentari_theme", { mentari_theme: null });
        const saved = res?.mentari_theme;
        if (saved === "light" || saved === "dark") {
          return saved;
        }
      } catch {
      }
      return this.detectSystemTheme();
    },
    async setManualTheme(theme) {
      if (theme !== "light" && theme !== "dark") return;
      await Storage.set({ mentari_theme: theme });
      try {
        window.dispatchEvent(new CustomEvent("mentari-theme-changed", { detail: { theme } }));
      } catch {
      }
    },
    watchTheme(callback) {
      if (typeof callback !== "function") return;
      try {
        if (typeof window !== "undefined" && window.matchMedia) {
          const mq = window.matchMedia("(prefers-color-scheme: dark)");
          const onMediaChange = async () => {
            const res = await Storage.get("mentari_theme", { mentari_theme: null });
            if (!res?.mentari_theme) {
              callback(this.detectSystemTheme());
            }
          };
          if (mq.addEventListener) mq.addEventListener("change", onMediaChange);
          else if (mq.addListener) mq.addListener(onMediaChange);
        }
      } catch {
      }
      try {
        window.addEventListener("mentari-theme-changed", (e) => {
          if (e.detail?.theme) callback(e.detail.theme);
        });
      } catch {
      }
      try {
        if (Storage.isContextValid() && chrome.storage?.onChanged) {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes.mentari_theme?.newValue) {
              callback(changes.mentari_theme.newValue);
            }
          });
        }
      } catch {
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
      /* Light Theme */
      .toast-card.theme-light {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .toast-card.theme-light .toast-title { color: #0f172a; }
      .toast-card.theme-light .toast-message { color: #475569; }
      .toast-card.theme-light .toast-close:hover { color: #0f172a; }
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
      const isLightSync = ThemeHelper.detectSystemTheme() === "light";
      card.className = `toast-card toast-${type} ${isLightSync ? "theme-light" : ""}`;
      ThemeHelper.getEffectiveTheme().then((t) => {
        card.classList.toggle("theme-light", t === "light");
      }).catch(() => {
      });
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

  // src/utils/unpam-auth.js
  var UnpamAuth = {
    _cachedToken: null,
    _activeAccountId: null,
    _snifferInjected: false,
    /**
     * Mendekode payload JWT secara aman dengan normalisasi Base64URL
     */
    decodeJwtPayload(token) {
      if (!token || typeof token !== "string") return null;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      try {
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const jsonStr = decodeURIComponent(
          atob(b64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
        );
        return JSON.parse(jsonStr);
      } catch (e) {
        return null;
      }
    },
    /**
     * Memeriksa validitas dan masa berlaku (exp) token JWT
     */
    isTokenValid(token) {
      if (!token || typeof token !== "string") return false;
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        const parts = token.split(".");
        return parts.length === 3 && parts[1].length > 10;
      }
      if (typeof payload.exp === "number") {
        const isExpired = payload.exp * 1e3 <= Date.now() + 3e4;
        if (isExpired) {
          console.log("[UnpamAuth] Token kedaluwarsa (exp:", payload.exp, "now:", Math.floor(Date.now() / 1e3), ")");
          return false;
        }
      }
      return true;
    },
    /**
     * Mendapatkan identitas mahasiswa (NIM/ID) dari payload token
     */
    getUserIdentifier(token) {
      const payload = this.decodeJwtPayload(token);
      return payload?.nim || payload?.username || payload?.id || payload?.sub || "default";
    },
    /**
     * Menghapus token usang/tidak valid dari memori dan storage
     */
    clearInvalidToken() {
      this._cachedToken = null;
      if (typeof window !== "undefined") {
        delete window.lastAuthToken;
        try {
          window.dispatchEvent(new CustomEvent("mentari-token-invalidated"));
        } catch {
        }
      }
      try {
        localStorage.removeItem("mentari_auth_token");
        sessionStorage.removeItem("mentari_auth_token");
      } catch {
      }
      Storage.remove(["mentari_auth_token", "access"]);
    },
    // Scan native Mentari storage keys before extension cache so account switches take effect immediately.
    getLiveStorageToken() {
      if (typeof localStorage === "undefined") return null;
      try {
        for (const priorityKey of ["access", "token"]) {
          const val = localStorage.getItem(priorityKey);
          const extracted = this._extractJwtFromValue(val, priorityKey);
          if (extracted && this.isTokenValid(extracted)) {
            return extracted;
          }
        }
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || key.startsWith("mentari_")) continue;
          const val = localStorage.getItem(key);
          const extracted = this._extractJwtFromValue(val, key);
          if (extracted && this.isTokenValid(extracted)) {
            return extracted;
          }
        }
      } catch (e) {
        console.log("[UnpamAuth] Live storage scan info:", e.message);
      }
      return null;
    },
    _clearStaleAccountSession() {
      this._cachedToken = null;
      if (typeof window !== "undefined") {
        delete window.lastAuthToken;
      }
      try {
        localStorage.removeItem("mentari_auth_token");
        localStorage.removeItem("mentari_user_info");
        sessionStorage.removeItem("mentari_auth_token");
      } catch {
      }
      Storage.remove(["mentari_auth_token", "mentari_user_info", "mentari_cached_courses", "mentari_cached_forums", "access"]);
    },
    _detectAccountSwitch(token) {
      if (!token) return null;
      const nextId = this.getUserIdentifier(token);
      if (!nextId || nextId === "default") return null;
      let prevId = this._activeAccountId;
      if (!prevId && typeof localStorage !== "undefined") {
        try {
          const prevRaw = localStorage.getItem("mentari_auth_token");
          if (prevRaw && prevRaw !== token) {
            const parsedPrevId = this.getUserIdentifier(prevRaw);
            if (parsedPrevId && parsedPrevId !== "default") prevId = parsedPrevId;
          }
        } catch {
        }
      }
      this._activeAccountId = nextId;
      if (prevId && prevId !== "default" && prevId !== nextId) {
        return { prevUserId: prevId, nextUserId: nextId };
      }
      return null;
    },
    /**
     * Mengambil token autentikasi (JWT) mahasiswa dari berbagai sumber
     */
    async getAuthToken() {
      const liveToken = this.getLiveStorageToken();
      if (liveToken) {
        if (liveToken !== this._cachedToken) {
          this._saveCapturedToken(liveToken);
        }
        return liveToken;
      }
      if (this._cachedToken) {
        if (this.isTokenValid(this._cachedToken)) {
          return this._cachedToken;
        }
        this.clearInvalidToken();
      }
      if (typeof window !== "undefined" && window.lastAuthToken) {
        if (this.isTokenValid(window.lastAuthToken)) {
          this._cachedToken = window.lastAuthToken;
          return this._cachedToken;
        }
        delete window.lastAuthToken;
      }
      if (typeof localStorage !== "undefined") {
        const directLocal = localStorage.getItem("mentari_auth_token");
        if (directLocal && directLocal.startsWith("eyJ")) {
          if (this.isTokenValid(directLocal)) {
            this._saveCapturedToken(directLocal);
            return directLocal;
          } else {
            try {
              localStorage.removeItem("mentari_auth_token");
            } catch {
            }
          }
        }
      }
      const stored = await Storage.get(["mentari_auth_token", "access"]);
      if (stored.mentari_auth_token) {
        if (this.isTokenValid(stored.mentari_auth_token)) {
          this._cachedToken = stored.mentari_auth_token;
          this._activeAccountId = this._activeAccountId || this.getUserIdentifier(stored.mentari_auth_token);
          return this._cachedToken;
        } else {
          Storage.remove("mentari_auth_token");
        }
      }
      if (stored.access) {
        if (this.isTokenValid(stored.access)) {
          this._cachedToken = stored.access;
          this._activeAccountId = this._activeAccountId || this.getUserIdentifier(stored.access);
          return this._cachedToken;
        } else {
          Storage.remove("access");
        }
      }
      if (typeof localStorage !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan localStorage info:", e.message);
        }
      }
      if (typeof sessionStorage !== "undefined") {
        try {
          const directSession = sessionStorage.getItem("mentari_auth_token");
          if (directSession && directSession.startsWith("eyJ") && this.isTokenValid(directSession)) {
            this._saveCapturedToken(directSession);
            return directSession;
          }
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const val = sessionStorage.getItem(key);
            const extracted = this._extractJwtFromValue(val, key);
            if (extracted && this.isTokenValid(extracted)) {
              this._saveCapturedToken(extracted);
              return extracted;
            }
          }
        } catch (e) {
          console.log("[UnpamAuth] Scan sessionStorage info:", e.message);
        }
      }
      if (typeof document !== "undefined" && document.cookie) {
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const parts = cookie.trim().split("=");
          if (parts.length >= 2) {
            const cVal = decodeURIComponent(parts.slice(1).join("="));
            if (cVal.includes("eyJ")) {
              const extracted = this._extractJwtFromValue(cVal);
              if (extracted && this.isTokenValid(extracted)) {
                this._saveCapturedToken(extracted);
                return extracted;
              }
            }
          }
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
      }
      return null;
    },
    /**
     * Mengambil XSRF-TOKEN dari cookie untuk MyUnpam
     */
    getXsrfToken() {
      if (typeof document === "undefined" || !document.cookie) return "";
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const trimmed = c.trim();
        if (trimmed.startsWith("XSRF-TOKEN=")) {
          return decodeURIComponent(trimmed.substring(11));
        }
      }
      return "";
    },
    /**
     * Menyiapkan opsi header lengkap untuk request ke API UNPAM
     */
    async getFetchOptions(extraHeaders = {}) {
      const token = await this.getAuthToken();
      const xsrf = this.getXsrfToken();
      const headers = {
        "Accept": "application/json, text/plain, */*",
        ...extraHeaders
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
      }
      return {
        headers,
        credentials: "include"
      };
    },
    /**
     * Alias kompatibilitas untuk getToken
     */
    async getToken() {
      return this.getAuthToken();
    },
    /**
     * Alias kompatibilitas untuk getXSRFToken
     */
    getXSRFToken() {
      return this.getXsrfToken();
    },
    /**
     * Pasang pendengar event dari Main World Sniffer dan fallback DOM injection
     */
    installLiveSniffer() {
      if (typeof window === "undefined" || this._listenersInstalled) return;
      this._listenersInstalled = true;
      const self = this;
      window.addEventListener("mentari-token-captured", (e) => {
        const token = e.detail?.token || e.detail;
        if (token && typeof token === "string") {
          self._saveCapturedToken(token);
        }
      });
      window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "MENTARI_TOKEN_CAPTURED" && e.data.token) {
          self._saveCapturedToken(e.data.token);
        }
      });
      if (!this._snifferInjected && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
        this._snifferInjected = true;
        try {
          const scriptId = "mentari-injected-sniffer";
          if (!document.getElementById(scriptId)) {
            const s = document.createElement("script");
            s.id = scriptId;
            const isDist = chrome.runtime.getURL("manifest.json").includes("/dist/") || !chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0]?.startsWith("dist/");
            s.src = chrome.runtime.getURL(isDist ? "content/main-sniffer.js" : "dist/content/main-sniffer.js");
            (document.head || document.documentElement).appendChild(s);
          }
        } catch (err) {
          console.log("[UnpamAuth] Fallback sniffer injection notice:", err.message);
        }
      }
      if (window.XMLHttpRequest && XMLHttpRequest.prototype.setRequestHeader) {
        const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
          if (header && typeof header === "string" && header.toLowerCase() === "authorization") {
            if (value && typeof value === "string" && value.includes("Bearer ")) {
              const token = value.split("Bearer ")[1]?.trim();
              if (token && token.startsWith("eyJ")) {
                self._saveCapturedToken(token);
              }
            }
          }
          return originalSetHeader.apply(this, arguments);
        };
      }
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function(resource, config) {
          try {
            if (config && config.headers) {
              let authHeader = null;
              if (config.headers instanceof Headers) {
                authHeader = config.headers.get("authorization") || config.headers.get("Authorization");
              } else if (typeof config.headers === "object") {
                authHeader = config.headers["authorization"] || config.headers["Authorization"];
              }
              if (authHeader && typeof authHeader === "string" && authHeader.includes("Bearer ")) {
                const token = authHeader.split("Bearer ")[1]?.trim();
                if (token && token.startsWith("eyJ")) {
                  self._saveCapturedToken(token);
                }
              }
            }
          } catch {
          }
          return originalFetch.apply(this, arguments);
        };
      }
    },
    _extractJwtFromValue(val, keyName = "") {
      if (!val || typeof val !== "string") return null;
      let clean = val.trim();
      if (clean.startsWith('"') && clean.endsWith('"') || clean.startsWith("'") && clean.endsWith("'")) {
        clean = clean.slice(1, -1);
      }
      if (clean.startsWith("eyJ") && clean.split(".").length === 3) {
        return clean;
      }
      if (clean.includes("Bearer eyJ")) {
        const m = clean.match(/Bearer\s+(eyJ[a-zA-Z0-9_\-\.]+)/);
        if (m) return m[1];
      }
      if (clean.startsWith("[") && clean.endsWith("]")) {
        try {
          const arr = JSON.parse(clean);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (typeof item === "string" && item.startsWith("eyJ") && item.split(".").length === 3) {
                return item;
              }
              if (item && typeof item === "object") {
                const candidates = [item.token, item.access_token, item.accessToken, item.jwt, item.access, item.authToken];
                for (const c of candidates) {
                  if (typeof c === "string" && c.startsWith("eyJ") && c.split(".").length === 3) {
                    return c;
                  }
                }
              }
            }
          }
        } catch {
        }
      }
      if (clean.startsWith("{") && clean.endsWith("}")) {
        try {
          const obj = JSON.parse(clean);
          const candidates = [obj.token, obj.access_token, obj.accessToken, obj.jwt, obj.access, obj.authToken];
          for (const c of candidates) {
            if (typeof c === "string" && c.startsWith("eyJ")) {
              return c;
            }
          }
        } catch {
        }
      }
      return null;
    },
    _saveCapturedToken(token) {
      if (!token || !this.isTokenValid(token)) return;
      const switchInfo = this._detectAccountSwitch(token);
      if (switchInfo) {
        this._clearStaleAccountSession();
      }
      this._cachedToken = token;
      if (typeof window !== "undefined") {
        window.lastAuthToken = token;
      }
      try {
        localStorage.setItem("mentari_auth_token", token);
      } catch {
      }
      Storage.set({ mentari_auth_token: token });
      if (switchInfo && typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("mentari-account-switched", { detail: switchInfo }));
        } catch {
        }
      }
    }
  };
  if (typeof window !== "undefined") {
    UnpamAuth.installLiveSniffer();
  }

  // src/utils/autopilot-sync.js
  var AutoPilotSync = {
    /**
     * Memindai API Mentari UNPAM untuk menemukan kuesioner yang baru terbuka (unlocked)
     * @param {Object} options
     * @param {Array} options.coursesMeta - List of { code, title }
     * @param {Array} options.currentQueue - Current queue items to prevent duplication
     * @returns {Promise<Array>} List of newly unlocked kuesioner queue items
     */
    async fetchUnlockedKuesionerList({ coursesMeta = [], currentQueue = [] } = {}) {
      try {
        const token = await UnpamAuth.getAuthToken();
        if (!token) {
          console.warn("[AutoPilotSync] Token autentikasi tidak ditemukan.");
          return [];
        }
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        };
        let targetCourses = Array.isArray(coursesMeta) && coursesMeta.length > 0 ? [...coursesMeta] : [];
        if (targetCourses.length === 0) {
          try {
            const res = await fetch("https://mentari.unpam.ac.id/api/user-course?page=1&limit=50", { headers });
            if (res.ok) {
              const data = await res.json();
              const list = data.data || (Array.isArray(data) ? data : []);
              targetCourses = list.map((c) => ({
                code: c.kode_course || c.kode || c.course_code || c.id,
                title: c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah"
              })).filter((c) => c.code);
            }
          } catch (e) {
            console.warn("[AutoPilotSync] Gagal memuat daftar user-course fallback:", e);
          }
        }
        if (targetCourses.length === 0) return [];
        const newlyUnlocked = [];
        const existingIds = new Set(
          (currentQueue || []).map((q) => String(q.id || q.subId || ""))
        );
        await Promise.allSettled(targetCourses.map(async (c) => {
          try {
            const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(c.code)}`, { headers });
            if (!cRes.ok) return;
            const cData = await cRes.json();
            const sections = Array.isArray(cData) ? cData : cData.data || [];
            for (const section of sections) {
              let meetingNum = null;
              const match = (section.nama_section || "").match(/(?:Pertemuan|Meeting)\s*(\d+)/i);
              if (match) {
                meetingNum = parseInt(match[1], 10);
              } else if (typeof section.urutan === "number" && section.urutan > 0) {
                meetingNum = section.urutan;
              }
              const sectionName = section.nama_section || (meetingNum ? `Pertemuan ${meetingNum}` : `Pertemuan ${section.urutan || ""}`);
              const sectionCode = section.kode_section || section.nama_section || section.id;
              const subSections = section.sub_section || [];
              for (const sub of subSections) {
                const kt = String(sub.kode_template || sub.template || sub.type || sub.tipe || sub.kode_sub_section || "").trim().toUpperCase();
                const subTitle = String(sub.nama_sub_section || sub.judul || sub.title || sub.name || sub.deskripsi || "").toLowerCase();
                const isKues = kt.includes("KUES") || kt.includes("KUIS") || kt.includes("SURV") || kt.includes("ANGKET") || kt.includes("EVAL") || kt.includes("EDOM") || subTitle.includes("kuesioner") || subTitle.includes("kuisioner") || subTitle.includes("evaluasi") || subTitle.includes("angket") || subTitle.includes("survei") || subTitle.includes("survey") || subTitle.includes("edom");
                const validSubId = sub.id || sub._id || sub.id_sub_section || sub.sub_id || `KUESIONER_${meetingNum || section.urutan || "sec"}`;
                if (isKues && validSubId) {
                  const subIdStr = String(validSubId);
                  const isPostTestAlert = sub.warningAlert && /post[- ]?test/i.test(sub.warningAlert);
                  const isHardLocked = !!(sub.warningAlert && sub.warningAlert.length > 0 && !isPostTestAlert);
                  let isLmsCompleted = false;
                  if (!isPostTestAlert) {
                    isLmsCompleted = Boolean(
                      sub.completion === true || sub.completion === 1 || sub.completion === "1" || sub.completion === "true" || sub.is_completed === true || sub.completed === true || sub.is_done === true || sub.status === "completed" || sub.status === "done" || Array.isArray(sub.history) && sub.history.length > 0
                    );
                  }
                  if (!isLmsCompleted && !isHardLocked && !existingIds.has(subIdStr)) {
                    existingIds.add(subIdStr);
                    newlyUnlocked.push({
                      id: validSubId,
                      subId: validSubId,
                      sectionCode,
                      courseCode: c.code,
                      courseTitle: c.title,
                      sectionName,
                      meetingNum,
                      type: "KUESIONER",
                      name: sub.nama_sub_section || sub.judul || "Kuesioner Evaluasi Dosen",
                      url: `https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(c.code)}/kuesioner/${encodeURIComponent(sectionCode || validSubId)}`,
                      status: "pending",
                      statusLabel: "Siap Diisi"
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`[AutoPilotSync] Gagal memuat section matkul ${c.code}:`, err);
          }
        }));
        newlyUnlocked.sort((a, b) => {
          const numA = typeof a.meetingNum === "number" ? a.meetingNum : 999;
          const numB = typeof b.meetingNum === "number" ? b.meetingNum : 999;
          return numA - numB;
        });
        return newlyUnlocked;
      } catch (e) {
        console.error("[AutoPilotSync] Error saat fetch kuesioner terbuka:", e);
        return [];
      }
    },
    /**
     * Real-Time Sweep & Queue Replenishment
     * Menambahkan kuesioner yang baru terbuka ke dalam antrean Auto-Pilot
     * @param {Object} state - Current AutoPilot state
     * @param {HTMLElement} [statusEl] - Optional status element to show progress
     * @returns {Promise<boolean>} True jika ada kuesioner yang berhasil ditambahkan ke antrean
     */
    async syncAndAppendKuesioner(state, statusEl = null) {
      if (!state || !state.active || !Array.isArray(state.queue)) return false;
      if (statusEl) {
        statusEl.textContent = "Sinkronisasi Real-Time: Memeriksa kuesioner yang baru terbuka di server UNPAM...";
      }
      await new Promise((r) => setTimeout(r, 1200));
      const newlyUnlocked = await this.fetchUnlockedKuesionerList({
        coursesMeta: state.coursesMeta,
        currentQueue: state.queue
      });
      if (newlyUnlocked.length > 0) {
        console.log(`[AutoPilotSync] Berhasil mendeteksi ${newlyUnlocked.length} kuesioner baru yang terbuka:`, newlyUnlocked);
        state.queue.push(...newlyUnlocked);
        state.total = state.queue.length;
        state.updatedAt = Date.now();
        await AutoPilotState.set(state);
        if (statusEl) {
          statusEl.textContent = `Sinkronisasi sukses! Menemukan ${newlyUnlocked.length} kuesioner yang siap dikerjakan.`;
        }
        return true;
      }
      console.log("[AutoPilotSync] Tidak ditemukan kuesioner baru yang terbuka.");
      return false;
    }
  };

  // src/content/kuisioner.js
  var KuisionerAssistant = class {
    constructor() {
      this.isProcessing = false;
      this.isPaused = false;
      this.isAutoPilot = false;
      this.hudHost = null;
      this.hudShadow = null;
      this.shadow = null;
      this.currentTheme = ThemeHelper.detectSystemTheme();
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] Kuisioner Assistant siap.");
      this.currentTheme = await ThemeHelper.getEffectiveTheme();
      ThemeHelper.watchTheme((t) => {
        this.currentTheme = t;
        this._applyTheme(t);
      });
      this._injectFloatingCard();
      this._applyTheme(this.currentTheme);
      await this._checkAndInitAutoPilot();
    }
    _applyTheme(theme = this.currentTheme) {
      const isLight = theme === "light";
      this.shadow?.querySelector(".kues-card")?.classList.toggle("theme-light", isLight);
      this.hudShadow?.querySelector(".hud-card")?.classList.toggle("theme-light", isLight);
    }
    _injectFloatingCard() {
      if (document.getElementById("mentari-kuisioner-card-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-kuisioner-card-host";
      host.style.position = "fixed";
      host.style.bottom = "72px";
      host.style.right = "24px";
      host.style.zIndex = "2147483640";
      this.shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.35);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(16, 185, 129, 0.65);
      }
      ::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(16, 185, 129, 0.35) transparent;
      }

      .kues-card {
        background: rgba(18, 18, 22, 0.96);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(16, 185, 129, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 260px;
      }
      .kues-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: grab;
        user-select: none;
      }
      .kues-title {
        font-size: 13px;
        font-weight: 700;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kues-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .kues-icon-btn {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .kues-icon-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .kues-icon-btn.close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.45);
        color: #fca5a5;
      }
      .status-text {
        font-size: 11px;
        color: #aaa;
        line-height: 1.3;
      }
      .actions-grid {
        display: flex;
        gap: 8px;
      }
      .btn-mode {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
      }
      .btn-mode:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }
      .btn-iya {
        background: #10b981;
        color: #fff;
      }
      .btn-iya:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
      .btn-tidak {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.35);
      }
      .btn-tidak:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.35);
        transform: translateY(-1px);
      }
      .kues-card.theme-light {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #cbd5e1;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .kues-card.theme-light .kues-title {
        color: #1e3a8a;
      }
      .kues-card.theme-light .status-text {
        color: #475569;
      }
      .kues-card.theme-light .btn-iya {
        background: #047857;
        color: #ffffff;
      }
      .kues-card.theme-light .btn-iya:hover:not(:disabled) {
        background: #065f46;
        box-shadow: 0 4px 12px rgba(4, 120, 87, 0.28);
      }
      .kues-card.theme-light .btn-tidak {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .kues-card.theme-light .btn-tidak:hover:not(:disabled) {
        background: #fee2e2;
      }
      .kues-card.theme-light .kues-icon-btn {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }
      .kues-card.theme-light .kues-icon-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .kues-card.theme-light .kues-icon-btn.close:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      .kues-card.theme-light ::-webkit-scrollbar-thumb {
        background: rgba(30, 58, 138, 0.28);
      }
      .kues-card.minimized {
        min-width: 215px;
        padding: 10px 14px;
        gap: 6px;
      }
      .kues-card.minimized .actions-grid {
        display: none !important;
      }
      .kues-card.minimized .status-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
    `;
      const card = document.createElement("div");
      card.className = `kues-card ${this.currentTheme === "light" ? "theme-light" : ""}`;
      card.innerHTML = `
      <div class="kues-header">
        <div class="kues-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          Mentari Kuisioner
        </div>
        <div class="kues-header-actions">
          <button class="kues-icon-btn" id="kues-btn-minimize" type="button" title="Perkecil panel" aria-label="Perkecil panel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="kues-icon-btn close" id="kues-btn-close" type="button" title="Tutup panel" aria-label="Tutup panel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div class="status-text" id="kues-status">Pilih preferensi pengisian:</div>
      <div class="actions-grid">
        <button class="btn-mode btn-iya" id="btn-auto-iya" type="button" title="Opsi Ya / Rating Tertinggi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Auto Iya
        </button>
        <button class="btn-mode btn-tidak" id="btn-auto-tidak" type="button" title="Opsi Tidak / Rating Terendah">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Auto Tidak
        </button>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(card);
      document.body.appendChild(host);
      this._makeElementDraggable(host, card.querySelector(".kues-header"));
      const btnMin = this.shadow.getElementById("kues-btn-minimize");
      const btnClose = this.shadow.getElementById("kues-btn-close");
      btnMin?.addEventListener("click", () => {
        const minimized = card.classList.toggle("minimized");
        btnMin.title = minimized ? "Perbesar panel" : "Perkecil panel";
        btnMin.setAttribute("aria-label", btnMin.title);
        btnMin.innerHTML = minimized ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      });
      btnClose?.addEventListener("click", () => {
        this.isProcessing = false;
        host.style.display = "none";
      });
      const btnIya = this.shadow.getElementById("btn-auto-iya");
      const btnTidak = this.shadow.getElementById("btn-auto-tidak");
      const statusText = this.shadow.getElementById("kues-status");
      const setButtonsDisabled = (disabled) => {
        btnIya.disabled = disabled;
        btnTidak.disabled = disabled;
      };
      btnIya.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        setButtonsDisabled(true);
        statusText.textContent = 'Mengisi opsi "Ya / Sangat Baik"...';
        try {
          await this.fillKuisioner("iya");
          statusText.textContent = "Mengirim & memverifikasi kuisioner...";
          const verify = await this._submitAndVerifyKuisioner();
          if (verify.success) {
            statusText.textContent = "Kuesioner terverifikasi sukses terkirim!";
            Toast.success("Kuisioner berhasil diisi & diverifikasi terkirim!");
          } else {
            statusText.textContent = "Gagal verifikasi: " + verify.reason;
            Toast.error("Submit kuesioner belum berhasil: " + verify.reason);
          }
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error("Gagal mengisi: " + e.message);
        } finally {
          this.isProcessing = false;
          setButtonsDisabled(false);
        }
      });
      btnTidak.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;
        setButtonsDisabled(true);
        statusText.textContent = 'Mengisi opsi "Tidak"...';
        try {
          await this.fillKuisioner("tidak");
          statusText.textContent = "Mengirim & memverifikasi kuisioner...";
          const verify = await this._submitAndVerifyKuisioner();
          if (verify.success) {
            statusText.textContent = "Kuesioner terverifikasi sukses terkirim!";
            Toast.success("Kuisioner berhasil diisi & diverifikasi terkirim!");
          } else {
            statusText.textContent = "Gagal verifikasi: " + verify.reason;
            Toast.error("Submit kuesioner belum berhasil: " + verify.reason);
          }
        } catch (e) {
          statusText.textContent = "Gagal: " + e.message;
          Toast.error("Gagal mengisi: " + e.message);
        } finally {
          this.isProcessing = false;
          setButtonsDisabled(false);
        }
      });
    }
    /**
     * Menunggu kesiapan form kuesioner atau mendeteksi jika kuesioner telah selesai
     * @param {number} maxWaitMs
     * @returns {Promise<{ ready: boolean, alreadyCompleted: boolean }>}
     */
    async _waitForKuesionerReady(maxWaitMs = 12e3) {
      const startTime = Date.now();
      const alreadyCompletedKeywords = [
        "anda sudah mengisi",
        "telah mengisi kuesioner",
        "sudah mengisi evaluasi",
        "terima kasih telah mengisi",
        "kuesioner telah diisi",
        "kuisioner telah diisi",
        "evaluasi telah selesai",
        "anda telah menyelesaikan",
        "sudah diselesaikan"
      ];
      while (Date.now() - startTime < maxWaitMs) {
        const pageText = (document.body.innerText || "").toLowerCase();
        if (alreadyCompletedKeywords.some((kw) => pageText.includes(kw))) {
          return { ready: false, alreadyCompleted: true };
        }
        const hasLoading = pageText.includes("menunggu...") || pageText.includes("memproses...") || document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"]') !== null;
        if (hasLoading) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const radios = document.querySelectorAll('input[type="radio"], [role="radio"]');
        if (radios.length > 0) {
          await new Promise((r) => setTimeout(r, 350));
          return { ready: true, alreadyCompleted: false };
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      const finalPageText = (document.body.innerText || "").toLowerCase();
      if (alreadyCompletedKeywords.some((kw) => finalPageText.includes(kw))) {
        return { ready: false, alreadyCompleted: true };
      }
      return { ready: false, alreadyCompleted: false };
    }
    /**
     * Ekstraksi teks label/opsi untuk sebuah radio button secara komprehensif
     * Mencakup label, .MuiFormControlLabel-root, label[for], aria-labelledby, sibling text, dan parent text.
     */
    _getRadioText(radioEl) {
      if (!radioEl) return "";
      const input = radioEl.tagName === "INPUT" ? radioEl : radioEl.querySelector?.('input[type="radio"]') || radioEl;
      const pieces = [];
      const labelParent = input.closest?.("label, .MuiFormControlLabel-root");
      if (labelParent) pieces.push(labelParent.textContent);
      if (input.id) {
        try {
          const forLabel = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
          if (forLabel) pieces.push(forLabel.textContent);
        } catch (_) {
        }
      }
      const labelledBy = input.getAttribute?.("aria-labelledby") || input.closest?.(".MuiRadio-root")?.getAttribute?.("aria-labelledby");
      if (labelledBy) {
        const el = document.getElementById(labelledBy);
        if (el) pieces.push(el.textContent);
      }
      if (input.getAttribute?.("aria-label")) pieces.push(input.getAttribute("aria-label"));
      if (input.getAttribute?.("title")) pieces.push(input.getAttribute("title"));
      if (input.value && !["on", "off"].includes(input.value.toLowerCase())) pieces.push(input.value);
      const radioContainer = input.closest?.('.MuiRadio-root, [role="radio"]') || input;
      let nextSib = radioContainer.nextElementSibling;
      while (nextSib && !nextSib.querySelector?.('input[type="radio"]') && !nextSib.classList?.contains?.("MuiRadio-root")) {
        pieces.push(nextSib.textContent);
        nextSib = nextSib.nextElementSibling;
      }
      let prevSib = radioContainer.previousElementSibling;
      while (prevSib && !prevSib.querySelector?.('input[type="radio"]') && !prevSib.classList?.contains?.("MuiRadio-root")) {
        pieces.push(prevSib.textContent);
        prevSib = prevSib.previousElementSibling;
      }
      const immediateParent = radioContainer.parentElement;
      if (immediateParent && !immediateParent.matches?.('[role="radiogroup"], .MuiFormGroup-root, tr, tbody, table, body')) {
        if (immediateParent.querySelectorAll('input[type="radio"]').length <= 1) {
          pieces.push(immediateParent.textContent);
        }
      }
      return pieces.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
    }
    /**
     * Deteksi apakah sebuah radio button tercentang (mendukung native input, MUI classes, dan SVG icon)
     */
    _isRadioChecked(r) {
      if (!r) return false;
      const input = r.tagName === "INPUT" ? r : r.querySelector?.('input[type="radio"]') || r;
      if (input && input.checked) return true;
      const muiContainer = r.closest?.('.MuiRadio-root, .PrivateSwitchBase-root, [role="radio"]') || r.parentElement;
      if (muiContainer) {
        if (muiContainer.classList?.contains?.("Mui-checked") || muiContainer.classList?.contains?.("PrivateSwitchBase-checked")) {
          return true;
        }
        if (muiContainer.getAttribute?.("aria-checked") === "true") {
          return true;
        }
        if (muiContainer.querySelector?.('.Mui-checked, .PrivateSwitchBase-checked, [aria-checked="true"]')) {
          return true;
        }
        if (muiContainer.querySelector?.('svg[data-testid="RadioButtonCheckedIcon"]')) {
          return true;
        }
        const paths = muiContainer.querySelectorAll("svg path");
        if (paths.length > 1) {
          return true;
        }
        for (const p of paths) {
          const d = p.getAttribute("d") || "";
          if (d.includes("M12 7") || d.includes("M12 2C6.48") && paths.length > 1) {
            return true;
          }
        }
      }
      const muiLabel = r.closest?.(".MuiFormControlLabel-root");
      if (muiLabel) {
        if (muiLabel.classList?.contains?.("Mui-checked") || muiLabel.querySelector?.(".Mui-checked, .PrivateSwitchBase-checked")) {
          return true;
        }
      }
      if (r.getAttribute?.("aria-checked") === "true") return true;
      return false;
    }
    /**
     * Kumpulkan grup radio tanpa duplikasi container bersarang
     */
    _collectRadioGroups() {
      const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (allRadios.length === 0) return [];
      const validGroups = [];
      const namedRadios = allRadios.filter((r) => r.name && r.name.trim().length > 0);
      const distinctNames = new Set(namedRadios.map((r) => r.name.trim()));
      if (distinctNames.size > 1 && namedRadios.length >= allRadios.length * 0.7) {
        const byName = {};
        namedRadios.forEach((r) => {
          const n = r.name.trim();
          if (!byName[n]) byName[n] = [];
          byName[n].push(r);
        });
        for (const n in byName) {
          const groupRadios = byName[n];
          const container = groupRadios[0]?.closest('tr, [role="radiogroup"], .MuiFormGroup-root, .question-item, div');
          validGroups.push({ groupEl: container, radios: groupRadios });
        }
        return validGroups;
      }
      const rawContainers = Array.from(document.querySelectorAll('[role="radiogroup"], .MuiFormGroup-root, fieldset, tr'));
      const filteredContainers = rawContainers.filter((parent) => {
        const radiosInside = parent.querySelectorAll('input[type="radio"]');
        if (radiosInside.length === 0) return false;
        const childContainer = parent.querySelector('[role="radiogroup"], .MuiFormGroup-root');
        return !childContainer || parent === childContainer;
      });
      const seenRadios = /* @__PURE__ */ new Set();
      for (const group of filteredContainers) {
        const radios = Array.from(group.querySelectorAll('input[type="radio"]')).filter((el) => {
          if (!el || seenRadios.has(el)) return false;
          seenRadios.add(el);
          return true;
        });
        if (radios.length > 0) {
          validGroups.push({ groupEl: group, radios });
        }
      }
      if (validGroups.length > 0 && seenRadios.size >= allRadios.length * 0.7) {
        return validGroups;
      }
      const unclustered = allRadios.filter((r) => !seenRadios.has(r));
      if (unclustered.length > 0) {
        if (unclustered.length % 2 === 0) {
          for (let i = 0; i < unclustered.length; i += 2) {
            validGroups.push({
              groupEl: unclustered[i].parentElement,
              radios: [unclustered[i], unclustered[i + 1]]
            });
          }
        } else {
          validGroups.push({ groupEl: document.body, radios: unclustered });
        }
      }
      return validGroups;
    }
    /**
     * Eksekusi pengisian kuesioner instan sesuai preferensi (100% Bebas Bug Ketukar, Non-AI)
     * @param {'iya' | 'tidak'} mode
     */
    async fillKuisioner(mode = "iya") {
      const validGroups = this._collectRadioGroups();
      let filledCount = 0;
      for (const item of validGroups) {
        const radios = item.radios;
        if (!radios || radios.length === 0) continue;
        const targetRadio = this._selectTargetRadio(radios, mode);
        if (targetRadio) {
          const inputEl = targetRadio.tagName === "INPUT" ? targetRadio : targetRadio.querySelector?.('input[type="radio"]') || targetRadio;
          if (inputEl) {
            DOM.setNativeRadioChecked(inputEl);
            filledCount++;
            await new Promise((r) => setTimeout(r, 15));
          }
        }
      }
      for (const item of validGroups) {
        const hasChecked = item.radios.some((r) => this._isRadioChecked(r));
        if (!hasChecked) {
          const fallbackTarget = this._selectTargetRadio(item.radios, mode);
          if (fallbackTarget) {
            const inp = fallbackTarget.tagName === "INPUT" ? fallbackTarget : fallbackTarget.querySelector?.('input[type="radio"]') || fallbackTarget;
            if (inp) {
              DOM.setNativeRadioChecked(inp);
              await new Promise((r) => setTimeout(r, 15));
            }
          }
        }
      }
      this._fillFeedbackTextarea(mode);
      await new Promise((r) => setTimeout(r, 200));
      if (filledCount === 0 && validGroups.length === 0) {
        throw new Error("Tidak ditemukan butir kuesioner pada halaman ini.");
      }
    }
    /**
     * Logika pemilihan radio target yang kebal terhadap bug substring dan ketukar opsi
     * Menjamin "Auto Iya" SELALU memilih opsi Ya / Positif / Nilai Tertinggi,
     * dan "Auto Tidak" SELALU memilih opsi Tidak / Negatif / Nilai Terendah.
     */
    _selectTargetRadio(radios, mode) {
      if (!radios || radios.length === 0) return null;
      if (radios.length === 1) return radios[0];
      const annotated = radios.map((r, idx) => {
        const input = r.tagName === "INPUT" ? r : r.querySelector?.('input[type="radio"]') || r;
        return {
          r,
          input,
          idx,
          text: this._getRadioText(r)
        };
      });
      if (mode === "iya") {
        const yaMatch = annotated.find((item) => {
          const t = item.text;
          const isNeg = t.includes("tidak") || t.includes("kurang") || t.includes("bukan") || t.includes("buruk") || t.includes("belum");
          if (isNeg) return false;
          return /\bya\b/i.test(t) || /\byes\b/i.test(t);
        });
        if (yaMatch) return yaMatch.r;
        const superPositive = annotated.find((item) => {
          const t = item.text;
          const isNeg = t.includes("tidak") || t.includes("kurang") || t.includes("bukan") || t.includes("buruk");
          if (isNeg) return false;
          return t.includes("sangat baik") || t.includes("sangat setuju") || t.includes("sangat puas") || t.includes("selalu");
        });
        if (superPositive) return superPositive.r;
        const positive = annotated.filter((item) => {
          const t = item.text;
          const isNeg = t.includes("tidak") || t.includes("kurang") || t.includes("bukan") || t.includes("buruk");
          if (isNeg) return false;
          return t.includes("baik") || t.includes("setuju") || t.includes("puas") || t.includes("sering");
        });
        if (positive.length > 0) return positive[positive.length - 1].r;
        const highestNum = this._findNumericExtremum(radios, "highest");
        if (highestNum) {
          const t = this._getRadioText(highestNum);
          if (!t.includes("tidak") && !t.includes("kurang")) return highestNum;
        }
        if (radios.length === 2) {
          return radios[0];
        }
        return radios[radios.length - 1];
      }
      if (mode === "tidak") {
        const tidakMatch = annotated.find((item) => {
          const t = item.text;
          return /\btidak\b/i.test(t) || /\bno\b/i.test(t) || t.includes("sangat tidak setuju") || t.includes("sangat kurang") || t.includes("kurang") || t.includes("buruk");
        });
        if (tidakMatch) return tidakMatch.r;
        const lowestNum = this._findNumericExtremum(radios, "lowest");
        if (lowestNum) return lowestNum;
        if (radios.length === 2) {
          return radios[1];
        }
        return radios[0];
      }
      return radios[0];
    }
    _findNumericExtremum(radios, target = "highest") {
      let bestRadio = null;
      let bestNum = target === "highest" ? -Infinity : Infinity;
      for (const r of radios) {
        const valStr = this._getRadioText(r);
        const numMatch = valStr.match(/\b([1-5])\b/);
        if (numMatch) {
          const n = parseInt(numMatch[1], 10);
          if (target === "highest" && n > bestNum) {
            bestNum = n;
            bestRadio = r;
          } else if (target === "lowest" && n < bestNum) {
            bestNum = n;
            bestRadio = r;
          }
        }
      }
      return bestRadio;
    }
    _fillFeedbackTextarea(mode) {
      const textareas = document.querySelectorAll('textarea, input[type="text"]:not([readonly])');
      if (textareas.length === 0) return;
      const positiveFeedbacks = [
        "Pembelajaran sangat interaktif dan materi perkuliahan disampaikan dengan sangat jelas.",
        "Dosen sangat menguasai materi perkuliahan, ramah, dan responsif terhadap mahasiswa.",
        "Penjelasan materi mudah dipahami, sistematis, tepat waktu, dan memotivasi belajar.",
        "Materi perkuliahan yang diberikan sangat aplikatif dan bermanfaat untuk wawasan masa depan.",
        "Dosen selalu memberikan penjelasan dan diskusi yang sangat membangun bagi pemahaman materi."
      ];
      const criticalFeedbacks = [
        "Perlu peningkatan dalam kejelasan penyampaian materi dan alokasi waktu sesi diskusi.",
        "Mohon materi pengantar perkuliahan dapat dibagikan lebih awal sebelum kelas dimulai.",
        "Diharapkan forum tanya jawab perkuliahan dapat ditanggapi dengan lebih aktif dan cepat.",
        "Perlu penambahan contoh studi kasus praktis pada setiap pertemuan untuk memperjelas konsep."
      ];
      for (const ta of textareas) {
        if (!ta.value.trim()) {
          const text = mode === "tidak" ? criticalFeedbacks[Math.floor(Math.random() * criticalFeedbacks.length)] : positiveFeedbacks[Math.floor(Math.random() * positiveFeedbacks.length)];
          DOM.setNativeValue(ta, text);
        }
      }
    }
    _findSubmitButton() {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], .MuiButton-root, [role="button"]'));
      const submitKeywords = [
        "submit kuesioner",
        "submit kuisioner",
        "kirim kuesioner",
        "kirim kuisioner",
        "simpan kuesioner",
        "simpan kuisioner",
        "simpan jawaban",
        "kumpulkan kuesioner",
        "simpan",
        "kirim",
        "submit",
        "selesai"
      ];
      for (const kw of submitKeywords) {
        const match = candidates.find((btn) => {
          if (btn.disabled || btn.classList.contains("Mui-disabled")) return false;
          const text = (btn.textContent || btn.value || "").trim().toLowerCase();
          return text === kw || text.includes(kw);
        });
        if (match) return match;
      }
      return null;
    }
    async _confirmDialogIfPresent() {
      const dialogs = document.querySelectorAll('[role="dialog"], .MuiDialog-root, .swal2-popup, .MuiModal-root, .modal');
      for (const d of dialogs) {
        if (d.id === "mentari-autopilot-hud-host" || d.closest?.("#mentari-autopilot-hud-host")) continue;
        const style = window.getComputedStyle(d);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
        const buttons = d.querySelectorAll('button, .MuiButton-root, .swal2-confirm, input[type="button"]');
        if (buttons.length === 0) continue;
        const confirmKeywords = ["ya", "setuju", "kirim", "simpan", "lanjutkan", "ok", "yes", "benar", "submit"];
        for (const b of buttons) {
          const bText = (b.textContent || b.value || "").trim().toLowerCase();
          if (bText.includes("batal") || bText.includes("cancel") || bText.includes("kembali") || bText.includes("tutup")) {
            continue;
          }
          if (confirmKeywords.some((kw) => bText === kw || bText.startsWith(kw) || bText.includes(kw))) {
            await Humanizer.naturalClick(b, true);
            return true;
          }
        }
      }
      return false;
    }
    /**
     * Engine Verifikasi Post-Submit Multi-Sinyal
     * @param {number} maxWaitMs
     * @returns {Promise<{ success: boolean, reason: string }>}
     */
    async _submitAndVerifyKuisioner(maxWaitMs = 25e3) {
      const submitBtn = this._findSubmitButton();
      if (!submitBtn) {
        return { success: false, reason: "Tombol submit/simpan kuesioner tidak ditemukan di halaman." };
      }
      const groups = this._collectRadioGroups();
      const unansweredGroups = groups.filter((g) => !g.radios.some((r) => this._isRadioChecked(r)));
      if (unansweredGroups.length > 0) {
        for (const ug of unansweredGroups) {
          const target = this._selectTargetRadio(ug.radios, "iya");
          if (target) {
            const inp = target.tagName === "INPUT" ? target : target.querySelector?.('input[type="radio"]') || target;
            if (inp) DOM.setNativeRadioChecked(inp);
          }
        }
        await new Promise((r) => setTimeout(r, 150));
        const stillUnanswered = groups.filter((g) => !g.radios.some((r) => this._isRadioChecked(r)));
        if (stillUnanswered.length > 0 && stillUnanswered.length === groups.length) {
          return {
            success: false,
            reason: `Seluruh butir pertanyaan kuesioner (${stillUnanswered.length} butir) belum dapat terisi.`
          };
        }
      }
      try {
        submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {
      }
      const initialUrl = window.location.href;
      const parentForm = submitBtn.closest("form");
      if (parentForm) {
        parentForm.noValidate = true;
      }
      submitBtn.formNoValidate = true;
      await Humanizer.naturalClick(submitBtn, true);
      await new Promise((r) => setTimeout(r, 250));
      const hasStartedEarly = document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"], .spinner, .loading') !== null || (document.body.innerText || "").toLowerCase().includes("menunggu...") || window.location.href !== initialUrl;
      if (!hasStartedEarly && parentForm && typeof parentForm.requestSubmit === "function") {
        try {
          parentForm.requestSubmit(submitBtn);
        } catch (_) {
          try {
            parentForm.requestSubmit();
          } catch (_2) {
          }
        }
      } else if (!hasStartedEarly) {
        try {
          submitBtn.click();
        } catch (_) {
        }
      }
      const startTime = Date.now();
      let dialogConfirmed = false;
      let hadLoadingOverlay = false;
      while (Date.now() - startTime < maxWaitMs) {
        const confirmed = await this._confirmDialogIfPresent();
        if (confirmed) {
          dialogConfirmed = true;
        }
        const pageText = (document.body.innerText || "").toLowerCase();
        const hasLoadingIndicator = pageText.includes("menunggu...") || pageText.includes("memproses...") || pageText.includes("menyimpan...") || document.querySelector('.MuiCircularProgress-root, .swal2-loading, [role="progressbar"], .spinner, .loading') !== null;
        if (hasLoadingIndicator) {
          hadLoadingOverlay = true;
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        const curUrl = window.location.href;
        if (curUrl !== initialUrl && !curUrl.includes("/kuesioner/") && !curUrl.includes("/kuisioner/")) {
          return { success: true, reason: "URL dialihkan (redirect) setelah submit berhasil." };
        }
        const successKeywords = [
          "berhasil disimpan",
          "berhasil dikirim",
          "kuesioner telah diisi",
          "kuisioner telah diisi",
          "terima kasih telah mengisi",
          "terima kasih",
          "telah mengisi evaluasi",
          "evaluasi berhasil",
          "sudah mengisi kuesioner",
          "sudah mengisi kuisioner",
          "sukses",
          "berhasil",
          "tersimpan",
          "kuesioner telah diselesaikan",
          "evaluasi telah selesai",
          "anda sudah mengisi",
          "anda telah menyelesaikan",
          "sudah diselesaikan"
        ];
        for (const kw of successKeywords) {
          if (pageText.includes(kw)) {
            return { success: true, reason: `Ditemukan notifikasi sukses LMS: "${kw}"` };
          }
        }
        const toastSuccess = document.querySelector(".Toastify__toast--success, .MuiAlert-filledSuccess, .swal2-success, .alert-success, .text-success");
        if (toastSuccess && !toastSuccess.closest?.("#mentari-autopilot-hud-host")) {
          return { success: true, reason: "Notifikasi toast sukses terdeteksi dari LMS." };
        }
        const curRadios = document.querySelectorAll('input[type="radio"]');
        const activeRadios = document.querySelectorAll('input[type="radio"]:not(:disabled)');
        if (curRadios.length === 0 || curRadios.length > 0 && activeRadios.length === 0) {
          return { success: true, reason: "Form kuesioner telah terkunci atau ditutup oleh LMS." };
        }
        const errorKeywords = ["harus diisi", "wajib diisi", "belum lengkap", "gagal menyimpan", "terjadi kesalahan pada server"];
        const errElements = document.querySelectorAll('.Mui-error, .MuiAlert-standardError, .swal2-error, [role="alert"], .text-danger, .invalid-feedback');
        for (const el of errElements) {
          if (el.closest?.("#mentari-autopilot-hud-host")) continue;
          const elText = (el.innerText || "").toLowerCase();
          for (const errKw of errorKeywords) {
            if (elText.includes(errKw)) {
              return { success: false, reason: `Validasi LMS gagal: "${(el.innerText || "").trim()}"` };
            }
          }
        }
        if (hadLoadingOverlay) {
          const curBtn = this._findSubmitButton();
          if (!curBtn || curBtn.disabled || curBtn.classList.contains("Mui-disabled")) {
            return { success: true, reason: "LMS selesai memproses data dan menonaktifkan tombol submit." };
          }
          return { success: true, reason: "LMS selesai memproses data pengiriman kuesioner." };
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (window.location.href !== initialUrl) {
        return { success: true, reason: "URL berpindah setelah proses submit selesai." };
      }
      const finalBtn = this._findSubmitButton();
      if (!finalBtn || finalBtn.disabled) {
        return { success: true, reason: "Tombol submit berhasil diproses dan dinonaktifkan." };
      }
      if (hadLoadingOverlay || dialogConfirmed) {
        return { success: true, reason: "Form kuesioner telah diserahkan dan diproses oleh server." };
      }
      return { success: false, reason: "Batas waktu verifikasi habis tanpa konfirmasi berhasil dari LMS." };
    }
    _injectAutoPilotHUD(state, currentItem) {
      if (document.getElementById("mentari-autopilot-hud-host")) {
        document.getElementById("mentari-autopilot-hud-host").remove();
      }
      this.hudHost = document.createElement("div");
      this.hudHost.id = "mentari-autopilot-hud-host";
      this.hudHost.style.position = "fixed";
      this.hudHost.style.bottom = "72px";
      this.hudHost.style.right = "24px";
      this.hudHost.style.zIndex = "2147483646";
      this.hudShadow = this.hudHost.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
      .hud-card {
        background: rgba(18, 18, 22, 0.95);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 14px;
        padding: 14px 18px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 330px;
        max-width: 90vw;
      }
      .hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: grab;
        user-select: none;
      }
      .hud-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #fbbf24;
      }
      .hud-header-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .hud-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .hud-badge.running {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .hud-badge.paused {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .hud-icon-btn {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .hud-icon-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .hud-icon-btn.close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.45);
        color: #fca5a5;
      }
      .hud-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .hud-title {
        font-size: 13px;
        font-weight: 700;
        color: #f3f4f6;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hud-subtitle {
        font-size: 11px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .hud-tag {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .hud-tag.kues {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }
      .hud-pref-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .hud-pref-pill.tidak {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .hud-progress-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 2px;
      }
      .hud-progress-info {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #888;
      }
      .hud-progress-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
      }
      .hud-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #d4af37, #fbbf24);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .hud-status {
        font-size: 11px;
        color: #fbbf24;
        background: rgba(212, 175, 55, 0.08);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 6px;
        padding: 7px 10px;
        line-height: 1.4;
      }
      .hud-actions {
        display: flex;
        gap: 8px;
        margin-top: 2px;
      }
      .hud-btn {
        flex: 1;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.2s;
      }
      .hud-btn-pause {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .hud-btn-pause:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .hud-btn-cancel {
        background: rgba(239, 68, 68, 0.12);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
      .hud-btn-cancel:hover {
        background: rgba(239, 68, 68, 0.25);
        color: #ef4444;
      }
      .hud-card.theme-light {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #cbd5e1;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        color: #0f172a;
      }
      .hud-card.theme-light .hud-brand {
        color: #1e3a8a;
      }
      .hud-card.theme-light .hud-badge.running {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .hud-card.theme-light .hud-badge.paused {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .hud-card.theme-light .hud-title {
        color: #0f172a;
      }
      .hud-card.theme-light .hud-subtitle,
      .hud-card.theme-light .hud-progress-info {
        color: #475569;
      }
      .hud-card.theme-light .hud-tag.kues {
        background: #fef3c7;
        color: #92400e;
        border-color: #fde68a;
      }
      .hud-card.theme-light .hud-pref-pill {
        background: #ecfdf5;
        color: #047857;
        border-color: #a7f3d0;
      }
      .hud-card.theme-light .hud-pref-pill.tidak {
        background: #fef2f2;
        color: #b91c1c;
        border-color: #fecaca;
      }
      .hud-card.theme-light .hud-progress-bar-bg {
        background: #e2e8f0;
      }
      .hud-card.theme-light .hud-progress-bar-fill {
        background: linear-gradient(90deg, #1e3a8a, #3b82f6);
      }
      .hud-card.theme-light .hud-status {
        color: #1e293b;
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .hud-card.theme-light .hud-btn-pause {
        background: #f1f5f9;
        color: #1e293b;
        border-color: #cbd5e1;
      }
      .hud-card.theme-light .hud-btn-pause:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .hud-card.theme-light .hud-btn-cancel {
        background: #fef2f2;
        color: #b91c1c;
        border-color: #fecaca;
      }
      .hud-card.theme-light .hud-btn-cancel:hover {
        background: #fee2e2;
        color: #991b1b;
      }
      .hud-card.theme-light .hud-icon-btn {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }
      .hud-card.theme-light .hud-icon-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .hud-card.theme-light .hud-icon-btn.close:hover {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      .hud-card.minimized {
        width: 270px;
        padding: 10px 14px;
        gap: 8px;
      }
      .hud-card.minimized .hud-body,
      .hud-card.minimized .hud-status,
      .hud-card.minimized .hud-actions {
        display: none !important;
      }
    `;
      const hudCard = document.createElement("div");
      hudCard.className = `hud-card ${this.currentTheme === "light" ? "theme-light" : ""}`;
      const currentIdx = state.currentIndex || 0;
      const totalCount = state.queue?.length || 1;
      const progressPercent = Math.round(currentIdx / totalCount * 100);
      const rawPref = state.kuesionerPreference || "iya";
      const pref = rawPref === "tidak" ? "tidak" : "iya";
      const prefLabel = pref === "tidak" ? "Auto Tidak" : "Auto Ya";
      hudCard.innerHTML = `
      <div class="hud-header">
        <div class="hud-brand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Auto-Pilot Kuis & Evaluasi
        </div>
        <div class="hud-header-right">
          <div class="hud-badge ${this.isPaused ? "paused" : "running"}" id="hud-badge">
            ${this.isPaused ? "Dijeda" : "Berjalan"}
          </div>
          <button class="hud-icon-btn" id="hud-btn-minimize" type="button" title="Perkecil ke bar progres" aria-label="Perkecil ke bar progres">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="hud-icon-btn close" id="hud-btn-close" type="button" title="Sembunyikan HUD" aria-label="Sembunyikan HUD">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="hud-body">
        <div class="hud-title" title="${currentItem.courseTitle || ""}">${currentItem.courseTitle || ""}</div>
        <div class="hud-subtitle">
          <span class="hud-tag kues">Kuesioner</span>
          <span>${currentItem.sectionName || ""}</span>
          <span class="hud-pref-pill ${pref}">${prefLabel}</span>
        </div>
      </div>

      <div class="hud-progress-wrap">
        <div class="hud-progress-info">
          <span id="hud-progress-label">Item ${currentIdx + 1} dari ${totalCount}</span>
          <span id="hud-progress-pct">${progressPercent}%</span>
        </div>
        <div class="hud-progress-bar-bg">
          <div class="hud-progress-bar-fill" id="hud-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="hud-status" id="hud-status-text">
        Mempersiapkan evaluasi kuesioner...
      </div>

      <div class="hud-actions">
        <button class="hud-btn hud-btn-pause" id="hud-btn-pause" type="button" style="${this.isPaused ? "" : "display:none;"}">
          ${this.isPaused ? "Coba Lagi" : "Jeda"}
        </button>
        <button class="hud-btn hud-btn-cancel" id="hud-btn-cancel" type="button">
          Hentikan & Reset Total
        </button>
      </div>
    `;
      this.hudShadow.appendChild(style);
      this.hudShadow.appendChild(hudCard);
      document.body.appendChild(this.hudHost);
      this._makeElementDraggable(this.hudHost, hudCard.querySelector(".hud-header"));
      const btnHudMin = this.hudShadow.getElementById("hud-btn-minimize");
      const btnHudClose = this.hudShadow.getElementById("hud-btn-close");
      btnHudMin?.addEventListener("click", () => {
        const minimized = hudCard.classList.toggle("minimized");
        btnHudMin.title = minimized ? "Perbesar HUD" : "Perkecil ke bar progres";
        btnHudMin.setAttribute("aria-label", btnHudMin.title);
        btnHudMin.innerHTML = minimized ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      });
      btnHudClose?.addEventListener("click", () => {
        if (!this.isAutoPilot && !this.isProcessing) {
          this.hudHost?.remove();
        } else if (this.hudHost) {
          this.hudHost.style.display = "none";
          Toast.info("HUD Kuesioner disembunyikan. Otomatisasi tetap berjalan.");
        }
      });
      const statusEl = this.hudShadow.getElementById("hud-status-text");
      const badgeEl = this.hudShadow.getElementById("hud-badge");
      const btnPause = this.hudShadow.getElementById("hud-btn-pause");
      const btnCancel = this.hudShadow.getElementById("hud-btn-cancel");
      const progressBar = this.hudShadow.getElementById("hud-progress-fill");
      btnPause.addEventListener("click", async () => {
        this.isPaused = !this.isPaused;
        badgeEl.className = `hud-badge ${this.isPaused ? "paused" : "running"}`;
        badgeEl.textContent = this.isPaused ? "Dijeda" : "Berjalan";
        btnPause.textContent = this.isPaused ? "Coba Lagi" : "Jeda";
        if (!this.isPaused) {
          btnPause.style.display = "none";
        }
        statusEl.textContent = this.isPaused ? "Auto-Pilot dijeda sementara." : "Melanjutkan pengerjaan kuesioner...";
        if (this.isPaused) {
          await AutoPilotState.pause("Dijeda oleh pengguna");
        } else {
          await AutoPilotState.resume();
          if (!this.isProcessing) {
            const freshState = await AutoPilotState.get();
            if (freshState && freshState.active) {
              this._executeAutoPilotKuesioner(freshState, currentItem, statusEl, badgeEl, btnPause, progressBar);
            }
          }
        }
      });
      btnCancel.addEventListener("click", async () => {
        this.isAutoPilot = false;
        this.isProcessing = false;
        this.isPaused = false;
        await AutoPilotState.reset();
        Toast.info("Auto-Pilot kuis & evaluasi telah dihentikan & direset total.");
        if (this.hudHost) this.hudHost.remove();
        const manualCard = document.getElementById("mentari-kuisioner-card-host");
        if (manualCard) manualCard.style.display = "block";
      });
      return { statusEl, badgeEl, btnPause, progressBar };
    }
    _makeElementDraggable(element, handle) {
      if (!element || !handle) return;
      handle.style.cursor = "grab";
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;
      const onPointerDown = (e) => {
        if (e.target.closest("button, input, select, a, textarea")) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        element.style.position = "fixed";
        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.margin = "0";
        element.style.transform = "none";
        handle.style.cursor = "grabbing";
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
        }
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
        handle.style.cursor = "grab";
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch {
        }
      };
      handle.addEventListener("pointerdown", onPointerDown);
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    }
    async _checkAndInitAutoPilot() {
      try {
        const state = await AutoPilotState.get();
        if (!state || !state.active || !Array.isArray(state.queue)) {
          this.isAutoPilot = false;
          const manualCard2 = document.getElementById("mentari-kuisioner-card-host");
          if (manualCard2) manualCard2.style.display = "block";
          return;
        }
        this.isAutoPilot = true;
        const manualCard = document.getElementById("mentari-kuisioner-card-host");
        if (manualCard) manualCard.style.display = "none";
        if (state.currentIndex >= state.queue.length) {
          this.isAutoPilot = false;
          await Storage.set({
            mentari_auto_pilot_state: { ...state, active: false, finished: true }
          });
          Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!");
          if (manualCard) manualCard.style.display = "block";
          return;
        }
        const currentItem = state.queue[state.currentIndex];
        if (!currentItem) return;
        const urlMatch = window.location.pathname.match(/\/(?:kuesioner|kuisioner)\/([^\/\?]+)/i);
        const currentUrlKuesId = urlMatch ? decodeURIComponent(urlMatch[1]) : null;
        const matchesCurrent = currentUrlKuesId && (currentUrlKuesId === currentItem.id || currentUrlKuesId === currentItem.sectionCode || currentItem.url && currentItem.url.includes(currentUrlKuesId));
        if (currentUrlKuesId && !matchesCurrent) {
          console.warn(`[Auto-Pilot Guard] ID kuesioner aktif (${currentUrlKuesId}) tidak cocok dengan antrean (${currentItem.id} / ${currentItem.sectionCode}). Redirect ke item yang benar...`);
          window.location.replace(currentItem.url);
          return;
        }
        if (currentItem.type !== "KUESIONER" && currentItem.url) {
          window.location.replace(currentItem.url);
          return;
        }
        console.log(`[Auto-Pilot] Memulai Kuesioner ${state.currentIndex + 1}/${state.queue.length}:`, currentItem);
        this.isPaused = Boolean(state.paused);
        const { statusEl, badgeEl, btnPause, progressBar } = this._injectAutoPilotHUD(state, currentItem);
        if (this.isPaused) {
          statusEl.textContent = state.pauseReason ? `Terjeda: ${state.pauseReason}. Klik Lanjutkan untuk mencoba lagi.` : "Auto-Pilot dijeda. Klik Lanjutkan untuk mencoba lagi.";
          return;
        }
        this._executeAutoPilotKuesioner(state, currentItem, statusEl, badgeEl, btnPause, progressBar);
      } catch (e) {
        console.error("[Auto-Pilot Kuesioner Error]", e);
      }
    }
    async _executeAutoPilotKuesioner(state, currentItem, statusEl = null, badgeEl = null, btnPause = null, progressBar = null) {
      if (!statusEl) statusEl = this.hudShadow?.getElementById("hud-status-text");
      if (!badgeEl) badgeEl = this.hudShadow?.getElementById("hud-badge");
      if (!btnPause) btnPause = this.hudShadow?.getElementById("hud-btn-pause");
      const rawPref = state.kuesionerPreference || (await Storage.get("mentari_kuesioner_preference"))?.mentari_kuesioner_preference || "iya";
      const pref = rawPref === "tidak" ? "tidak" : "iya";
      const prefLabel = pref === "tidak" ? "Auto Tidak" : "Auto Ya";
      if (statusEl) {
        statusEl.textContent = `[${prefLabel}] Memeriksa status kuesioner: ${currentItem.sectionName || ""}...`;
      }
      this.isProcessing = true;
      try {
        const readyState = await this._waitForKuesionerReady(12e3);
        if (readyState.alreadyCompleted) {
          console.log("[Auto-Pilot Kuesioner] Kuesioner ini sudah selesai diisi sebelumnya di LMS UNPAM. Melanjutkan...");
          if (statusEl) statusEl.textContent = "Kuesioner ini sudah selesai diisi sebelumnya. Melanjutkan antrean...";
          Toast.info(`Kuesioner ${currentItem.sectionName || ""} sudah selesai diisi di LMS.`);
          state.currentIndex++;
          await AutoPilotState.set(state);
          this.isProcessing = false;
          this._proceedToNextItem(state, statusEl);
          return;
        }
        if (!readyState.ready) {
          throw new Error("Tidak ditemukan butir kuesioner pada halaman ini.");
        }
        if (statusEl) {
          statusEl.textContent = `[${prefLabel}] Mengisi seluruh butir kuesioner: ${currentItem.sectionName || ""}...`;
        }
        await this.fillKuisioner(pref);
        if (statusEl) statusEl.textContent = "Kuesioner terisi. Mengirim & memverifikasi ke server LMS...";
        const verifyResult = await this._submitAndVerifyKuisioner();
        console.log("[Auto-Pilot Kuesioner Verification Result]", verifyResult);
        if (!verifyResult.success) {
          console.warn("[Auto-Pilot Kuesioner Verification Paused]", verifyResult.reason);
          if (statusEl) {
            statusEl.textContent = `Gagal Verifikasi: ${verifyResult.reason}. Klik Coba Lagi untuk mengulang.`;
          }
          if (badgeEl) {
            badgeEl.className = "hud-badge paused";
            badgeEl.textContent = "Dijeda";
          }
          if (btnPause) {
            btnPause.style.display = "";
            btnPause.textContent = "Coba Lagi";
          }
          this.isPaused = true;
          this.isProcessing = false;
          Toast.error(`Gagal verifikasi submit kuesioner: ${verifyResult.reason}`);
          await AutoPilotState.pause(`Gagal verifikasi: ${verifyResult.reason}`);
          return;
        }
        if (statusEl) statusEl.textContent = "Kuesioner terverifikasi sukses terkirim!";
        Toast.success(`Kuesioner ${currentItem.sectionName || ""} berhasil diverifikasi dan disimpan!`);
        state.currentIndex++;
        await AutoPilotState.set(state);
        this.isProcessing = false;
        if (statusEl) {
          statusEl.textContent = "Kuesioner sukses terverifikasi! Membuka evaluasi berikutnya...";
        }
        await new Promise((r) => setTimeout(r, 800));
        await this._proceedToNextItem(state, statusEl);
      } catch (err) {
        console.error("[Auto-Pilot Kuesioner Fatal Error]", err);
        this.isProcessing = false;
        this.isPaused = true;
        if (statusEl) statusEl.textContent = `Error: ${err.message}. Klik Coba Lagi untuk mengulang.`;
        if (badgeEl) {
          badgeEl.className = "hud-badge paused";
          badgeEl.textContent = "Dijeda";
        }
        if (btnPause) {
          btnPause.style.display = "";
          btnPause.textContent = "Coba Lagi";
        }
        Toast.error(`Kuesioner error: ${err.message}`);
        await AutoPilotState.pause(`Error: ${err.message}`);
      }
    }
    async _proceedToNextItem(state, statusEl = null) {
      if (state.currentIndex >= state.queue.length && (state.mode === "all" || !state.mode)) {
        if (statusEl) {
          statusEl.textContent = "Memeriksa ketersediaan kuesioner lain di server UNPAM...";
        }
        try {
          const hasMoreKues = await AutoPilotSync.syncAndAppendKuesioner(state, statusEl);
          if (hasMoreKues) {
            console.log("[Auto-Pilot Kuesioner] Sweep menemukan kuesioner tambahan! Melanjutkan pengerjaan.");
          }
        } catch (e) {
          console.warn("[Auto-Pilot Kuesioner] Gagal sweep kuesioner tambahan:", e);
        }
      }
      if (state.currentIndex < state.queue.length) {
        const nextItem = state.queue[state.currentIndex];
        if (statusEl) statusEl.textContent = `Menuju ke: ${nextItem.courseTitle || ""} (${nextItem.sectionName || nextItem.name || ""})...`;
        setTimeout(() => {
          window.location.replace(nextItem.url);
        }, 500);
      } else {
        await AutoPilotState.reset();
        this.isAutoPilot = false;
        this.isProcessing = false;
        const totalDone = state.queue?.length || 1;
        const fillEl = this.hudShadow?.getElementById("hud-progress-fill");
        const labelEl = this.hudShadow?.getElementById("hud-progress-label");
        const pctEl = this.hudShadow?.getElementById("hud-progress-pct");
        const badgeEl = this.hudShadow?.getElementById("hud-badge");
        const actionsEl = this.hudShadow?.querySelector(".hud-actions");
        if (fillEl) fillEl.style.width = "100%";
        if (labelEl) labelEl.textContent = `Item ${totalDone} dari ${totalDone}`;
        if (pctEl) pctEl.textContent = "100%";
        if (badgeEl) {
          badgeEl.className = "hud-badge running";
          badgeEl.textContent = "Selesai";
        }
        if (actionsEl) actionsEl.style.display = "none";
        if (statusEl) statusEl.textContent = "Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!";
        Toast.success("Seluruh antrean Auto-Pilot kuis & evaluasi telah selesai 100%!");
        setTimeout(() => {
          if (this.hudHost) this.hudHost.remove();
          const manualCard = document.getElementById("mentari-kuisioner-card-host");
          if (manualCard) manualCard.style.display = "block";
        }, 4e3);
      }
    }
  };
  if (typeof window !== "undefined") {
    new KuisionerAssistant();
  }
})();
