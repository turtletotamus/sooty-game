# 將 Sooty 上架到 Chrome 線上應用程式商店

可以。照下面步驟就能把擴充功能上傳到 Google Chrome 並公開發布。

---

## 一、前置準備

### 1. 主站必須已上線

擴充功能會用 iframe 載入你的主站 **`/embed`** 頁面，所以：

- 先把 Sooty 主站部署到一個**公開網址**（例如 Vercel、Netlify）。
- 例如：`https://你的網址.vercel.app`

### 2. 設定擴充功能的主站網址

上架前請把 **`config.js`** 裡的網址改成你的**正式主站**，不要用 localhost：

```js
var SOOTY_EMBED_URL = 'https://你的正式網址/embed';
```

例如：`https://sooty.vercel.app/embed`

### 3. 擴充功能圖示（必要）

Chrome 商店規定要有圖示。請在 **`chrome-extension`** 資料夾裡放這三個 PNG：

| 檔案名 | 尺寸 | 說明 |
|--------|------|------|
| `icon16.png` | 16×16 | 工具列小圖 |
| `icon48.png` | 48×48 | 擴充功能管理頁 |
| `icon128.png` | 128×128 | 商店陳列用（必備） |

若你只有一張圖，可用 [favicon.io](https://favicon.io/) 或類似工具從 `app/favicon.ico` 產生 16 / 48 / 128 的 PNG，再改名放進 `chrome-extension`。

---

## 二、註冊開發者帳號（一次性費用）

1. 開啟 [Chrome 線上應用程式商店開發者主控台](https://chrome.google.com/webstore/devconsole)。
2. 用 Google 帳號登入。
3. 同意條款並支付 **一次性註冊費 5 美元**，即可成為開發者。

---

## 三、打包擴充功能

1. 確認 `config.js` 已改成正式主站網址。
2. 確認 `chrome-extension` 裡有 `icon16.png`、`icon48.png`、`icon128.png`。
3. 打包成 **ZIP**：
   - 選取 **`chrome-extension` 資料夾「裡面的」所有檔案**（`manifest.json`、`config.js`、`content.js`、圖示等）。
   - 壓縮時要讓 **ZIP 解壓後直接看到 `manifest.json`**，不要出現一層 `chrome-extension` 資料夾。

   **正確**：ZIP 內容為  
   `manifest.json`, `config.js`, `content.js`, `popup.html`, `popup.js`, `content.css`, `icon16.png`, `icon48.png`, `icon128.png` …

   **錯誤**：ZIP 內容為  
   `chrome-extension/manifest.json` …

---

## 四、上傳與填寫商店資訊

1. 在 [開發者主控台](https://chrome.google.com/webstore/devconsole) 點 **「新增項目」**。
2. 上傳剛才的 **ZIP 檔**。
3. 填寫 **商店資訊**（可之後再改）：
   - **簡短說明**：一句話介紹（例如：在每個網頁右下角陪伴你的小黑炭）。
   - **詳細說明**：可貼 README 的「功能說明」或自己寫。
   - **類別**：例如「社交與通訊」或「娛樂」。
   - **語言**：選「中文（台灣）」等。
4. **隱私權**：若擴充功能只有用 `storage` 存使用者設定、沒有把資料傳到你的後端，可在說明裡寫「本擴充功能僅在瀏覽器本地儲存設定，不收集或上傳個人資料。」  
   若商店要求提供**隱私權政策網址**，可在主站加一頁 `/privacy` 說明，再把該網址填上去。
5. 上傳 **至少一張** 商店用截圖或宣傳圖（1280×800 或 640×400）。
6. 儲存後點 **「提交審查」**。

---

## 五、審查與發布

- Google 審查通常需要 **數小時到幾天**。
- 審查通過後可選擇 **「公開」** 或 **「非公開」（只給有連結的人安裝）**。
- 之後若要更新：改程式 → 在 `manifest.json` 把 `version` 數字加大（例如 `1.0.0` → `1.0.1`）→ 重新打包 ZIP → 到開發者主控台該項目選「上傳新版本」。

---

## 快速檢查清單

- [ ] 主站已部署，且 `/embed` 可正常開啟
- [ ] `config.js` 的 `SOOTY_EMBED_URL` 已改為正式主站 `/embed` 網址
- [ ] `chrome-extension` 內有 `icon16.png`、`icon48.png`、`icon128.png`
- [ ] 已註冊 Chrome 開發者帳號（付過 5 美元）
- [ ] 打包 ZIP 時，解壓後根目錄就是 `manifest.json` 等檔案
- [ ] 商店資訊、隱私說明、截圖都已填好再提交審查

完成以上步驟後，就可以在 Chrome 線上應用程式商店以擴充功能形式使用 Sooty。
