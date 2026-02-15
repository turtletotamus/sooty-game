# 陪伴模式除錯清單：表情不同步 & 按 Widget 不消失

下面是可以逐項檢查的「可能錯的原因」與驗證方式。請依序試，看卡在哪一關。

---

## 一、表情／狀態不同步（主視窗傷心、陪伴卻普通）

### 假設 A：主視窗與陪伴用的 sootyId 不一樣

- **結果**：兩邊讀寫的 localStorage key 不同（`sooty-game-state-{id}`），永遠不會同步。
- **怎麼驗證**：
  1. 開主視窗（擴充 popup 或主站分頁），看網址列或 iframe 的 src，記下 `sootyId=???`。
  2. 開有陪伴的那一頁，在陪伴的 iframe 上按右鍵 → 檢查 → 看 iframe 的 `src`，記下 `sootyId=???`。
  3. 若兩個 sootyId 不同 → 就是這個問題；要讓擴充在開主視窗與開陪伴時都用**同一個** sootyId（例如都從 chrome.storage 讀）。

### 假設 B：BroadcastChannel 沒送到陪伴

- **結果**：主視窗有送「請重讀」，但陪伴沒收到，所以只靠 storage 事件或輪詢；若 storage 事件也沒送達，就不會更新。
- **怎麼驗證**：
  1. 在陪伴頁面：開 DevTools → 選「陪伴那個 iframe」的 context（Console 左上角選 iframe）。
  2. 打 `new BroadcastChannel('sooty-state-sync').addEventListener('message', e => console.log('BC:', e.data))`。
  3. 回主視窗做會寫入的動作（例如餵食、或改測試數值）。
  4. 若 Console 完全沒出現 `BC: ...` → 主視窗那邊沒送、或送錯 channel、或陪伴收不到（例如不同 origin）。

### 假設 C：陪伴有收到，但 stateKey 對不上

- **結果**：BroadcastChannel 有收到訊息，但 `e.data.stateKey` 和陪伴自己的 `stateKey` 不同，所以故意不重讀。
- **怎麼驗證**：在 embed 的 BroadcastChannel  listener 裡暫時 `console.log('BC stateKey', e.data?.stateKey, 'my stateKey', stateKey)`，看兩者是否一致。

### 假設 D：陪伴 iframe 的 origin 和主視窗不同

- **結果**：localStorage、BroadcastChannel、storage 事件都無法跨 origin，自然不同步。
- **怎麼驗證**：主視窗與陪伴 iframe 的網址是否同屬 `https://sooty-game.vercel.app`（或你實際部署的網域）。若主視窗是 `chrome-extension://...` 裡的 iframe 載 sooty-game，iframe 的 origin 仍是 sooty-game，理論上同源。

---

## 二、按 Widget 關閉後，陪伴沒有消失

### 假設 1：popup 沒收到 CLOSE_COMPANION

- **結果**：不會執行「廣播 hideCompanion + 寫 storage」，所以陪伴不會關。
- **怎麼驗證**：
  1. 按關閉時，看 popup 裡「陪伴模式」按鈕有沒有從橘色變回一般（關閉狀態）。若**有**變 → popup 有收到並送了 `COMPANION_STATE` 給 iframe，問題多半在後面的「content script 沒收訊息」。
  2. 若**沒**變 → 可能是 iframe 沒對 parent 送 `postMessage`，或 popup 的 listener 沒裝好。可在 popup 的 script 裡暫時加 `window.addEventListener('message', e => console.log('popup got', e.data))`，再按關閉，看有沒有印出 `type: 'CLOSE_COMPANION'`。
- **注意**：只有「在擴充 popup 裡的那個主視窗」的按鈕會送 CLOSE_COMPANION。若你是從主站分頁（整頁 sooty-game）關閉，目前沒有送 CLOSE_COMPANION，所以不會關陪伴是預期。

### 假設 2：有陪伴的那個分頁，content script 沒在跑

- **結果**：`sendMessage('hideCompanion')` 和 `storage.onChanged` 都沒人收，陪伴不會消失。
- **怎麼驗證**：
  1. 切到**有陪伴的那一個分頁**（右下角有小黑炭的那頁）。
  2. F12 開 DevTools → 到 Console，選的是**該網頁的 top frame**（不是 iframe）。
  3. 打 `chrome.runtime.sendMessage('hideCompanion')` 或隨便送一個我們會處理的訊息。若出現「Could not establish connection. Receiving end does not exist」→ 表示這個分頁沒有我們的 content script。
  4. 或在 Sources 裡看有沒有我們的 content script（例如 `content.js`）。若沒有 → 該頁沒注入成功（CSP、權限、或擴充重載後沒重整該頁）。

### 假設 3：有收到 hideCompanion，但找不到 DOM 節點

- **結果**：`getElementById(CONTAINER_ID)` 回 null，沒東西可藏。
- **怎麼驗證**：在**有陪伴的那一頁**的 Console（top frame）打 `document.getElementById('sooty-extension-root')`。若回 `null` → 容器不在這頁或 ID 不對；若回一個元素 → 容器在，問題應在「沒收到 hideCompanion」或「hideCompanion 沒被呼叫」。

### 假設 4：陪伴其實在別的分頁

- **結果**：我們有對「所有分頁」送 hideCompanion，但若你看到的小黑炭其實是別的分頁或別的視窗，你可能在看沒收到訊息的那一頁。
- **怎麼驗證**：確認「你正在看的那一個分頁」的網址，就是當初打開陪伴時的那一頁（例如同一個 google.com 分頁）。再試一次：只開這一個分頁 + popup，開陪伴後再關，看是否消失。

---

## 三、建議的下一步（一起抓錯）

1. **先確認 sootyId 一致**：用「假設 A」的方式比對主視窗與陪伴 iframe 的 sootyId。若不一致，就要改擴充／主站，讓兩邊用同一個 id。
2. **再確認關閉流程**：用「假設 1」看按鈕會不會變、必要時在 popup 加 log；用「假設 2、3」在有陪伴的那一頁確認 content script 存在、且 `#sooty-extension-root` 存在。
3. **若 sootyId 一致但表情仍不同步**：用「假設 B、C」在陪伴 iframe 的 Console 收 BroadcastChannel，看有沒有收到、stateKey 是否一致。

你可以回報：
- 主視窗的 sootyId 從哪來（網址長怎樣）、陪伴 iframe 的 src 長怎樣；
- 按關閉時按鈕有沒有變、以及「有陪伴的那一頁」Console 打 `document.getElementById('sooty-extension-root')` 的結果；

這樣可以縮小範圍，再決定要改哪一段程式（例如：統一 sootyId 來源、或改由 content script 在頁面上聽 postMessage 關閉）。
