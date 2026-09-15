(() => {
  // src/utils/storage.js
  var Storage = {
    /**
     * Mengambil satu atau beberapa nilai dari chrome.storage.local
     */
    async get(keys, defaults = {}) {
      return new Promise((resolve) => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime.lastError) {
                console.log("[Storage] Info reading storage:", chrome.runtime.lastError);
                resolve(defaults);
              } else {
                resolve(Object.assign({}, defaults, result));
              }
            });
          } else {
            const res = Object.assign({}, defaults);
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach((k) => {
              const val = localStorage.getItem(k);
              if (val !== null) {
                try {
                  res[k] = JSON.parse(val);
                } catch {
                  res[k] = val;
                }
              }
            });
            resolve(res);
          }
        } catch (e) {
          console.error("[Storage] Get failed:", e);
          resolve(defaults);
        }
      });
    },
    /**
     * Menyimpan pasangan key-value ke chrome.storage.local
     */
    async set(items) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(true);
              }
            });
          } else {
            for (const [k, v] of Object.entries(items)) {
              localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
            }
            resolve(true);
          }
        } catch (e) {
          reject(e);
        }
      });
    },
    /**
     * Menghapus satu atau beberapa keys dari chrome.storage.local
     */
    async remove(keys) {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(keys, () => resolve(true));
        } else {
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((k) => localStorage.removeItem(k));
          resolve(true);
        }
      });
    },
    /**
     * Auto-migrasi transparan dari localStorage lama ke chrome.storage.local.
     * Dipanggil saat ekstensi pertama kali aktif.
     */
    async autoMigrateLegacyStorage() {
      try {
        if (typeof window === "undefined" || !window.localStorage) return;
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
        const toMigrate = {};
        let hasData = false;
        for (const k of legacyKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (k === "geminiApiKey") {
                try {
                  toMigrate[k] = atob(raw);
                } catch {
                  toMigrate[k] = raw;
                }
              } else {
                toMigrate[k] = JSON.parse(raw);
              }
            } catch {
              toMigrate[k] = raw;
            }
            hasData = true;
          }
        }
        if (hasData) {
          await this.set(toMigrate);
          console.log("[Storage] Auto-migrasi dari legacy localStorage berhasil diselesaikan.");
        }
      } catch (e) {
        console.log("[Storage] Auto-migrasi info:", e.message);
      }
    }
  };

  // src/utils/unpam-auth.js
  var UnpamAuth = {
    _cachedToken: null,
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
    /**
     * Mengambil token autentikasi (JWT) mahasiswa dari berbagai sumber
     */
    async getAuthToken() {
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
          return this._cachedToken;
        } else {
          Storage.remove("mentari_auth_token");
        }
      }
      if (stored.access) {
        if (this.isTokenValid(stored.access)) {
          this._cachedToken = stored.access;
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
     * Pasang pendengar event dari Main World Sniffer dan fallback DOM injection
     */
    installLiveSniffer() {
      if (typeof window === "undefined") return;
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
      this._cachedToken = token;
      if (typeof window !== "undefined") {
        window.lastAuthToken = token;
      }
      try {
        localStorage.setItem("mentari_auth_token", token);
      } catch {
      }
      Storage.set({ mentari_auth_token: token });
    }
  };
  if (typeof window !== "undefined") {
    UnpamAuth.installLiveSniffer();
  }

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

  // src/content/token.js
  var ALL_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Rekomendasi)" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (Cepat)" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash (Next-Gen)" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite (RPD 500)" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite (RPD 500)" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Power)" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Deep)" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (Reasoning)" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Flagship)" }
  ];
  var MentariDashboard = class {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.isOpen = false;
      this.courses = [];
      this.activeForums = [];
      this._currentFetchPromise = null;
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod] Dashboard & Token Engine aktif.");
      UnpamAuth.installLiveSniffer();
      window.addEventListener("mentari-toggle-popup", () => {
        this.toggleModal();
      });
      window.addEventListener("mentari-token-captured", () => {
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
      const overlay = this.shadow.querySelector(".overlay");
      overlay.classList.add("open");
      this.isOpen = true;
      await this._renderFromCache();
      this._loadCoursesAndForums();
    }
    closeModal() {
      if (!this.shadow) return;
      const overlay = this.shadow.querySelector(".overlay");
      if (overlay) overlay.classList.remove("open");
      this.isOpen = false;
    }
    _buildDashboardDOM() {
      this.host = document.createElement("div");
      this.host.id = "mentari-dashboard-host";
      this.shadow = this.host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(10px);
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
        width: 760px;
        max-width: 94vw;
        height: 600px;
        max-height: 88vh;
        background: #141418;
        border: 1px solid rgba(212, 175, 55, 0.35);
        border-radius: 18px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e5e5e5;
      }
      .header {
        padding: 16px 22px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
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
      .tabs-bar {
        display: flex;
        padding: 0 22px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(0, 0, 0, 0.2);
      }
      .tab-btn {
        background: none;
        border: none;
        padding: 12px 18px;
        color: #888;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        position: relative;
        transition: color 0.2s;
      }
      .tab-btn:hover { color: #ccc; }
      .tab-btn.active {
        color: #d4af37;
      }
      .tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #d4af37;
      }
      .tab-content {
        flex-grow: 1;
        padding: 20px 22px;
        overflow-y: auto;
        display: none;
      }
      .tab-content.active { display: block; }
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
    `;
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      overlay.innerHTML = `
      <div class="modal">
        <div class="header">
          <div class="brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff7b00">
              <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
            Mentari Mod
            <span class="brand-badge">Modern Edition</span>
          </div>
          <button class="close-btn" id="btn-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="tabs-bar">
          <button class="tab-btn active" data-tab="tab-forums">Forum Aktif</button>
          <button class="tab-btn" data-tab="tab-courses">Mata Kuliah</button>
          <button class="tab-btn" data-tab="tab-settings">Pengaturan</button>
        </div>

        <div class="tab-content active" id="tab-forums">
          <div id="forum-list-container">
            <div style="text-align:center; padding:40px; color:#888;">Memuat forum aktif...</div>
          </div>
        </div>

        <div class="tab-content" id="tab-courses">
          <div id="course-list-container">
            <div style="text-align:center; padding:40px; color:#888;">Memuat daftar mata kuliah...</div>
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
                ${ALL_MODELS.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}
              </select>
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
                <h4>Otomatisasi Selesai Kuis</h4>
                <p>Otomatis mengonfirmasi submit selesai kuis setelah semua soal terjawab.</p>
              </div>
              <input type="checkbox" id="toggle-auto-finish" style="cursor:pointer; width:18px; height:18px;">
            </div>
          </div>
        </div>
      </div>
    `;
      this.shadow.appendChild(style);
      this.shadow.appendChild(overlay);
      document.body.appendChild(this.host);
      const close = () => this.closeModal();
      this.shadow.getElementById("btn-close").addEventListener("click", close);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      const tabBtns = this.shadow.querySelectorAll(".tab-btn");
      const tabContents = this.shadow.querySelectorAll(".tab-content");
      tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          tabBtns.forEach((b) => b.classList.remove("active"));
          tabContents.forEach((c) => c.classList.remove("active"));
          btn.classList.add("active");
          const targetId = btn.getAttribute("data-tab");
          this.shadow.getElementById(targetId)?.classList.add("active");
        });
      });
      const selectModel = this.shadow.getElementById("select-active-model");
      Storage.get("gemini_model").then(({ gemini_model }) => {
        if (gemini_model) selectModel.value = gemini_model;
      });
      selectModel.addEventListener("change", () => {
        Storage.set({ gemini_model: selectModel.value });
        Toast.success(`Model Gemini diubah ke: ${selectModel.options[selectModel.selectedIndex].text}`);
      });
      this.shadow.getElementById("btn-open-api-settings").addEventListener("click", () => {
        this.closeModal();
        window.dispatchEvent(new CustomEvent("mentari-update-api-key"));
      });
      this.shadow.getElementById("btn-refresh-token").addEventListener("click", async () => {
        UnpamAuth._cachedToken = null;
        const token = await UnpamAuth.getAuthToken();
        if (token) {
          Toast.success("Token berhasil dipindai ulang!");
          await this._loadCoursesAndForums();
        } else {
          Toast.warning("Pastikan kamu sudah login ke mentari.unpam.ac.id.");
        }
      });
      const toggleAutoFinish = this.shadow.getElementById("toggle-auto-finish");
      Storage.get("mentari_auto_finish_quiz").then(({ mentari_auto_finish_quiz }) => {
        toggleAutoFinish.checked = !!mentari_auto_finish_quiz;
      });
      toggleAutoFinish.addEventListener("change", () => {
        Storage.set({ mentari_auto_finish_quiz: toggleAutoFinish.checked });
        Toast.info(`Auto finish kuis: ${toggleAutoFinish.checked ? "Aktif" : "Nonaktif"}`);
      });
    }
    async _renderFromCache() {
      try {
        const token = await UnpamAuth.getAuthToken();
        const userId = UnpamAuth.getUserIdentifier(token);
        const cacheKey = `mentari_cached_data_${userId}`;
        const stored = await Storage.get([cacheKey, "mentari_cached_courses", "mentari_cached_forums"]);
        const userCache = stored[cacheKey];
        const cachedCourses = userCache?.courses || stored.mentari_cached_courses || [];
        const cachedForums = userCache?.forums || stored.mentari_cached_forums || [];
        if (cachedCourses.length > 0) {
          this.courses = cachedCourses;
          this._renderCourses(cachedCourses);
        }
        if (cachedForums.length > 0) {
          this.activeForums = cachedForums;
          this._renderForums(cachedForums, cachedCourses);
        }
      } catch (e) {
        console.log("[Mentari Mod] Info cache status:", e.message);
      }
    }
    _renderCourses(list) {
      const courseContainer = this.shadow?.getElementById("course-list-container");
      if (!courseContainer || !list) return;
      if (list.length === 0) {
        courseContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Tidak ada mata kuliah aktif.</div>';
        return;
      }
      courseContainer.innerHTML = "";
      list.forEach((c) => {
        const courseCode = c.kode_course || c.kode || c.course_code || c.id;
        const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
        const sks = c.sks || "-";
        const item = document.createElement("div");
        item.className = "forum-card";
        item.innerHTML = `
        <div>
          <div class="forum-title">${courseTitle}</div>
          <div class="forum-course">Kode: ${courseCode} | SKS: ${sks}</div>
        </div>
        <a class="btn-open-forum" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}" target="_blank">Buka Kelas</a>
      `;
        courseContainer.appendChild(item);
      });
    }
    _renderForums(forumItems, coursesFallback = []) {
      const forumContainer = this.shadow?.getElementById("forum-list-container");
      if (!forumContainer) return;
      forumContainer.innerHTML = "";
      if (!forumItems || forumItems.length === 0) {
        if (coursesFallback && coursesFallback.length > 0) {
          coursesFallback.forEach((c) => {
            const courseCode = c.kode_course || c.kode || c.course_code || c.id;
            const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
            const item = document.createElement("div");
            item.className = "forum-card";
            item.innerHTML = `
            <div>
              <div class="forum-title">${courseTitle}</div>
              <div class="forum-course">Buka kelas untuk memeriksa forum diskusi</div>
            </div>
            <a class="btn-open-forum" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(courseCode)}" target="_blank">Lihat Kelas</a>
          `;
            forumContainer.appendChild(item);
          });
        } else {
          forumContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Tidak ada forum aktif saat ini.</div>';
        }
        return;
      }
      forumItems.forEach((f) => {
        const item = document.createElement("div");
        item.className = "forum-card";
        const statusBadge = f.completion ? '<span style="display:inline-block; font-size:10px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); padding:2px 6px; border-radius:4px; margin-left:6px;">Sudah Dijawab</span>' : '<span style="display:inline-block; font-size:10px; font-weight:700; color:#f59e0b; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px; margin-left:6px;">Belum Dijawab</span>';
        item.innerHTML = `
        <div>
          <div class="forum-title" style="display:flex; align-items:center; gap:4px;">
            ${f.courseTitle}
            ${statusBadge}
          </div>
          <div class="forum-course">${f.sectionName} &bull; ${f.forumName}</div>
        </div>
        <a class="btn-open-forum" href="https://mentari.unpam.ac.id/u-courses/${encodeURIComponent(f.courseCode)}/forum/${f.forumId}" target="_blank">Buka Forum</a>
      `;
        forumContainer.appendChild(item);
      });
    }
    _showSessionWarning(msg) {
      const forumContainer = this.shadow?.getElementById("forum-list-container");
      if (!forumContainer || this.shadow?.getElementById("mentari-session-banner")) return;
      const banner = document.createElement("div");
      banner.id = "mentari-session-banner";
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
      banner.querySelector("#btn-sync-token-banner")?.addEventListener("click", async () => {
        const btn = banner.querySelector("#btn-sync-token-banner");
        if (btn) btn.textContent = "Memindai...";
        window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
        await new Promise((r) => setTimeout(r, 600));
        banner.remove();
        await this._loadCoursesAndForums();
      });
    }
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
    async _fetchDataInternal(silent = false) {
      if (this._currentFetchPromise) {
        return this._currentFetchPromise;
      }
      this._currentFetchPromise = (async () => {
        const forumContainer = this.shadow?.getElementById("forum-list-container");
        const courseContainer = this.shadow?.getElementById("course-list-container");
        try {
          let options = await UnpamAuth.getFetchOptions();
          if (!options.headers["Authorization"]) {
            window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
            await new Promise((r) => setTimeout(r, 600));
            options = await UnpamAuth.getFetchOptions();
          }
          if (!options.headers["Authorization"]) {
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
              const handleRetry = async () => {
                UnpamAuth._cachedToken = null;
                await this._loadCoursesAndForums();
              };
              forumContainer.querySelector("#btn-retry-scan")?.addEventListener("click", handleRetry);
              courseContainer?.querySelector("#btn-retry-scan")?.addEventListener("click", handleRetry);
            }
            return;
          }
          const res = await fetch("https://mentari.unpam.ac.id/api/user-course?page=1&limit=50", options);
          if (res.status === 401) {
            const currentToken2 = await UnpamAuth.getAuthToken();
            if (currentToken2 && !UnpamAuth.isTokenValid(currentToken2)) {
              UnpamAuth.clearInvalidToken();
            }
            window.dispatchEvent(new CustomEvent("mentari-request-token-sync"));
            if (!silent) {
              this._showSessionWarning("Sesi login perlu disegarkan. Klik sembarang menu Mentari atau tombol Pindai Ulang.");
              if (courseContainer && (!this.courses || this.courses.length === 0)) {
                courseContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#f59e0b;">Sesi perlu disegarkan. Silakan klik tombol Pindai Ulang di tab Forum atau buka menu perkuliahan.</div>';
              }
            }
            return;
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Gagal memuat mata kuliah.`);
          }
          const resData = await res.json();
          const list = Array.isArray(resData) ? resData : resData.data || [];
          this.courses = list;
          if (list.length === 0) {
            if (!silent) {
              if (forumContainer) forumContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Tidak ada forum aktif saat ini.</div>';
              if (courseContainer) courseContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Tidak ada mata kuliah aktif.</div>';
            }
            return;
          }
          if (this.isOpen) {
            this._renderCourses(list);
          }
          const forumItems = [];
          const chunkSize = 3;
          for (let i = 0; i < list.length; i += chunkSize) {
            const chunk = list.slice(i, i + chunkSize);
            await Promise.allSettled(chunk.map(async (c) => {
              const courseCode = c.kode_course || c.kode || c.course_code || c.id;
              const courseTitle = c.nama_mata_kuliah || c.coursename || c.name || "Mata Kuliah";
              try {
                const cRes = await fetch(`https://mentari.unpam.ac.id/api/user-course/${encodeURIComponent(courseCode)}`, options);
                if (!cRes.ok) return;
                const cData = await cRes.json();
                const sections = Array.isArray(cData) ? cData : cData.data || [];
                sections.forEach((section) => {
                  const subSections = section.sub_section || [];
                  subSections.forEach((sub) => {
                    if (sub.kode_template === "FORUM_DISKUSI" && sub.id) {
                      forumItems.push({
                        courseCode,
                        courseTitle,
                        sectionName: section.nama_section || `Pertemuan ${section.urutan || ""}`,
                        forumId: sub.id,
                        forumName: sub.nama_sub_section || sub.judul || "Forum Diskusi",
                        completion: !!sub.completion
                      });
                    }
                  });
                });
              } catch (err) {
              }
            }));
          }
          this.activeForums = forumItems;
          if (this.isOpen) {
            this._renderForums(forumItems, list);
          }
          const currentToken = await UnpamAuth.getAuthToken();
          const userId = UnpamAuth.getUserIdentifier(currentToken);
          const cacheKey = `mentari_cached_data_${userId}`;
          Storage.set({
            [cacheKey]: {
              courses: list,
              forums: forumItems,
              updatedAt: Date.now()
            },
            mentari_cached_courses: list,
            mentari_cached_forums: forumItems
          });
        } catch (e) {
          if (!silent && forumContainer && (!this.courses || this.courses.length === 0)) {
            forumContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
            if (courseContainer) courseContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error: ${e.message}</div>`;
          }
        } finally {
          this._currentFetchPromise = null;
        }
      })();
      return this._currentFetchPromise;
    }
  };
  if (typeof window !== "undefined") {
    new MentariDashboard();
  }
})();
