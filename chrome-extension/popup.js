/**
 * Popup：開關「在每個網頁顯示」、開啟完整版連結
 */

const STORAGE_KEY = 'widgetVisible';
const EMBED_URL = typeof SOOTY_EMBED_URL !== 'undefined' ? SOOTY_EMBED_URL : 'http://localhost:3000/embed';
const FULL_URL = EMBED_URL.replace(/\/embed\/?$/, '') || 'http://localhost:3000';

const toggleEl = document.getElementById('toggle');
const openFullEl = document.getElementById('openFull');

openFullEl.href = FULL_URL;

chrome.storage.local.get([STORAGE_KEY], function (result) {
  const on = result[STORAGE_KEY] !== false;
  toggleEl.classList.toggle('on', on);
  toggleEl.setAttribute('aria-pressed', on ? 'true' : 'false');
});

toggleEl.addEventListener('click', function () {
  const isOn = toggleEl.classList.toggle('on');
  toggleEl.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  chrome.storage.local.set({ [STORAGE_KEY]: isOn }, function () {
    // 通知已開啟的分頁更新（content script 會聽 storage.onChanged）
  });
});
