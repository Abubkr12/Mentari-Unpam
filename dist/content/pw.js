(() => {
  // src/content/pw.js
  var PasswordHelper = class {
    constructor() {
      this._init();
    }
    _init() {
      const nimInput = document.querySelector('input[name="username"], input[name="nim"], #username, #nim');
      const passInput = document.querySelector('input[name="password"], input[type="password"], #password');
      if (!nimInput || !passInput) return;
      nimInput.addEventListener("blur", () => {
        const nim = nimInput.value.trim();
        if (nim.length >= 8 && !passInput.value) {
          passInput.value = `${nim}unpam#`;
          passInput.dispatchEvent(new Event("input", { bubbles: true }));
          passInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }
  };
  if (typeof window !== "undefined") {
    new PasswordHelper();
  }
})();
