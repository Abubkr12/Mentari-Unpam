/**
 * Mentari Mod Modern Edition - Auto Password Helper
 * Membantu mahasiswa mengisi default password UNPAM (<nim>unpam#) secara otomatis saat login.
 */

class PasswordHelper {
  constructor() {
    this._init();
  }

  _init() {
    const nimInput = document.querySelector('input[name="username"], input[name="nim"], #username, #nim');
    const passInput = document.querySelector('input[name="password"], input[type="password"], #password');

    if (!nimInput || !passInput) return;

    // Pasang listener saat user selesai mengetik NIM
    nimInput.addEventListener('blur', () => {
      const nim = nimInput.value.trim();
      // Format NIM UNPAM umumnya numerik 10-14 digit
      if (nim.length >= 8 && !passInput.value) {
        passInput.value = `${nim}unpam#`;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
}

if (typeof window !== 'undefined') {
  new PasswordHelper();
}