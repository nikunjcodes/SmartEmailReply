console.log("Gmail AI Reply Assistant loaded");

const STATE = {
  currentSettings: {
    tone: "professional",
    language: "en",
    length: "medium",
    customTone: "",
    includeGreeting: true,
    includeSignature: true,
  },
  isProcessing: false,
};

const SELECTORS = {
  toolbars: [".btC", ".aDh", '[role="toolbar"]', ".gU.Up"],
  emailContent: [".h7", ".a3s.aiL", '[role="presentation"]', ".gmail_quote"],
  composeBox: '[role="textbox"][g_editable="true"]',
  replyButton: ".email-writer-button",
};

const API_ENDPOINTS = {
  generate: "http://localhost:8090/api/email/generate",
};

class UIComponents {
  static createButton() {
    const button = document.createElement("div");
    button.className = "email-writer-button";
    button.innerHTML = `
      <div class="button-content">
        <span class="button-text">AI Reply</span>
        <span class="loading-spinner"></span>
      </div>
    `;
    return button;
  }
}

class SettingsManager {
  static async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STATE.currentSettings, (settings) => {
        STATE.currentSettings = settings;
        resolve(settings);
      });
    });
  }
}

class EmailHandler {
  static findComposeToolbar() {
    for (const selector of SELECTORS.toolbars) {
      const toolbar = document.querySelector(selector);
      if (toolbar) return toolbar;
    }
    return null;
  }

  static getEmailContent() {
    for (const selector of SELECTORS.emailContent) {
      const content = document.querySelector(selector);
      if (content?.innerText?.trim()) {
        return content.innerText.trim();
      }
    }
    return "";
  }

  static async generateReply(emailContent) {
    try {
      const response = await fetch(API_ENDPOINTS.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent,
          ...STATE.currentSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error("Generate reply error:", error);
      throw new Error("Failed to generate email reply");
    }
  }

  static insertReply(reply) {
    const composeBox = document.querySelector(SELECTORS.composeBox);
    if (!composeBox) {
      throw new Error("Compose box not found");
    }
    composeBox.focus();
    document.execCommand("insertText", false, reply);
  }
}

class ButtonController {
  constructor() {
    this.button = null;
  }

  async initialize() {
    await SettingsManager.loadSettings();
    this.injectButton();
    this.setupEventListeners();

    chrome.storage.onChanged.addListener((changes) => {
      Object.keys(changes).forEach((key) => {
        STATE.currentSettings[key] = changes[key].newValue;
      });
    });
  }

  injectButton() {
    if (document.querySelector(SELECTORS.replyButton)) return;

    const toolbar = EmailHandler.findComposeToolbar();
    if (!toolbar) return;

    this.button = UIComponents.createButton();
    toolbar.insertBefore(this.button, toolbar.firstChild);
  }

  setupEventListeners() {
    if (!this.button) return;

    this.button.addEventListener("click", async (e) =>
      this.handleButtonClick(e)
    );
  }

  async handleButtonClick(e) {
    if (STATE.isProcessing) return;

    try {
      STATE.isProcessing = true;
      this.updateButtonState(true);

      const emailContent = EmailHandler.getEmailContent();
      if (!emailContent) {
        throw new Error("No email content found to reply to");
      }

      const reply = await EmailHandler.generateReply(emailContent);
      EmailHandler.insertReply(reply);
    } catch (error) {
      console.error("Button click error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      STATE.isProcessing = false;
      this.updateButtonState(false);
    }
  }

  updateButtonState(isProcessing) {
    const buttonText = this.button.querySelector(".button-text");
    const spinner = this.button.querySelector(".loading-spinner");

    buttonText.textContent = isProcessing ? "Generating..." : "AI Reply";
    spinner.style.display = isProcessing ? "block" : "none";
    this.button.classList.toggle("processing", isProcessing);
  }
}

const initializeExtension = () => {
  const buttonController = new ButtonController();
  buttonController.initialize();
};

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches(".aDh, .btC, [role='dialog']") ||
          node.querySelector(".aDh, .btC, [role='dialog']"))
      ) {
        setTimeout(initializeExtension, 500);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

initializeExtension();
