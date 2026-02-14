# 為什麼 embed 會有白色外框？為什麼改很多次都改不掉？

## 1. 為什麼會出現外框？

**白框不是「擴充的容器」或「視窗框」，而是 iframe 裡整頁的背景色。**

流程是這樣：

1. **擴充**（content.js）在網頁上放一個 **iframe**，src 指向主站的 `/embed`（例如 `https://sooty-game.vercel.app/embed?sootyId=xxx`）。

2. **iframe 是一個獨立的 document**。它載入的是完整的 Next 應用：先載入根 layout（`app/layout.tsx`），再渲染 `app/embed/page.tsx`。

3. **根 layout** 的 `<body>` 沒有在 JSX 裡設背景，但全站共用的 **`app/globals.css`** 裡有：

   ```css
   @layer base {
     body {
       @apply bg-background text-foreground;
     }
   }
   ```

4. **`bg-background`** 對應的是 CSS 變數 `--background`。在淺色主題下是 `oklch(0.985 0.005 270)`，也就是**接近白色的淺灰**。

5. 所以：**你看到的「白色外框」= iframe 內整個 document 的 `<body>` 被 globals.css 套用了 `bg-background`**。  
   我們改的 `embed/page.tsx` 的 `<main className="bg-transparent">` 和 embed 裡 div 的 `bg-transparent` 都只在 body **裡面的**那一塊變透明，**body 本身從來沒有被改成透明**。

6. **embed 沒有自己的 layout**。`app/embed/` 底下沒有 `layout.tsx`，所以 embed 頁面用的是**根 layout + 同一份 globals.css**，body 的樣式跟首頁、其他頁完全一樣，因此一定會出現那塊背景色。

**結論：外框 = iframe 內頁面的 body 背景（來自 globals.css 的 `body { @apply bg-background }`），不是擴充的 div 或 iframe 的「框」。**

---

## 2. 為什麼調整這麼多次還是沒辦法把外框改掉？

因為我們一直在改「錯的層級」：

| 改過的地方 | 實際作用 | 為什麼改不掉外框 |
|------------|----------|------------------|
| **擴充 content.js** | 只影響「包住 iframe 的那個 div」和 iframe 元素本身（陰影、圓角、透明等） | 白框在 **iframe 裡面** 的 document，不在擴充注入的 DOM 裡。 |
| **embed/page.tsx** 的 `<main className="bg-transparent">` | 只讓 main 這一個區塊透明 | body 在 main **外層**，body 仍是 `bg-background`，整頁還是白的。 |
| **embed-character-only.tsx** 的 div `bg-transparent` | 只讓包住小黑炭的那一層透明 | 同上，都在 body 裡面；body 本身沒變。 |

也就是說：

- **白框來自「iframe 內 document 的根（body）」**
- 我們從來沒有在 **embed 這條路由** 上改過 body（或 html）的背景
- 也沒有用 embed 專用 layout 覆寫 globals 的 body 樣式

所以不管在擴充或 embed 頁面裡怎麼設 `bg-transparent`，只要 **body 還是 `bg-background`**，整塊 iframe 看起來就會有一塊白（或主題色）的底，就像外框一樣。

---

## 3. 要真正拿掉外框，需要動哪裡？（僅說明，不實作）

要從「iframe 裡那整頁」下手，而不是只改擴充或 embed 裡的一兩個元件：

1. **讓 embed 路由的 body（或 html）背景變透明**，例如：
   - 在 **`app/embed/` 加專用 `layout.tsx`**，在 body（或包一層 div）上設 `className="bg-transparent"` 或 `style={{ background: 'transparent' }}`，並確保這會覆蓋 globals 的 `body { bg-background }`（例如用更高優先級或覆寫 `--background`）；或
   - 在 **globals.css** 用條件（例如某個僅 embed 頁才有的 class）只對 embed 的 body 設透明。

2. 若 embed 有獨立 layout，記得該 layout 的 **根元素（html/body）** 要透明，而不是只讓 children 透明。

這樣才能從「整頁背景」的層級消除白框，而不是只在內層元件設透明。

---

*此檔案僅用於釐清原因與改動層級，未對程式做任何修改。*
