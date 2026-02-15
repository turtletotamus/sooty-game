/**
 * Popup = 小黑炭視窗本體（主站 iframe）+ 聆聽 iframe 發出的「陪伴模式」開/關
 */
const EMBED_URL = typeof SOOTY_EMBED_URL !== 'undefined' ? SOOTY_EMBED_URL : 'http://localhost:3000/embed';
const FULL_URL = EMBED_URL.replace(/\/embed\/?$/, '') || 'http://localhost:3000';
const COMPANION_VISIBLE_KEY = 'sootyCompanionVisible';
const SOOTY_APPEARANCE_KEY = 'sootyAppearance';
var sootyFrame = document.getElementById('sooty-frame');

function setFrameSrc(sootyId, companionVisible) {
  var url = FULL_URL + '?sootyId=' + encodeURIComponent(sootyId);
  if (companionVisible) url += '&companionVisible=1';
  sootyFrame.src = url;
}

chrome.storage.local.get(['sootyId', COMPANION_VISIBLE_KEY], function (r) {
  var id = r.sootyId;
  var companionVisible = !!r[COMPANION_VISIBLE_KEY];
  if (!id) {
    id = 'sooty-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    chrome.storage.local.set({ sootyId: id }, function () {
      setFrameSrc(id, companionVisible);
    });
  } else {
    setFrameSrc(id, companionVisible);
  }
});

// 取得「使用者正在看的那個分頁」（按陪伴模式時要讓小黑炭出現在該分頁）
// 彈出 popup 時 currentWindow 可能是 popup 本身，故改為取所有視窗的 active tab，再選 normal 視窗的那一個
function getActiveBrowserTab(cb) {
  chrome.tabs.query({ active: true }, function (tabs) {
    if (!tabs.length) return cb(null);
    var normalTab = tabs.filter(function (t) { return t.id != null && t.url && !t.url.startsWith('chrome://'); })[0];
    cb(normalTab || tabs[0]);
  });
}

window.addEventListener('message', function (e) {
  if (!e.data || !e.data.type) return;
  if (e.data.type === 'OPEN_COMPANION') {
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: true }, function () {
      try { sootyFrame.contentWindow.postMessage({ type: 'COMPANION_STATE', visible: true }, '*'); } catch (_) {}
      getActiveBrowserTab(function (tab) {
        if (!tab) return;
        function showCompanionOnly() {
          chrome.tabs.sendMessage(tab.id, 'showCompanion').catch(function () {});
        }
        if (chrome.scripting && typeof chrome.scripting.executeScript === 'function') {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['config.js', 'content.js'] }).catch(function () {}).then(function () {
            setTimeout(showCompanionOnly, 150);
          });
        } else {
          setTimeout(showCompanionOnly, 80);
        }
      });
    });
  }
  if (e.data.type === 'CLOSE_COMPANION') {
    if (typeof console !== 'undefined') console.log('[Sooty 測試] popup 已送出關閉陪伴指令（這是「擴充彈出視窗」的 Console；若要看 content script 的 log，請開「有陪伴的那個網頁分頁」的 F12）');
    function sendHideToAllTabs() {
      chrome.tabs.query({}, function (tabs) {
        tabs.forEach(function (t) {
          if (t.id && t.url && t.url.indexOf('chrome://') !== 0) {
            chrome.tabs.sendMessage(t.id, 'hideCompanion').catch(function () {});
          }
        });
      });
    }
    sendHideToAllTabs();
    setTimeout(sendHideToAllTabs, 150);
    chrome.storage.local.set({ [COMPANION_VISIBLE_KEY]: false }, function () {
      try { sootyFrame.contentWindow.postMessage({ type: 'COMPANION_STATE', visible: false }, '*'); } catch (_) {}
    });
  }
  if (e.data.type === 'SOOTY_APPEARANCE' && e.data.appearance) {
    var app = e.data.appearance;
    if (app.shape && app.color) {
      chrome.storage.local.set({ [SOOTY_APPEARANCE_KEY]: { shape: app.shape, color: app.color } }, function () {
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(function (t) {
            if (t.id && t.url && t.url.indexOf('chrome://') !== 0) {
              chrome.tabs.sendMessage(t.id, 'refreshCompanionAppearance').catch(function () {});
            }
          });
        });
      });
    }
  }
});
