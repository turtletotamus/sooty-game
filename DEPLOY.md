# 部署這個版本（Vercel）

照下面做一次，這個版本就會上線；之後你要分版本、給女友測，再自己搞。

---

## 一、程式先推到 GitHub

1. **在 GitHub 開一個新 repo**（若還沒有）  
   - 到 https://github.com/new  
   - 名稱隨便，例如 `sooty-game`  
   - 不要勾「Add a README」之類（你本地已有專案）  
   - 建立後會看到一個網址，例如 `https://github.com/你的帳號/sooty-game.git`

2. **在本機專案根目錄執行**（把網址換成你的 repo）：

   ```bash
   git add .
   git commit -m "Deploy: Sooty with embed, widget, chrome extension"
   git branch -M main
   git remote add origin https://github.com/你的帳號/sooty-game.git
   git push -u origin main
   ```

   若已經有 `origin`，先 `git remote remove origin` 再 `git remote add origin ...`，或直接改網址後 `git push -u origin main`。

---

## 二、用 Vercel 部署

1. **登入 Vercel**  
   - 到 https://vercel.com ，用 GitHub 登入。

2. **Import 專案**  
   - 點「Add New…」→「Project」  
   - 選你剛推上去的 GitHub repo（例如 `sooty-game`）  
   - Framework 選 **Next.js**（通常會自動偵測）  
   - Root Directory 維持空白  
   - 直接點 **Deploy**

3. **等建置完成**  
   - 完成後會給你一個網址，例如 `https://sooty-game-xxx.vercel.app`  
   - 記下這個網址，下一步會用到。

---

## 三、擴充功能改成連到你的部署網址

部署好之後，擴充功能要指到「線上版」主站，而不是 localhost。

1. 打開 **`chrome-extension/config.js`**
2. 把 `SOOTY_EMBED_URL` 改成你的 Vercel 網址 + `/embed`，例如：

   ```js
   var SOOTY_EMBED_URL = 'https://sooty-game-xxx.vercel.app/embed';
   ```

   （把 `sooty-game-xxx.vercel.app` 換成你實際的網址）

3. 存檔後，到 Chrome 的 `chrome://extensions/`，對 Sooty 擴充功能按 **重新載入**，之後右下角就會連到線上版。

---

## 四、之後你要做的（之後再搞）

- 主站：之後要改版就改程式、`git push`，Vercel 會自動重新部署。
- 女友／另一台：照 `chrome-extension/README.md` 的「另一台電腦測試」「版本分開」做即可。

這樣這個版本就等於已經幫你準備好「上傳部署」的流程，你只要照上面做一次就會上線。
