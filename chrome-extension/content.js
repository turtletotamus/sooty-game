/**
 * Content script: 在所有網頁右下角注入小黑炭 iframe（當「在每個網頁顯示」為開啟時）
 */

(function () {
  const STORAGE_KEY = 'widgetVisible';
  const CONTAINER_ID = 'sooty-extension-root';
  const EMBED_URL = typeof SOOTY_EMBED_URL !== 'undefined' ? SOOTY_EMBED_URL : 'http://localhost:3000/embed';

  function getContainer() {
    return document.getElementById(CONTAINER_ID);
  }

  function createWidget() {
    if (getContainer()) return;

    const wrap = document.createElement('div');
    wrap.id = CONTAINER_ID;

    const style = document.createElement('style');
    style.textContent = `
      #${CONTAINER_ID} {
        position: fixed !important;
        bottom: 0 !important;
        right: 0 !important;
        width: 320px !important;
        height: 420px !important;
        z-index: 2147483646 !important;
        border: none !important;
        box-shadow: 0 0 24px rgba(0,0,0,0.15) !important;
        border-radius: 12px 0 0 0 !important;
        overflow: hidden !important;
        font-family: system-ui, sans-serif !important;
      }
      #${CONTAINER_ID} iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        display: block !important;
      }
      #${CONTAINER_ID} .sooty-hide {
        position: absolute !important;
        top: 4px !important;
        right: 4px !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 50% !important;
        border: none !important;
        background: rgba(0,0,0,0.5) !important;
        color: #fff !important;
        cursor: pointer !important;
        font-size: 14px !important;
        line-height: 1 !important;
        z-index: 10 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #${CONTAINER_ID} .sooty-hide:hover {
        background: rgba(0,0,0,0.7) !important;
      }
    `;
    document.head.appendChild(style);

    const iframe = document.createElement('iframe');
    iframe.src = EMBED_URL;
    iframe.title = 'Sooty';

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'sooty-hide';
    hideBtn.innerHTML = '×';
    hideBtn.title = '暫時隱藏（可從擴充功能圖示再打開）';
    hideBtn.addEventListener('click', function () {
      chrome.storage.local.set({ [STORAGE_KEY]: false }, function () {
        setVisible(false);
      });
    });

    wrap.appendChild(iframe);
    wrap.appendChild(hideBtn);
    document.body.appendChild(wrap);
  }

  function setVisible(visible) {
    const el = getContainer();
    if (!el) return;
    el.style.display = visible ? 'block' : 'none';
  }

  function init() {
    chrome.storage.local.get([STORAGE_KEY], function (result) {
      const visible = result[STORAGE_KEY] !== false; // 預設顯示
      if (visible) {
        createWidget();
        setVisible(true);
      }
    });
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
    const visible = changes[STORAGE_KEY].newValue !== false;
    if (visible) {
      createWidget();
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
