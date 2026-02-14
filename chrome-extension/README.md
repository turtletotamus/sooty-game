# Sooty 瀏覽器擴充功能（Chrome）

讓小黑炭在**任何網頁**的右下角出現，不只在自己的網站上。

---

## 一、功能說明

- **在每個網頁顯示**：開啟後，你逛 Google、YouTube、任何網站時，右下角都會有一個小視窗顯示小黑炭（寵物介面）。
- **開關在擴充功能圖示**：點瀏覽器右上角的 Sooty 圖示，可以開啟/關閉「在每個網頁顯示」。
- **暫時隱藏**：右下角小視窗上有 **×** 按鈕，按下去會暫時隱藏，之後可再從擴充功能圖示打開。
- **開啟完整版**：Popop 裡有「開啟完整版」連結，會在新分頁打開你的 Sooty 主站（標題、餵食說明等完整頁面）。

---

## 二、前置條件

1. **主站要能連線**  
   擴充功能是用 iframe 載入你主站的 `/embed` 頁面，所以：
   - 本機開發：先執行 `npm run dev`，讓 `http://localhost:3000` 可連。
   - 正式使用：把 Sooty 部署到一個網址（例如 Vercel），例如 `https://sooty.vercel.app`。

2. **設定主站網址**  
   只要改 **`config.js`** 裡面的 `SOOTY_EMBED_URL` 就好（content 和 popup 都會用這支）：

   - 本機：`var SOOTY_EMBED_URL = 'http://localhost:3000/embed';`
   - 已部署：`var SOOTY_EMBED_URL = 'https://你的網址/embed';`

---

## 三、安裝擴充功能（Chrome 桌面版）

1. 打開 Chrome，網址列輸入：
   ```
   chrome://extensions/
   ```
2. 右上角開啟 **「開發人員模式」**。
3. 點 **「載入未封裝項目」**。
4. 選你專案裡的 **`chrome-extension`** 資料夾（不要選到上一層）。
5. 載入成功後，工具列會出現 Sooty 的擴充功能圖示。

---

## 四、使用方式

1. **讓小黑炭出現在每個網頁**
   - 點右上角 Sooty 圖示。
   - 把 **「在每個網頁右下角顯示」** 開關打開（預設會是開的）。
   - 隨便開一個網頁（例如 google.com），右下角應會出現小黑炭小視窗。

2. **暫時隱藏**
   - 點小視窗右上角的 **×**，就會在目前瀏覽狀態下隱藏。
   - 想再顯示：再點一次 Sooty 圖示，把開關打開。

3. **開完整版網站**
   - 點 Sooty 圖示，在彈出視窗裡點 **「開啟完整版（主站）」**，會在新分頁打開你的 Sooty 主站。

---

## 五、在另一台電腦上測試（例如女友的電腦）

有兩種常見做法，選一種即可。

### 方式 A：主站先部署到網路上（推薦）

這樣**女友那台電腦不用跑專案**，只要裝擴充功能、網址指到你的主站就好。

