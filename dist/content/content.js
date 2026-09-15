(() => {
  // src/utils/dom.js
  var DOM = {
    /**
     * Mencari tombol berdasarkan teks kontennya (pengganti fatal bug :contains())
     * Aman dari DOMException / SyntaxError pada Chromium modern.
     */
    findButtonByText(keywords, root = document) {
      const list = Array.isArray(keywords) ? keywords : [keywords];
      const normalized = list.map((k) => k.trim().toLowerCase());
      const buttons = root.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"], div[role="button"]');
      for (const btn of buttons) {
        if (btn.offsetParent === null && !btn.getClientRects().length) continue;
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

  // src/content/content.js
  var MentariContentEntry = class {
    constructor() {
      this._isChecking = false;
      this._init();
    }
    async _init() {
      console.log("[Mentari Mod Modern Edition] Menginisialisasi Content Entry...");
      this._injectMainSnifferFallback();
      this._injectFonts();
      this._setupHeaderToggle();
      this._setupFloatingLauncher();
      this._initPersistentObserver();
      this._setupGeminiChatCoordination();
    }
    _injectMainSnifferFallback() {
      if (document.getElementById("mentari-main-sniffer")) return;
      try {
        const s = document.createElement("script");
        s.id = "mentari-main-sniffer";
        s.src = chrome.runtime.getURL("content/main-sniffer.js");
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {
      }
    }
    _injectFonts() {
      if (document.getElementById("mentari-symbols-font")) return;
      const link = document.createElement("link");
      link.id = "mentari-symbols-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0";
      document.head.appendChild(link);
    }
    /**
     * Injeksi tombol toggle di navbar header tepat di samping tombol Dark Mode
     * Menggunakan parentElement langsung untuk mencegah DOMException pada wrapper MUI.
     */
    _setupHeaderToggle() {
      if (document.getElementById("mentari-header-toggle")) return;
      const darkSvg = document.querySelector('svg[data-testid="DarkModeIcon"], svg[data-testid="LightModeIcon"]');
      if (darkSvg) {
        const darkModeBtn = darkSvg.closest("button");
        if (darkModeBtn && darkModeBtn.parentElement) {
          const btn = this._createHeaderButton();
          darkModeBtn.parentElement.insertBefore(btn, darkModeBtn);
          return;
        }
      }
      const header = DOM.findHeaderContainer();
      if (header) {
        const toolbar = header.querySelector(".MuiToolbar-root") || header;
        const btn = this._createHeaderButton();
        btn.style.marginLeft = "8px";
        toolbar.appendChild(btn);
      }
    }
    _createHeaderButton() {
      const btn = document.createElement("button");
      btn.id = "mentari-header-toggle";
      btn.className = "MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium";
      btn.title = "Buka Dashboard Mentari Mod";
      btn.setAttribute("aria-label", "Dashboard Mentari Mod");
      btn.style.cssText = `
      margin-right: 8px;
      padding: 8px;
      background-color: transparent;
      border: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      outline: 0;
      color: #ff7b00;
      cursor: pointer;
      position: relative;
      transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    `;
      btn.innerHTML = `
      <svg class="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium" focusable="false" aria-hidden="true" viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;">
        <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
      </svg>
      <span class="MuiTouchRipple-root"></span>
    `;
      btn.addEventListener("mouseenter", () => {
        btn.style.backgroundColor = "rgba(255, 123, 0, 0.14)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.backgroundColor = "transparent";
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("mentari-toggle-popup"));
      });
      return btn;
    }
    /**
     * Injeksi Floating Launcher Button tepat di atas icon Gemini AI
     * (bottom: 82px, left: 24px) dengan Closed Shadow DOM
     */
    _setupFloatingLauncher() {
      if (document.getElementById("mentari-floating-launcher-host")) return;
      const host = document.createElement("div");
      host.id = "mentari-floating-launcher-host";
      host.style.position = "fixed";
      host.style.bottom = "82px";
      host.style.left = "24px";
      host.style.zIndex = "2147483638";
      host.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      const shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .launcher-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .launcher-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ff7b00, #ea580c);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 8px 24px rgba(255, 123, 0, 0.42);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        outline: none;
      }
      .launcher-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 10px 28px rgba(255, 123, 0, 0.55);
      }
      .launcher-btn:active {
        transform: scale(0.96);
      }
      .tooltip {
        position: absolute;
        left: 58px;
        white-space: nowrap;
        background: #18181b;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 123, 0, 0.35);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        pointer-events: none;
        opacity: 0;
        transform: translateX(-6px);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .launcher-wrap:hover .tooltip {
        opacity: 1;
        transform: translateX(0);
      }
    `;
      const wrap = document.createElement("div");
      wrap.className = "launcher-wrap";
      const btn = document.createElement("button");
      btn.className = "launcher-btn";
      btn.setAttribute("aria-label", "Dashboard Mentari Mod");
      btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
      </svg>
    `;
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = "Dashboard Mentari Mod";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("mentari-toggle-popup"));
      });
      wrap.appendChild(btn);
      wrap.appendChild(tooltip);
      shadow.appendChild(style);
      shadow.appendChild(wrap);
      document.body.appendChild(host);
    }
    /**
     * Menyelaraskan tampilan floating launcher dengan jendela Gemini Chat
     * agar tidak terjadi tumpang-tindih visual saat jendela chat dibuka.
     */
    _setupGeminiChatCoordination() {
      window.addEventListener("mentari-gemini-chat-toggle", (e) => {
        const host = document.getElementById("mentari-floating-launcher-host");
        if (!host) return;
        const isOpen = !!e.detail?.isOpen;
        if (isOpen) {
          host.style.opacity = "0";
          host.style.pointerEvents = "none";
          host.style.transform = "translateY(10px) scale(0.9)";
        } else {
          host.style.opacity = "1";
          host.style.pointerEvents = "auto";
          host.style.transform = "none";
        }
      });
    }
    /**
     * Pengawas DOM persisten dengan debounce requestAnimationFrame
     */
    _initPersistentObserver() {
      const checkAndInject = () => {
        if (this._isChecking) return;
        this._isChecking = true;
        requestAnimationFrame(() => {
          this._setupHeaderToggle();
          this._setupFloatingLauncher();
          this._isChecking = false;
        });
      };
      const observer = new MutationObserver(checkAndInject);
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
      setInterval(checkAndInject, 1500);
    }
  };
  if (typeof window !== "undefined") {
    new MentariContentEntry();
  }
})();
