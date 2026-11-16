(() => {
  // src/popup/script.js
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      chrome.storage.local.get(["mentari_theme"], (res) => {
        if (res?.mentari_theme === "light") {
          document.body.classList.add("theme-light");
          document.body.classList.remove("theme-dark");
        } else if (res?.mentari_theme === "dark") {
          document.body.classList.add("theme-dark");
          document.body.classList.remove("theme-light");
        }
      });
    } catch {
    }
    const pageStatus = document.getElementById("page-status");
    const modelStatus = document.getElementById("model-status");
    const apiStatusLabel = document.getElementById("api-status-label");
    const apiBadge = document.getElementById("api-badge");
    const inputQuickKey = document.getElementById("input-quick-api-key");
    const btnSaveQuickKey = document.getElementById("btn-save-quick-key");
    const quickApiHint = document.getElementById("quick-api-hint");
    const btnDashboard = document.getElementById("btn-toggle-dashboard");
    const btnSettings = document.getElementById("btn-open-settings");
    const feedbackMsg = document.getElementById("feedback-msg");
    function maskKey(key) {
      if (!key || typeof key !== "string") return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      if (key.length <= 12) return key.slice(0, 4) + "..." + key.slice(-2);
      return key.slice(0, 7) + "..." + key.slice(-4);
    }
    let feedbackTimer = null;
    function showFeedback(msg, type = "warning") {
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackMsg.textContent = msg;
      feedbackMsg.className = `msg-feedback ${type}`;
      feedbackMsg.style.display = "block";
      feedbackTimer = setTimeout(() => {
        feedbackMsg.style.display = "none";
      }, 4500);
    }
    async function loadApiKeyState() {
      chrome.runtime.sendMessage({ action: "getGeminiApiKeys" }, (res) => {
        const keys = res?.keys || [];
        const activeKey = res?.activeKey || keys[0] || "";
        if (keys.length > 0) {
          if (apiStatusLabel) {
            apiStatusLabel.textContent = `Tersimpan (${keys.length} Key)`;
            apiStatusLabel.className = "status-val";
          }
          if (apiBadge) {
            apiBadge.textContent = `${keys.length} Key Aktif`;
            apiBadge.className = "api-badge active";
          }
          if (quickApiHint) {
            quickApiHint.textContent = `Key Utama: ${maskKey(activeKey)} (${keys.length} key dalam pool failover).`;
          }
          if (inputQuickKey) {
            inputQuickKey.placeholder = "Tambah key cadangan (AQ... / AIza...)";
          }
        } else {
          if (apiStatusLabel) {
            apiStatusLabel.textContent = "Belum Disetel";
            apiStatusLabel.className = "status-val warning";
          }
          if (apiBadge) {
            apiBadge.textContent = "Belum Disetel";
            apiBadge.className = "api-badge";
          }
          if (quickApiHint) {
            quickApiHint.textContent = "Masukkan API Key dari Google AI Studio (AQ... atau AIza...).";
          }
          if (inputQuickKey) {
            inputQuickKey.placeholder = "AQ... atau AIza...";
            setTimeout(() => inputQuickKey.focus(), 200);
          }
        }
      });
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["gemini_model"], (data) => {
          if (data.gemini_model) {
            modelStatus.textContent = data.gemini_model.replace("gemini-", "");
            modelStatus.className = "status-val";
          } else {
            modelStatus.textContent = "Belum Disetel";
            modelStatus.className = "status-val warning";
          }
        });
      }
    }
    await loadApiKeyState();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || "";
    const isMentari = url.includes("mentari.unpam.ac.id");
    const isMyUnpam = url.includes("my.unpam.ac.id");
    if (isMentari) {
      pageStatus.textContent = "Mentari LMS";
      pageStatus.className = "status-val";
    } else if (isMyUnpam) {
      pageStatus.textContent = "MyUnpam Portal";
      pageStatus.className = "status-val";
      btnDashboard.textContent = "Buka Presensi MyUnpam";
    } else {
      pageStatus.textContent = "Di Luar UNPAM";
      pageStatus.className = "status-val warning";
    }
    async function handleQuickSaveApiKey() {
      const keyVal = inputQuickKey.value.trim();
      if (!keyVal) {
        showFeedback("Silakan ketik atau tempel API Key Gemini Anda.", "warning");
        inputQuickKey.focus();
        return;
      }
      btnSaveQuickKey.disabled = true;
      btnSaveQuickKey.textContent = "Menguji...";
      chrome.runtime.sendMessage({
        action: "addGeminiApiKey",
        apiKey: keyVal
      }, (res) => {
        btnSaveQuickKey.disabled = false;
        btnSaveQuickKey.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Simpan
      `;
        if (res && res.valid) {
          inputQuickKey.value = "";
          showFeedback("API Key valid dan berhasil disimpan ke pool!", "success");
          loadApiKeyState();
          if (tab?.id && (isMentari || isMyUnpam)) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (k) => window.dispatchEvent(new CustomEvent("gemini-api-key-updated", { detail: { apiKey: k } })),
              args: [keyVal]
            }).catch(() => {
            });
          }
        } else {
          showFeedback(res?.message || "Verifikasi API Key gagal ditolak Google.", "error");
        }
      });
    }
    btnSaveQuickKey.addEventListener("click", handleQuickSaveApiKey);
    inputQuickKey.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        handleQuickSaveApiKey();
      }
    });
    inputQuickKey.addEventListener("keypress", (e) => e.stopPropagation());
    inputQuickKey.addEventListener("keyup", (e) => e.stopPropagation());
    inputQuickKey.addEventListener("paste", (e) => e.stopPropagation());
    btnDashboard.addEventListener("click", async () => {
      if (!tab?.id) return;
      if (isMentari) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.dispatchEvent(new CustomEvent("mentari-toggle-popup"))
        });
        window.close();
      } else if (isMyUnpam) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.dispatchEvent(new CustomEvent("mentari-presensi-popup"))
        });
        window.close();
      } else {
        showFeedback("Buka situs mentari.unpam.ac.id atau my.unpam.ac.id terlebih dahulu.", "warning");
      }
    });
    btnSettings.addEventListener("click", async () => {
      if (!tab?.id) return;
      if (isMentari || isMyUnpam) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.dispatchEvent(new CustomEvent("mentari-update-api-key"))
        });
        window.close();
      } else {
        inputQuickKey.focus();
        showFeedback("Untuk mengelola seluruh daftar API Key (hapus/utamakan), buka tab portal Mentari atau MyUnpam.", "warning");
      }
    });
  });
})();
