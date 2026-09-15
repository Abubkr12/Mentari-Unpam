(() => {
  // src/popup/script.js
  document.addEventListener("DOMContentLoaded", async () => {
    const pageStatus = document.getElementById("page-status");
    const modelStatus = document.getElementById("model-status");
    const btnDashboard = document.getElementById("btn-toggle-dashboard");
    const btnSettings = document.getElementById("btn-open-settings");
    const feedbackMsg = document.getElementById("feedback-msg");
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["gemini_model", "geminiApiKey"], (data) => {
        if (data.gemini_model) {
          modelStatus.textContent = data.gemini_model.replace("gemini-", "");
        } else {
          modelStatus.textContent = "Belum Disetel";
          modelStatus.className = "status-val warning";
        }
      });
    }
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
    function showFeedback(msg) {
      feedbackMsg.textContent = msg;
      feedbackMsg.style.display = "block";
      setTimeout(() => {
        feedbackMsg.style.display = "none";
      }, 4e3);
    }
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
        showFeedback("Buka situs mentari.unpam.ac.id atau my.unpam.ac.id terlebih dahulu.");
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
        showFeedback("Fitur ini dapat diakses langsung saat membuka portal UNPAM.");
      }
    });
  });
})();
