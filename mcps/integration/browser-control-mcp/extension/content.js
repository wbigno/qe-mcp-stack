/**
 * Content Script - Runs in web pages and executes commands
 */

/**
 * Get page content (text, title, URL, metadata)
 */
function getPageContent() {
  return {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText,
    html: document.documentElement.outerHTML,
    metadata: {
      description:
        document.querySelector('meta[name="description"]')?.content || "",
      keywords: document.querySelector('meta[name="keywords"]')?.content || "",
      author: document.querySelector('meta[name="author"]')?.content || "",
      viewport: document.querySelector('meta[name="viewport"]')?.content || "",
    },
    links: Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({
        text: a.innerText.trim(),
        href: a.href,
      }))
      .slice(0, 50), // Limit to 50 links
    images: Array.from(document.querySelectorAll("img[src]"))
      .map((img) => ({
        src: img.src,
        alt: img.alt,
      }))
      .slice(0, 20), // Limit to 20 images
  };
}

/**
 * Execute JavaScript in page context
 * Injects a script tag to bypass CSP restrictions on new Function()
 */
async function executeScript(script) {
  try {
    // Inject script into page context to avoid CSP restrictions
    // This executes in the actual page context, not the content script context
    const result = await new Promise((resolve, reject) => {
      // Create unique ID for this execution
      const executionId = `__claudeExec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create script element
      const scriptElement = document.createElement("script");
      scriptElement.textContent = `
        (function() {
          try {
            // Store result in window for retrieval
            window.${executionId} = (function() {
              ${script}
            })();
            // Signal completion
            document.dispatchEvent(new CustomEvent('${executionId}_done', { detail: { success: true } }));
          } catch (error) {
            window.${executionId} = { __error: error.message };
            document.dispatchEvent(new CustomEvent('${executionId}_done', { detail: { success: false, error: error.message } }));
          }
        })();
      `;

      // Listen for completion
      const listener = (_event) => {
        document.removeEventListener(`${executionId}_done`, listener);
        const result = window[executionId];
        delete window[executionId]; // Cleanup

        if (result && result.__error) {
          reject(new Error(result.__error));
        } else {
          resolve(result);
        }

        // Remove script element
        scriptElement.remove();
      };

      document.addEventListener(`${executionId}_done`, listener);

      // Inject script
      (document.head || document.documentElement).appendChild(scriptElement);

      // Timeout after 10 seconds
      setTimeout(() => {
        document.removeEventListener(`${executionId}_done`, listener);
        scriptElement.remove();
        delete window[executionId];
        reject(new Error("Script execution timeout"));
      }, 10000);
    });

    return { result, error: null };
  } catch (error) {
    return { result: null, error: error.message };
  }
}

/**
 * Click an element
 */
async function clickElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Scroll into view
  element.scrollIntoView({ behavior: "smooth", block: "center" });

  // Wait a bit for scroll
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Click the element
  element.click();

  return {
    success: true,
    selector,
    elementType: element.tagName,
    elementText: element.innerText?.substring(0, 100) || "",
  };
}

/**
 * Type text into an input field
 */
async function typeText(selector, text) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  if (!["INPUT", "TEXTAREA"].includes(element.tagName)) {
    throw new Error(`Element is not an input field: ${element.tagName}`);
  }

  // Scroll into view
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Focus and type
  element.focus();
  element.value = text;

  // Trigger input event
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));

  return {
    success: true,
    selector,
    text: text.substring(0, 100), // Return first 100 chars
  };
}

/**
 * Navigate to a URL
 */
async function navigate(url) {
  window.location.href = url;
  return { success: true, url };
}

// Avoid multiple injections
if (!window.__claudeBridgeInjected) {
  window.__claudeBridgeInjected = true;

  console.log("[Bridge Content] Initialized on:", window.location.href);

  // Listen for commands from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Bridge Content] Received command:", request.command);

    (async () => {
      try {
        let result;

        switch (request.command) {
          case "getPageContent":
            result = getPageContent();
            break;

          case "getPageHTML":
            result = { html: document.documentElement.outerHTML };
            break;

          case "getSelection":
            result = { text: window.getSelection().toString() };
            break;

          case "executeScript":
            result = await executeScript(request.params.script);
            break;

          case "clickElement":
            result = await clickElement(request.params.selector);
            break;

          case "typeText":
            result = await typeText(
              request.params.selector,
              request.params.text,
            );
            break;

          case "navigate":
            result = await navigate(request.params.url);
            break;

          case "takeScreenshot":
            // Screenshots are handled by background script with chrome.tabs.captureVisibleTab
            result = {
              message: "Screenshot command should be handled by background",
            };
            break;

          default:
            throw new Error(`Unknown command: ${request.command}`);
        }

        sendResponse({ success: true, result });
      } catch (error) {
        console.error("[Bridge Content] Command error:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Async response
  });
}
