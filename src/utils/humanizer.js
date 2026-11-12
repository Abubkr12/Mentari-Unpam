/**
 * Mentari Mod Modern Edition - Humanizer & Anti-Detection Engine
 * Mencegah flagging telemetry & deteksi anomali submit instan di LMS.
 */

export const Humanizer = {
  /**
   * Jeda waktu statis
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  async readingPacing(text = '', minBaseMs = 350, maxBaseMs = 700) {
    const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
    // Jeda mikro tambahan ~15ms per kata
    const calculated = minBaseMs + (wordCount * 15);
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

    // 1. Scroll natural ke elemen jika terlihat
    try {
      element.scrollIntoView({
        behavior: fast ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } catch {
      // Fallback
    }

    // Micro pause setelah scroll (fast: 40-80ms, normal: 150-300ms)
    await this.delay(fast ? (40 + Math.random() * 40) : (150 + Math.random() * 150));

    // 2. Dispatch sequence event mouse
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
      element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
      element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
      if (typeof element.focus === 'function') element.focus();
      
      // Micro hold click (fast: 20-40ms, normal: 40-70ms)
      await this.delay(fast ? (20 + Math.random() * 20) : (40 + Math.random() * 30));

      element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
      element.dispatchEvent(new MouseEvent('mouseup', eventOpts));

      // Eksekusi klik satu kali: utamakan native .click() untuk kestabilan React Next.js
      if (typeof element.click === 'function') {
        element.click();
      } else {
        element.dispatchEvent(new MouseEvent('click', eventOpts));
      }
      
      // Jika itu input radio/checkbox dan belum checked, trigger perubahan
      if (element.tagName === 'INPUT' && !element.checked) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {
      // Fallback standard click jika event pointer tidak didukung
      element.click();
    }

    return true;
  }
};
