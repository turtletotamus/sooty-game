/**
 * 陪伴模式：在「一般網頁」右下角固定顯示同一隻小黑炭（embed），不超出螢幕。
 * 僅在「平常瀏覽的網頁」（如 Google、一般網站）顯示；若目前就在小黑炭主站／embed 頁面，則不顯示，避免出現在「小黑炭視窗的右下角」。
 */
(function () {
  const SOOTY_ID_KEY = 'sootyId';
  const COMPANION_VISIBLE_KEY = 'sootyCompanionVisible';
  const SOOTY_APPEARANCE_KEY = 'sootyAppearance';
  const CONTAINER_ID = 'sooty-extension-root';
  const EMBED_URL = typeof SOOTY_EMBED_URL !== 'undefined' ? SOOTY_EMBED_URL : 'https://sooty-game.vercel.app/embed';

  function isSootyPage() {
    try {
      var embedOrigin = new URL(EMBED_URL).origin;
      return window.location.origin === embedOrigin;
    } catch (e) {
      return false;
    }
  }

  function getContainer() {
    return document.getElementById(CONTAINER_ID);
  }

  function ensureSootyId(cb) {
    chrome.storage.local.get([SOOTY_ID_KEY], function (result) {
      var id = result[SOOTY_ID_KEY];
      if (!id) {
        id = 'sooty-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
        chrome.storage.local.set({ [SOOTY_ID_KEY]: id }, function () { cb(id); });
      } else {
        cb(id);
      }
    });
  }

  function buildEmbedUrl(sootyId, appearance) {
    var url = new URL(EMBED_URL);
    url.searchParams.set('sootyId', sootyId);
    url.searchParams.set('maxSize', '0.8');
    if (appearance && appearance.shape) url.searchParams.set('shape', appearance.shape);
    if (appearance && appearance.color) url.searchParams.set('color', appearance.color);
    return url.toString();
  }

  function createWidget() {
    if (getContainer()) return;

    var wrap = document.createElement('div');
    wrap.id = CONTAINER_ID;

    var style = document.createElement('style');
    style.textContent = [
      '#${CONTAINER_ID} {',
      '  position: fixed !important;',
      '  bottom: 16px !important;',
      '  right: 16px !important;',
      '  width: 200px !important;',
      '  height: 240px !important;',
      '  max-width: calc(100vw - 32px) !important;',
      '  max-height: calc(100vh - 32px) !important;',
      '  z-index: 2147483646 !important;',
      '  background: transparent !important;',
      '  box-shadow: none !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  overflow: visible !important;',
      '  font-family: system-ui, sans-serif !important;',
      '  pointer-events: none !important;',
      '}',
      '#${CONTAINER_ID} iframe {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '  border: none !important;',
      '  display: block !important;',
      '  pointer-events: auto !important;',
      '  background: transparent !important;',
      '}'
    ].join('').replace(/\$\{CONTAINER_ID\}/g, CONTAINER_ID);
    document.head.appendChild(style);

    var iframe = document.createElement('iframe');
    iframe.title = 'Sooty';

    wrap.appendChild(iframe);
    document.body.appendChild(wrap);

    chrome.storage.local.get([SOOTY_ID_KEY, SOOTY_APPEARANCE_KEY], function (r) {
      var sootyId = r[SOOTY_ID_KEY];
      if (!sootyId) {
        ensureSootyId(function (id) {
          chrome.storage.local.get([SOOTY_APPEARANCE_KEY], function (r2) {
            iframe.src = buildEmbedUrl(id, r2[SOOTY_APPEARANCE_KEY]);
          });
        });
      } else {
        iframe.src = buildEmbedUrl(sootyId, r[SOOTY_APPEARANCE_KEY]);
      }
    });
  }

  function showCompanion() {
    // 使用者主動按「陪伴模式」時一律顯示；僅在「新分頁自動載入」時跳過主站頁面（見 tryShowCompanionIfOn）
    var el = getContainer();
    if (el) {
      el.style.display = 'block';
      var ifr = el.querySelector('iframe');
      if (ifr) {
        chrome.storage.local.get([SOOTY_ID_KEY, SOOTY_APPEARANCE_KEY], function (r) {
          if (r[SOOTY_ID_KEY]) ifr.src = buildEmbedUrl(r[SOOTY_ID_KEY], r[SOOTY_APPEARANCE_KEY]);
        });
      }
    } else {
      createWidget();
    }
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: true });
  }

  function hideCompanion() {
    var el = getContainer();
    if (el) el.style.display = 'none';
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: false });
  }

  function refreshCompanionAppearance() {
    var el = getContainer();
    if (!el || el.style.display === 'none') return;
    var ifr = el.querySelector('iframe');
    if (ifr) {
      chrome.storage.local.get([SOOTY_ID_KEY, SOOTY_APPEARANCE_KEY], function (r) {
        if (r[SOOTY_ID_KEY]) ifr.src = buildEmbedUrl(r[SOOTY_ID_KEY], r[SOOTY_APPEARANCE_KEY]);
      });
    }
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg === 'showCompanion') showCompanion();
    if (msg === 'hideCompanion') hideCompanion();
    if (msg === 'refreshCompanionAppearance') refreshCompanionAppearance();
  });

  // 需求 2：若已在其他分頁開啟陪伴模式，新分頁載入時自動顯示同一隻小黑炭（主站頁面不自動顯示，避免重疊）
  function tryShowCompanionIfOn() {
    if (isSootyPage()) return;
    chrome.storage.local.get([COMPANION_VISIBLE_KEY], function (r) {
      if (r[COMPANION_VISIBLE_KEY]) showCompanion();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryShowCompanionIfOn);
  } else {
    tryShowCompanionIfOn();
  }
})();
