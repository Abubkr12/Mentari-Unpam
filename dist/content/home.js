(() => {
  // src/content/home.js
  var HomeTheme = class {
    constructor() {
      this._applyStyles();
    }
    _applyStyles() {
      if (document.getElementById("mentari-home-theme")) return;
      const style = document.createElement("style");
      style.id = "mentari-home-theme";
      style.textContent = `
      /* Cyber Metallic Glass container */
      .MuiDrawer-paperAnchorRight.MuiDrawer-paper {
        background: rgba(22, 24, 28, 0.88) !important;
        height: 94% !important;
        top: 3% !important;
        backdrop-filter: blur(24px) saturate(180%) !important;
        border-left: 2px solid #d4af37 !important;
        width: 420px !important;
        box-shadow: -15px 0 50px rgba(0, 0, 0, 0.5) !important;
        color: #e5e5e5 !important;
        border-radius: 20px 0 0 20px !important;
      }

      .MuiTypography-h4 {
        font-weight: 800 !important;
        color: #fff !important;
        border-left: 4px solid #d4af37 !important;
        padding-left: 14px !important;
      }

      .MuiOutlinedInput-root {
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
      }

      .MuiOutlinedInput-root.Mui-focused {
        border-color: #d4af37 !important;
        box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2) !important;
      }

      .MuiButton-containedPrimary {
        background: #d4af37 !important;
        color: #121212 !important;
        font-weight: 700 !important;
        border-radius: 12px !important;
        height: 48px !important;
        transition: all 0.2s ease !important;
      }

      .MuiButton-containedPrimary:hover {
        background: #e6be40 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 8px 25px rgba(212, 175, 55, 0.35) !important;
      }
    `;
      document.head.appendChild(style);
    }
  };
  if (typeof window !== "undefined") {
    new HomeTheme();
  }
})();
