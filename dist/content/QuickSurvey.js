(() => {
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

  // src/content/QuickSurvey.js
  var QuickSurveyAssistant = class {
    constructor() {
      this._init();
    }
    _init() {
      console.log("[Mentari Mod] MyUnpam Quick Survey Assistant aktif.");
      window.addEventListener("mentari-survey-trigger", async () => {
        try {
          await this.fillSurvey();
        } catch (e) {
          Toast.error("Gagal mengisi survei: " + e.message);
        }
      });
      this._injectFloatingButtonIfNeeded();
    }
    _injectFloatingButtonIfNeeded() {
      setTimeout(() => {
        if (document.getElementById("mentari-myunpam-dock-host") || document.getElementById("mentari-survey-btn-host")) {
          return;
        }
        const host = document.createElement("div");
        host.id = "mentari-survey-btn-host";
        host.style.position = "fixed";
        host.style.bottom = "24px";
        host.style.right = "24px";
        host.style.zIndex = "2147483640";
        const shadow = host.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
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
        .btn-survey-fill:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `;
        const btn = document.createElement("button");
        btn.className = "btn-survey-fill";
        btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Auto-Isi Survei MyUnpam
      `;
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          btn.textContent = "Mengisi survei...";
          try {
            await this.fillSurvey();
          } catch (e) {
            Toast.error("Gagal mengisi survei: " + e.message);
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
      }, 400);
    }
    async fillSurvey() {
      const radioGroups = {};
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => {
        const name = r.name || "default_group";
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(r);
      });
      let filledCount = 0;
      for (const groupName in radioGroups) {
        const groupRadios = radioGroups[groupName];
        let targetRadio = null;
        for (const r of groupRadios) {
          const val = (r.value || "").toLowerCase();
          const labelText = (r.closest("label")?.textContent || r.parentElement?.textContent || "").toLowerCase();
          if (val === "4" || val === "5" || val === "sangat baik" || val === "sangat setuju" || labelText.includes("sangat baik") || labelText.includes("sangat setuju") || labelText.includes("sangat puas")) {
            targetRadio = r;
            break;
          }
        }
        if (!targetRadio && groupRadios.length > 0) {
          targetRadio = groupRadios[groupRadios.length - 1];
        }
        if (targetRadio && !targetRadio.checked) {
          await Humanizer.naturalClick(targetRadio);
          targetRadio.checked = true;
          targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
          targetRadio.dispatchEvent(new Event("input", { bubbles: true }));
          await Humanizer.randomDelay(80, 160);
          filledCount++;
        }
      }
      const customRatingBtns = document.querySelectorAll(".rating-btn, button[data-score], .btn-score");
      for (const el of customRatingBtns) {
        const score = el.getAttribute("data-score") || el.textContent.trim();
        if (score === "4" || score === "5" || el.classList.contains("rating-max")) {
          await Humanizer.naturalClick(el);
          await Humanizer.randomDelay(80, 160);
          filledCount++;
        }
      }
      const textareas = document.querySelectorAll("textarea");
      let textFilled = 0;
      const feedbackList = [
        "Proses pembelajaran dan pelayanan akademik sudah sangat baik, komunikatif, dan memfasilitasi kebutuhan mahasiswa dengan optimal.",
        "Fasilitas dan penyampaian materi perkuliahan sangat memuaskan dan mendukung efektivitas studi.",
        "Sangat baik dan profesional. Semoga standar mutu ini terus dipertahankan dan ditingkatkan."
      ];
      for (const ta of textareas) {
        if (!ta.value.trim()) {
          const randomFeedback = feedbackList[Math.floor(Math.random() * feedbackList.length)];
          ta.value = randomFeedback;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          ta.dispatchEvent(new Event("change", { bubbles: true }));
          textFilled++;
        }
      }
      if (filledCount > 0 || textFilled > 0) {
        Toast.success(`Survei akademik berhasil diisi otomatis (${filledCount} opsi, ${textFilled} saran).`, "Survei Terisi");
      } else {
        Toast.warning("Tidak ditemukan form survei aktif pada halaman saat ini.", "Info Survei");
      }
    }
  };
  if (typeof window !== "undefined") {
    new QuickSurveyAssistant();
  }
})();
