// Omni Meta Lord — ISOLATED world content script
// Bridges settings and player messages between the extension (popup/background)
// and the MAIN world injected script via window postMessage.

(function () {
  'use strict';

  const themeAsset = 'assets/363bc7ce3c45ce75bd795bd0ab88d936.gif';

  function postToPage(type, payload) {
    window.postMessage({ source: "Omni-Universal-Lord", type, ...payload }, "*");
  }

  function sendTheme() {
    try {
      var url = chrome.runtime.getURL(themeAsset);
      fetch(url, { method: 'HEAD' })
        .then(function (res) {
          if (res.ok) postToPage("OMNI_THEME", { themeUrl: url });
        })
        .catch(function () {});
    } catch (e) {}
  }

  sendTheme();
  window.addEventListener("message", function (event) {
    if (event.source === window && event.data?.source === "Omni-Universal-Lord" && event.data.type === "OMNI_INJECTOR_READY") {
      sendTheme();
    }
    // Sync page state back to chrome.storage.sync so the popup stays in sync
    if (event.source === window && event.data?.source === "Omni-Universal-Lord" && event.data.type === "OMNI_STATE_SYNC") {
      try { chrome.storage.sync.set(event.data.state, function () {}); } catch (e) {}
    }
  });

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'omni-settings') {
      postToPage("OMNI_CONFIG", { config: msg.settings });
      sendResponse({ ok: true });
    }
    if (msg.type === 'omni-ping') {
      postToPage("OMNI_PING", {});
      sendResponse({ ok: true });
    }
    if (msg.type === 'omni-player') {
      var handled = false;
      var handler = function (event) {
        if (event.source === window && event.data?.source === "Omni-Universal-Lord" && event.data.type === "OMNI_PLAYER_STATE") {
          if (handled) return;
          handled = true;
          window.removeEventListener("message", handler);
          sendResponse({ playerState: event.data.state });
        }
      };
      window.addEventListener("message", handler);
      postToPage("OMNI_PLAYER_REQUEST", {
        action: msg.action,
        id: msg.id,
        value: msg.value,
        item: msg.item,
        data: msg.data
      });
      setTimeout(function () {
        if (handled) return;
        handled = true;
        window.removeEventListener("message", handler);
        sendResponse({ playerState: null });
      }, 4000);
      return true;
    }
    return true;
  });
})();
