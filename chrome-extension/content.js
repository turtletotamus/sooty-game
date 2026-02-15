/**
 * 陪伴模式：在「一般網頁」右下角固定顯示同一隻小黑炭（embed），不超出螢幕。
 * 僅在「平常瀏覽的網頁」（如 Google、一般網站）顯示；若目前就在小黑炭主站／embed 頁面，則不顯示，避免出現在「小黑炭視窗的右下角」。
 */
(function () {
  const SOOTY_ID_KEY = 'sootyId';
  const COMPANION_VISIBLE_KEY = 'sootyCompanionVisible';
  const COMPANION_POSITION_KEY = 'sootyCompanionPosition';
  const SOOTY_APPEARANCE_KEY = 'sootyAppearance';
  const CONTAINER_ID = 'sooty-extension-root';
  const HANDLE_ID = 'sooty-extension-drag-handle';
  const CSP_LOAD_TIMEOUT_MS = 2500;
  const DEFAULT_WIDTH = 160;
  const DEFAULT_HEIGHT = 200;
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

  function getHandle() {
    return document.getElementById(HANDLE_ID);
  }

  function syncHandlePosition() {
    var wrap = getContainer();
    var handle = getHandle();
    if (!wrap || !handle) return;
    var r = wrap.getBoundingClientRect();
    handle.style.left = (r.left + r.width / 2) + 'px';
    handle.style.top = (r.top + r.height / 2) + 'px';
    handle.style.right = 'auto';
    handle.style.bottom = 'auto';
    handle.style.marginLeft = '-48px';
    handle.style.marginTop = '-48px';
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

  function applyPosition(wrap, pos) {
    if (!wrap) return;
    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      wrap.style.left = pos.left + 'px';
      wrap.style.top = pos.top + 'px';
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
    } else {
      wrap.style.left = 'auto';
      wrap.style.top = 'auto';
      wrap.style.right = '16px';
      wrap.style.bottom = '16px';
    }
  }

  function clampPosition(left, top, width, height) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    return {
      left: Math.max(0, Math.min(left, w - width)),
      top: Math.max(0, Math.min(top, h - height))
    };
  }

  function setIframeSrcAndDetectCsp(wrap, iframeEl, url) {
    if (wrap._sootyCspTimeout) {
      clearTimeout(wrap._sootyCspTimeout);
      wrap._sootyCspTimeout = null;
    }
    function onLoaded() {
      if (wrap._sootyCspTimeout) clearTimeout(wrap._sootyCspTimeout);
      wrap._sootyCspTimeout = null;
      wrap.classList.remove('sooty-csp-blocked');
      var msg = wrap.querySelector('.sooty-csp-msg');
      if (msg) msg.remove();
      iframeEl.style.display = '';
      var h = getHandle();
      if (h) h.style.display = '';
    }
    function onBlocked() {
      wrap.classList.add('sooty-csp-blocked');
      iframeEl.style.display = 'none';
      var h = getHandle();
      if (h) h.style.display = 'none';
      var msg = wrap.querySelector('.sooty-csp-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'sooty-csp-msg';
        msg.textContent = typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage ? chrome.i18n.getMessage('companionUnavailable') : 'Sooty can\'t be used on this page.';
        wrap.appendChild(msg);
      }
    }
    iframeEl.addEventListener('load', onLoaded, { once: true });
    wrap._sootyCspTimeout = setTimeout(function () {
      wrap._sootyCspTimeout = null;
      onBlocked();
    }, CSP_LOAD_TIMEOUT_MS);
    iframeEl.src = url;
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
      '  width: ' + DEFAULT_WIDTH + 'px !important;',
      '  height: ' + DEFAULT_HEIGHT + 'px !important;',
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
      '  display: flex !important;',
      '  align-items: center !important;',
      '  justify-content: center !important;',
      '}',
      '#${CONTAINER_ID} .sooty-companion-iframe-wrap {',
      '  position: absolute !important;',
      '  inset: 0 !important;',
      '  pointer-events: none !important;',
      '}',
      '#${CONTAINER_ID} iframe {',
      '  width: 100% !important;',
      '  height: 100% !important;',
      '  border: none !important;',
      '  display: block !important;',
      '  pointer-events: none !important;',
      '  background: transparent !important;',
      '}',
      '#' + HANDLE_ID + ' {',
      '  position: fixed !important;',
      '  width: 96px !important;',
      '  height: 96px !important;',
      '  border-radius: 50% !important;',
      '  cursor: move !important;',
      '  pointer-events: auto !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '  outline: none !important;',
      '  z-index: 2147483647 !important;',
      '  box-sizing: border-box !important;',
      '}',
      '#' + HANDLE_ID + '::after {',
      '  display: none !important;',
      '}',
      '#${CONTAINER_ID}.sooty-csp-blocked {',
      '  width: auto !important;',
      '  height: auto !important;',
      '  max-width: 260px !important;',
      '}',
      '#${CONTAINER_ID}.sooty-csp-blocked .sooty-companion-iframe-wrap {',
      '  position: static !important;',
      '}',
      '#${CONTAINER_ID}.sooty-csp-blocked .sooty-csp-msg {',
      '  padding: 6px 10px;',
      '  font-size: 11px;',
      '  color: #555;',
      '  background: rgba(0,0,0,0.06);',
      '  border-radius: 6px;',
      '  pointer-events: auto !important;',
      '  max-width: 140px;',
      '  line-height: 1.3;',
      '}'
    ].join('').replace(/\$\{CONTAINER_ID\}/g, CONTAINER_ID);
    document.head.appendChild(style);

    var iframeWrap = document.createElement('div');
    iframeWrap.className = 'sooty-companion-iframe-wrap';
    var iframe = document.createElement('iframe');
    iframe.title = 'Sooty';
    iframeWrap.appendChild(iframe);

    var handle = document.createElement('div');
    handle.id = HANDLE_ID;
    handle.className = 'sooty-companion-drag-handle';
    handle.title = '拖曳可移動';
    handle.setAttribute('aria-label', '拖曳可移動陪伴小黑炭');

    wrap.appendChild(iframeWrap);
    document.body.appendChild(wrap);
    document.body.appendChild(handle);

    (function setupDrag() {
      var dragging = false;
      var startX = 0, startY = 0, startLeft = 0, startTop = 0;

      function getRect() {
        var w = wrap.offsetWidth || DEFAULT_WIDTH;
        var h = wrap.offsetHeight || DEFAULT_HEIGHT;
        return { w: w, h: h };
      }

      handle.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        var rect = wrap.getBoundingClientRect();
        startLeft = rect.left + window.scrollX;
        startTop = rect.top + window.scrollY;
      });

      window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        e.preventDefault();
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var r = getRect();
        var next = clampPosition(startLeft + dx, startTop + dy, r.w, r.h);
        wrap.style.left = next.left + 'px';
        wrap.style.top = next.top + 'px';
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
        syncHandlePosition();
      });

      window.addEventListener('mouseup', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var moveDist = Math.sqrt(dx * dx + dy * dy);
        dragging = false;
        var rect = wrap.getBoundingClientRect();
        chrome.storage.local.set({ [COMPANION_POSITION_KEY]: { left: rect.left, top: rect.top } });
        syncHandlePosition();
        if (moveDist < 8) {
          try {
            var ifr = wrap.querySelector('iframe');
            if (ifr && ifr.contentWindow) {
              var origin = new URL(EMBED_URL).origin;
              ifr.contentWindow.postMessage({ type: 'COMPANION_TAP' }, origin);
            }
          } catch (_) {}
        }
      });
    })();

    chrome.storage.local.get([COMPANION_POSITION_KEY, SOOTY_ID_KEY, SOOTY_APPEARANCE_KEY], function (r) {
      applyPosition(wrap, r[COMPANION_POSITION_KEY]);
      requestAnimationFrame(function () { syncHandlePosition(); });
      var sootyId = r[SOOTY_ID_KEY];
      if (!sootyId) {
        ensureSootyId(function (id) {
          chrome.storage.local.get([SOOTY_APPEARANCE_KEY], function (r2) {
            setIframeSrcAndDetectCsp(wrap, iframe, buildEmbedUrl(id, r2[SOOTY_APPEARANCE_KEY]));
          });
        });
      } else {
        setIframeSrcAndDetectCsp(wrap, iframe, buildEmbedUrl(sootyId, r[SOOTY_APPEARANCE_KEY]));
      }
    });
  }

  function showCompanion() {
    if (isSootyPage()) return;
    var el = getContainer();
    var handleEl = getHandle();
    if (el) {
      el.style.visibility = '';
      el.style.opacity = '';
      el.style.transition = '';
      el.style.display = 'flex';
      if (handleEl) {
        handleEl.style.visibility = '';
        handleEl.style.opacity = '';
        handleEl.style.transition = '';
        handleEl.style.display = '';
      }
      chrome.storage.local.get([COMPANION_POSITION_KEY], function (r) {
        applyPosition(el, r[COMPANION_POSITION_KEY]);
        requestAnimationFrame(function () { syncHandlePosition(); });
      });
      var ifr = el.querySelector('iframe');
      if (ifr) {
        chrome.storage.local.get([SOOTY_ID_KEY, SOOTY_APPEARANCE_KEY], function (r) {
          if (r[SOOTY_ID_KEY]) setIframeSrcAndDetectCsp(el, ifr, buildEmbedUrl(r[SOOTY_ID_KEY], r[SOOTY_APPEARANCE_KEY]));
        });
      }
    } else {
      createWidget();
    }
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: true });
  }

  function hideCompanion() {
    var el = getContainer();
    var handleEl = getHandle();
    if (el) {
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.style.transition = 'none';
      el.style.display = 'none';
    }
    if (handleEl) {
      handleEl.style.visibility = 'hidden';
      handleEl.style.opacity = '0';
      handleEl.style.transition = 'none';
      handleEl.style.display = 'none';
    }
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: false });
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg === 'showCompanion') showCompanion();
    if (msg === 'hideCompanion') hideCompanion();
  });

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'local' || !changes[COMPANION_VISIBLE_KEY]) return;
    if (changes[COMPANION_VISIBLE_KEY].newValue === true) showCompanion();
    if (changes[COMPANION_VISIBLE_KEY].newValue === false) hideCompanion();
  });

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
