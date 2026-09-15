(() => {
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

  // src/content/discus.js
  var DiscusAssistant = class {
    constructor() {
      this._init();
    }
    _init() {
      console.log("[Mentari Mod] Forum Discussion Assistant aktif.");
      this._attachActionButtons();
      const observer = new MutationObserver(() => {
        this._attachActionButtons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    _attachActionButtons() {
      if (document.getElementById("mentari-discus-toolbar")) return;
      const topicContainer = document.querySelector(".ck-content") || document.querySelector(".MuiPaper-root") || document.querySelector("main");
      if (!topicContainer) return;
      const toolbar = document.createElement("div");
      toolbar.id = "mentari-discus-toolbar";
      toolbar.style.cssText = `
      display: flex;
      gap: 10px;
      margin: 16px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
      const btnAnswer = document.createElement("button");
      btnAnswer.style.cssText = `
      background: #f59e0b;
      color: #121212;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    `;
      btnAnswer.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      AI Cari Jawaban
    `;
      const btnAsk = document.createElement("button");
      btnAsk.style.cssText = `
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    `;
      btnAsk.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      AI Buat Pertanyaan
    `;
      btnAnswer.addEventListener("click", () => this.handleGenerateAnswer(btnAnswer));
      btnAsk.addEventListener("click", () => this.handleGenerateQuestion(btnAsk));
      toolbar.appendChild(btnAnswer);
      toolbar.appendChild(btnAsk);
      const editorTarget = document.querySelector(".ck-editor, form, .MuiTextField-root");
      if (editorTarget) {
        editorTarget.parentElement.insertBefore(toolbar, editorTarget);
      } else {
        topicContainer.appendChild(toolbar);
      }
    }
    _getTopicText() {
      const postEls = document.querySelectorAll('.discussion-post, [role="article"], .MuiPaper-root, .ck-content');
      for (const el of postEls) {
        const txt = el.textContent.trim();
        if (txt.length > 20) return txt;
      }
      return document.title || "Materi Perkuliahan";
    }
    async handleGenerateAnswer(btn) {
      const topicText = this._getTopicText();
      btn.disabled = true;
      btn.textContent = "Menganalisis...";
      Toast.info("Mengirim permintaan ke Gemini AI...");
      chrome.runtime.sendMessage({
        action: "generateGeminiContent",
        prompt: `Berikut adalah topik forum diskusi kuliah:
"${topicText}"

Buatlah jawaban atau tanggapan diskusi yang akademis, sopan, mendalam, dan relevan dengan bahasa Indonesia yang baik:`,
        systemInstruction: "Kamu adalah mahasiswa pintar yang berpartisipasi aktif dalam forum diskusi akademik universitas."
      }, async (res) => {
        btn.disabled = false;
        btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        AI Cari Jawaban
      `;
        if (res && res.success) {
          try {
            await navigator.clipboard.writeText(res.text);
            Toast.success("Jawaban berhasil disalin ke clipboard! Siap di-paste ke forum.");
          } catch {
            Toast.info("Jawaban berhasil dibuat.");
          }
          const ckEditor = document.querySelector(".ck-content");
          if (ckEditor) {
            ckEditor.innerHTML = `<p>${res.text.replace(/\n/g, "<br>")}</p>`;
            ckEditor.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else {
          Toast.error(res ? res.error : "Gagal menghasilkan tanggapan.");
        }
      });
    }
    async handleGenerateQuestion(btn) {
      const topicText = this._getTopicText();
      btn.disabled = true;
      btn.textContent = "Membuat...";
      chrome.runtime.sendMessage({
        action: "generateGeminiContent",
        prompt: `Berdasarkan materi forum berikut:
"${topicText}"

Buatlah 1 pertanyaan diskusi kritis yang akademis dan menarik untuk ditanyakan kepada dosen/teman sekelas.`,
        systemInstruction: "Kamu adalah mahasiswa kritis yang ingin mendalami materi kuliah."
      }, async (res) => {
        btn.disabled = false;
        btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        AI Buat Pertanyaan
      `;
        if (res && res.success) {
          try {
            await navigator.clipboard.writeText(res.text);
            Toast.success("Pertanyaan berhasil dibuat dan disalin ke clipboard!");
          } catch {
            Toast.info("Pertanyaan berhasil dibuat.");
          }
        } else {
          Toast.error(res ? res.error : "Gagal menghasilkan pertanyaan.");
        }
      });
    }
  };
  if (typeof window !== "undefined") {
    new DiscusAssistant();
  }
})();
