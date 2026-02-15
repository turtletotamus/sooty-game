# 陪伴模式：狀態同步與關閉邏輯說明

## 目前實作方式

### 1. 狀態／情緒同步（主視窗 ↔ 陪伴）

- **儲存位置**：主視窗與陪伴共用同一個 localStorage key：`sooty-game-state-${sootyId}`。
- **主視窗**：在 `useEffect` 裡依 `petState`、`lastInteractionTime` 等呼叫 `saveState(stateKey, ...)` 寫入。
- **陪伴 (embed)**：
  - **storage 事件**：監聽 `window.addEventListener('storage')`，當 `e.key === stateKey` 時用 `loadState(stateKey)` 重讀並 `setState(loaded)`。
  - **輪詢**：每 500ms 唯讀 `loadState(stateKey)`，若與目前 state 不同就 `setState(loaded)`，**不寫回** localStorage，避免蓋掉主視窗剛寫入的內容。

**可能不同步的原因：**

- **storage 事件**在部分情境下不會送到陪伴 iframe（例如：主視窗在 extension popup 的 iframe、陪伴在另一分頁的 iframe，有些瀏覽器對跨「視窗」的 storage 事件不穩定）。
- **sootyId 不一致**：主視窗與陪伴若用不同的 sootyId（例如一個從 popup 讀、一個從 URL 讀），就會讀寫不同的 key，永遠不會同步。
- 輪詢 500ms 理論上會追上，若仍不同步，可能是 embed 的 `stateKey` 與主視窗真的不同。

### 2. Widget 關閉（陪伴要馬上消失）

- **流程**：使用者在 popup 裡按「陪伴模式」關閉 → 主視窗 iframe 發 `postMessage(CLOSE_COMPANION)` 給 popup → popup 收到後：
  1. 對**所有分頁**送 `chrome.tabs.sendMessage(tabId, 'hideCompanion')`
  2. 再 `chrome.storage.local.set(sootyCompanionVisible, false)`
- **content script**：在每個分頁監聽 `chrome.runtime.onMessage`，收到 `'hideCompanion'` 就呼叫 `hideCompanion()`（設 `visibility: hidden`、`opacity: 0`、`display: none`）；另有 `chrome.storage.onChanged`，當 `sootyCompanionVisible` 變 false 也會呼叫 `hideCompanion()`。

**可能關不掉的原因：**

- 有陪伴的那個分頁**沒有跑 content script**（例如該頁從未注入成功、或 CSP 阻擋），就收不到 `hideCompanion`，storage 的 `onChanged` 也不會在那頁觸發。
- **popup 沒收到** `CLOSE_COMPANION`（例如 postMessage 的 target 不對、或按鈕不是在 popup 的 iframe 裡按的）。
- 有陪伴的分頁在**擴充功能更新或重載後**尚未重新載入，舊的 content script 可能已卸載，需要使用者手動重整該分頁。

---

## 後續調整可行性

1. **狀態同步**：已加上 **BroadcastChannel**（同 origin 跨分頁／iframe 都會收到），主視窗每次寫入後多送一則「請重讀 state」的訊息，陪伴一收到就 `loadState` + `setState`，不依賴 storage 事件，較穩定。
2. **Widget 關閉**：已改為「先廣播 hideCompanion 再寫 storage」；若仍關不掉，需要確認：
   - 有陪伴的那一頁是否真的在跑我們的 content script（可在那頁開 DevTools 看是否有我們的 script）。
   - 是否一律從 **popup** 按「陪伴模式」關閉；若未來改為在別處也能關，就需要在該處也送 `hideCompanion` 或寫 storage 的流程。
