/**
 * Mentari Mod Modern Edition - Toast Notification Utility
 * Pengganti native alert() browser dengan Closed Shadow DOM & SVG icons (bebas stock emoji).
 */

class ToastManager {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.container = null;
    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;

    // Host element
    this.host = document.createElement('div');
    this.host.id = 'mentari-toast-host';
    this.host.style.position = 'fixed';
    this.host.style.top = '20px';
    this.host.style.right = '20px';
    this.host.style.zIndex = '2147483647';
    this.host.style.pointerEvents = 'none';

    // Closed Shadow DOM agar gaya CSS tidak bocor/dibajak oleh website
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    // CSS Styling
    const style = document.createElement('style');
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

    this.container = document.createElement('div');
    this.container.className = 'toast-container';

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);

    const mount = () => {
      if (document.body && !document.getElementById('mentari-toast-host')) {
        document.body.appendChild(this.host);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  _getIconSvg(type) {
    switch (type) {
      case 'success':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      case 'warning':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      case 'error':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      default: // info
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  }

  show(options) {
    if (!this.container) return;

    // Pastikan host terpasang di DOM
    if (document.body && !this.host.parentElement) {
      document.body.appendChild(this.host);
    }

    const {
      title = '',
      message = '',
      type = 'info', // 'info' | 'success' | 'warning' | 'error'
      duration = 4500
    } = typeof options === 'string' ? { message: options } : options;

    const card = document.createElement('div');
    card.className = `toast-card toast-${type}`;
    card.innerHTML = `
      <div class="toast-icon">${this._getIconSvg(type)}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Tutup">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const closeBtn = card.querySelector('.toast-close');
    const dismiss = () => {
      card.classList.add('hide');
      setTimeout(() => {
        if (card.parentElement) card.remove();
      }, 250);
    };

    closeBtn.addEventListener('click', dismiss);
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    this.container.appendChild(card);
  }

  success(message, title = 'Berhasil') {
    this.show({ title, message, type: 'success' });
  }

  error(message, title = 'Terjadi Kesalahan') {
    this.show({ title, message, type: 'error', duration: 6000 });
  }

  warning(message, title = 'Perhatian') {
    this.show({ title, message, type: 'warning' });
  }

  info(message, title = 'Informasi') {
    this.show({ title, message, type: 'info' });
  }
}

export const Toast = new ToastManager();
