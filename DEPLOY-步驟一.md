# 第一步：把程式推到 GitHub（詳細版）

一步一步做，做完第一步再跟我說，我們再走第二步。

---

## 1-1. 確認你有 GitHub 帳號

- 如果**還沒有**：到 https://github.com 點「Sign up」，用 email 註冊一個帳號。
- 如果**已有**：登入後繼續下面。

---

## 1-2. 在 GitHub 上「開一個新倉庫」

1. 登入 GitHub 後，在網址列輸入：
   ```
   https://github.com/new
   ```
   按 Enter，會打開「Create a new repository」頁面。

2. **Repository name**（倉庫名稱）  
   - 在欄位裡輸入一個英文名字，例如：`sooty-game`  
   - 不要用空格、盡量用小寫英文和數字就好。

3. **Description**（說明）  
   - 可留白，或隨便打「小黑炭桌面寵物」。

4. **Public / Private**  
   - 選 **Public**（公開），之後 Vercel 才能從 GitHub 讀取並部署。

5. **下面這幾個都不要勾**（很重要）：  
   - ❌ **Add a README file** — 不要勾  
   - ❌ **Add .gitignore** — 不要勾  
   - ❌ **Choose a license** — 不要選  
   因為你電腦裡已經有整個專案了，勾了會多出檔案，之後推送時容易衝突。

6. 最後點綠色的 **Create repository** 按鈕。

---

## 1-3. 記下你的倉庫網址

建立好之後，會跳到一個新頁面，上面有一行網址，長這樣：

```
https://github.com/你的帳號名稱/sooty-game.git
```

- **你的帳號名稱**：就是你登入 GitHub 時用的使用者名稱。  
- 把這整行網址**複製起來**（或開一個記事本貼上），下一步會用到。  
- 如果你取的倉庫名不是 `sooty-game`，網址最後就會是 `你取的名字.git`。

---

## 1-4. 在本機專案資料夾打開終端機

1. 打開 **終端機**（Terminal）：  
   - Mac：可在「應用程式」→「工具程式」→「終端機」，或用 Spotlight 搜尋「Terminal」。  
   - 或用 VS Code / Cursor 裡面的終端機：上方選單 **Terminal** → **New Terminal**。

2. 用指令**切到你的專案根目錄**（就是有 `package.json`、`app`、`components` 的那一層）：  
   ```bash
   cd /Users/turtletotamus/sooty-game
   ```
   （如果你專案不在這個路徑，就改成你實際的路徑；例如 `cd ~/Desktop/sooty-game`。）

3. 確認你在正確的資料夾：輸入  
   ```bash
   ls
   ```  
   應該會看到 `package.json`、`app`、`chrome-extension` 等資料夾／檔案。

---

## 1-5. 依序輸入這四行指令（一行一行來）

**每一行輸入完就按 Enter，等它跑完再輸入下一行。**

### 第 1 行：把目前所有改動加入暫存

```bash
git add .
```

- 意思：把專案裡有改過的、新增的檔案都標記成「要提交」。  
- 跑完通常不會有字，直接出現下一行提示就代表成功。

---

### 第 2 行：做一次「提交」（commit）

```bash
git commit -m "Deploy: Sooty with embed, widget, chrome extension"
```

- 意思：把剛剛 add 的內容存成一個版本，並加上這句說明。  
- 若出現 `nothing to commit`：代表沒有新變更，可能你之前已經 commit 過了，可以跳過這行，直接做第 3、4 行。  
- 若出現 `Author identity unknown`：代表還沒設定 Git 使用者名稱／email，照終端機的提示設一次（見下面 1-6）。

---

### 第 3 行：把分支名稱設成 main（若已經是 main 也沒關係）

```bash
git branch -M main
```

- 意思：把目前分支改名成 `main`，和 GitHub 預設一致。  
- 跑完通常沒有輸出。

---

### 第 4 行：把 GitHub 倉庫設成「遠端」並推送

**這裡要把網址換成你在 1-3 記下來的那一行。**

```bash
git remote add origin https://github.com/你的帳號名稱/sooty-game.git
```

- 把 **你的帳號名稱** 換成你的 GitHub 使用者名稱。  
- 把 **sooty-game** 換成你在 1-2 取的倉庫名稱（若你取別的名字）。  
- 例如帳號是 `turtletotamus`、倉庫名是 `sooty-game`，就打成：  
  ```bash
  git remote add origin https://github.com/turtletotamus/sooty-game.git
  ```

若終端機顯示 **`fatal: remote origin already exists`**：  
代表你之前已經設過 `origin` 了，改成下面這行（網址一樣換成你的）：  
```bash
git remote set-url origin https://github.com/你的帳號名稱/sooty-game.git
```  
然後再執行下一行。

---

### 第 5 行：真正「推上去」GitHub

```bash
git push -u origin main
```

- 意思：把本機的 `main` 分支推到 GitHub 的 `origin`，並設成之後預設推送的目標。  
- 第一次推可能會跳出 **登入**：  
  - 若跳出瀏覽器或要你輸入帳號密碼：用你的 **GitHub 帳號**登入。  
  - 若說不支援密碼：GitHub 現在要用 **Personal Access Token** 當密碼，見下面 1-7。

推成功的話，終端機會出現類似：  
`Branch 'main' set up to track remote branch 'main' from 'origin'.`  
和幾行 `Writing objects...`、`done`。

---

## 1-6. 若出現「Author identity unknown」

Git 會要你先設定名字和 email，在終端機輸入（改成你的名字和 email）：

```bash
git config --global user.name "你的名字或暱稱"
git config --global user.email "你的email@example.com"
```

email 建議用你註冊 GitHub 的那個。  
設完後再從 **1-5 第 2 行** `git commit ...` 重新做一次。

---

## 1-7. 若 push 時說要密碼、又說不支援密碼

GitHub 現在不給用「帳號＋登入密碼」推程式，要改用 **Personal Access Token**：

1. 登入 GitHub → 右上角頭像 → **Settings**。  
2. 左邊最下面 **Developer settings** → **Personal access tokens** → **Tokens (classic)**。  
3. **Generate new token (classic)**，Note 隨便打（例如 `vercel-deploy`），勾選 **repo**。  
4. 產生後會給一串英文數字，**只會顯示一次**，先複製起來。  
5. 再執行一次：  
   ```bash
   git push -u origin main
   ```  
   當它問 **Password** 時，貼上剛剛那串 **Token**（不要貼你的 GitHub 登入密碼），按 Enter。

---

## 1-8. 怎麼確認第一步成功？

1. 打開瀏覽器，到：  
   `https://github.com/你的帳號名稱/sooty-game`  
   （倉庫名換成你取的）

2. 頁面上應該會看到你專案裡的檔案：`app`、`components`、`chrome-extension`、`package.json` 等。

有看到就代表**第一步完成**。  
下一步我們會用這個 GitHub 倉庫在 Vercel 上部署；你做完第一步後跟我說，我再一步一步帶你走第二步。