1. **你這台**：把 Sooty 主站部署出去（例如 [Vercel](https://vercel.com)：專案連到 GitHub 後在 Vercel 一鍵部署，會得到一個網址如 `https://sooty-xxx.vercel.app`）。
2. **把擴充功能給她**：
   - 把專案裡的 **`chrome-extension`** 整個資料夾複製給她（用 Git clone、壓縮檔、雲端硬碟都可以）。
3. **她那台**：
   - 在 **`config.js`** 裡把 `SOOTY_EMBED_URL` 改成你的**已部署主站網址**，例如：`'https://sooty-xxx.vercel.app/embed'`。
   - 照「三、安裝擴充功能」的步驟：Chrome → `chrome://extensions/` → 開發人員模式 → 載入未封裝項目 → 選她電腦上的 `chrome-extension` 資料夾。
4. 她開任何網頁，右下角就會出現小黑炭（載入的是你部署的主站）。  
   **注意**：主站和擴充功能用的是同一個網址，所以兩邊的存檔（localStorage）是同一份；若她登入的是同一個瀏覽器／同一台電腦，才會是「同一隻」小黑炭。

### 方式 B：她那台電腦自己跑主站（本機測試）

適合她想**完全在自己電腦上**玩、不依賴你的網路或伺服器。

1. **她那台**：
   - 取得專案（Git clone 或你壓縮整個專案給她）。
   - 在專案根目錄執行：`npm install`、`npm run dev`。
   - 瀏覽器開 `http://localhost:3000`，確認主站有出來。
2. **擴充功能**：
   - 在 **`config.js`** 裡，`SOOTY_EMBED_URL` 設成 `'http://localhost:3000/embed'`。
   - Chrome → `chrome://extensions/` → 載入未封裝項目 → 選專案裡的 **`chrome-extension`** 資料夾。
3. 之後她只要先在自己電腦上執行 `npm run dev`，再開 Chrome，擴充功能就會連到她本機的主站。

**小結**：  
- 想**最省事、兩人都用同一個主站**→ 用方式 A（你部署主站，她只裝擴充功能、改 `config.js`）。  
- 想**她完全自己測、不碰你的伺服器**→ 用方式 B（她 clone、跑 dev、擴充功能指 localhost）。

---

## 六、你跟她都要改東西、版本想分開（建議做法）

兩人各自改程式、各自部署、各自用擴充功能，互不蓋版。

### 1. 程式版本分開（Git）

- **同一個 repo、用分支**  
  - 你：`main`（或你的分支）  
  - 她：自己開一個分支（例如 `girlfriend` 或她的名字）  
  - 她 clone 同一個 repo 後：`git checkout -b girlfriend`，之後都在自己分支改。  
- **或她 fork**  
  - 她到 GitHub 按 Fork，自己有一份 repo，愛怎麼改就怎麼改，你這邊不影響。

### 2. 部署分開（每人一個網址）

- **你**：從你的分支部署到一個網址（例如 Vercel 專案「sooty」→ `https://sooty.vercel.app`）。  
- **她**：從她的分支／fork 部署到**另一個**網址（例如 Vercel 專案「sooty-gf」→ `https://sooty-gf.vercel.app`）。  
- 這樣你跟她就是兩個不同的「主站」，互不影響。

### 3. 擴充功能只改一處：`config.js`

- 專案裡擴充功能的網址**只改 `chrome-extension/config.js`** 的 `SOOTY_EMBED_URL`。  
- **你這台**：`config.js` 填你的主站，例如  
  `var SOOTY_EMBED_URL = 'https://sooty.vercel.app/embed';`  
- **她那台**：她 clone／fork 後，`config.js` 填她的主站，例如  
  `var SOOTY_EMBED_URL = 'https://sooty-gf.vercel.app/embed';`  
- 兩人各自在 Chrome 載入自己電腦上的 `chrome-extension` 資料夾，就會連到各自的主站，版本自然分開。

### 流程簡述

| 步驟 | 你 | 她 |
|------|----|----|
| 程式 | 在 `main`（或你的分支）改 | clone 同 repo → 開自己的分支；或 fork 後在她自己的 repo 改 |
| 部署 | 部署到你的網址（例：sooty.vercel.app） | 部署到她的網址（例：sooty-gf.vercel.app） |
| 擴充功能 | `config.js` 填你的網址 → 載入擴充功能 | `config.js` 填她的網址 → 載入擴充功能 |

這樣兩人可以同時改東西、各自測試，版本分開，不會互相蓋掉。

---

## 七、檔案說明（方便你自己改）

| 檔案 | 用途 |
|------|------|
| **`config.js`** | **主站網址**：只改這裡，你跟她可以各自填自己的網址，版本就分開。 |
| `manifest.json` | 擴充功能名稱、權限、content script 注入到所有網頁等設定。 |
| `popup.html` + `popup.js` | 點圖示時彈出的小視窗：開關「在每個網頁顯示」、連結到完整版。 |
| `content.js` | 注入到**每一個網頁**的腳本：在頁面右下角插入一個 iframe，載入主站的 `/embed`。 |

所以：
- **「在任何網址都出現」** = 靠 `content_scripts` + `content.js` 在每個網頁插入 iframe。
- **「只在我們網站出現」** = 只有我們網站有寫 Widget；其他網站沒有，所以要靠擴充功能注入。

---

## 八、手機上能用嗎？（Chrome 手機版 / 其他瀏覽器）

- **Chrome Android**：目前 Chrome 手機版**不支援**自己安裝未封裝的擴充功能，只能從 Chrome 線上應用程式商店安裝。若之後你上架到商店，手機版 Chrome 有支援的話就能用。
- **Kiwi Browser（Android）**：可安裝 Chrome 擴充功能，理論上可以載入同一個 `chrome-extension` 資料夾試用（未實際測試）。
- **Safari（iPhone/iPad）**：要做成 **Safari Web Extension**，格式和 Chrome 不同，需要另外轉換或重寫。

所以目前「在任何網頁右下角都出現」的用法，是**以電腦版 Chrome 擴充功能**為主；手機若要類似體驗，需要 PWA 或獨立 App，而不是擴充功能。

---

## 九、圖示（可選）

想自訂擴充功能圖示的話：

1. 準備三張 PNG：16×16、32×32、48×48，檔名例如 `icon16.png`、`icon32.png`、`icon48.png`，放在 `chrome-extension` 資料夾。
2. 在 `manifest.json` 的 `action` 裡加上：
   ```json
   "default_icon": {
     "16": "icon16.png",
     "32": "icon32.png",
     "48": "icon48.png"
   }
   ```
   以及頂層的 `"icons": { "16": "icon16.png", "32": "icon32.png", "48": "icon48.png" }`。

沒設的話 Chrome 會用預設的拼圖圖示。
