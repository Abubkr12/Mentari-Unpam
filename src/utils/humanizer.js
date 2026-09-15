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
   * Asumsi kecepatan baca normal mahasiswa: ~180-220 kata per menit
   */
  async readingPacing(text = '', minBaseMs = 3000, maxBaseMs = 8000) {
    const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
    // Jeda tambahan ~250ms per kata
    const calculated = minBaseMs + (wordCount * 250);
    // Batasi dalam rentang yang wajar
    const targetMs = Math.min(Math.max(calculated, minBaseMs), maxBaseMs);
    // Tambah variasi acak +- 20%
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

    // 1. Scroll natural ke elemen
    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } catch {
      // Fallback
    }

    // Micro pause setelah scroll (300-600ms)
    await this.delay(300 + Math.random() * 300);

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
      
      // Micro hold click (50-120ms)
      await this.delay(50 + Math.random() * 70);

      element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
      element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
      element.dispatchEvent(new MouseEvent('click', eventOpts));
      
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
