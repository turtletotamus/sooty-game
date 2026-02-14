"use client";

import { useLanguage } from "@/components/language-context";

export default function PrivacyPage() {
  const { t } = useLanguage();
  
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">隱私權政策</h1>
        <p className="text-sm text-muted-foreground mb-8">最後更新：2025 年 2 月</p>

        <div className="space-y-6 text-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. 資料收集</h2>
            <p className="mb-2">
              <strong>Sooty (小黑炭) 擴充功能不收集、不儲存、不傳輸任何個人資料或使用者資訊。</strong>
            </p>
            <p>
              本擴充功能僅使用 Chrome 瀏覽器內建的 <code className="bg-muted px-1 rounded">chrome.storage.local</code> API 
              儲存一個簡單的布林值設定（是否在網頁上顯示寵物視窗）。此設定完全儲存在您的瀏覽器本地，不會傳輸到任何外部伺服器。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. 資料使用</h2>
            <p>
              擴充功能不會：
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>收集任何個人識別資訊（姓名、電子郵件、地址等）</li>
              <li>追蹤您的瀏覽行為或網頁內容</li>
              <li>讀取或修改您造訪的網頁</li>
              <li>將任何資料傳輸到外部伺服器</li>
              <li>與第三方分享任何資訊</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. 權限說明</h2>
            <p className="mb-2">本擴充功能要求以下權限：</p>
            <ul className="list-disc list-inside ml-4 space-y-2 mt-2">
              <li>
                <strong>storage</strong>：僅用於儲存顯示開關設定，所有資料都儲存在您的瀏覽器本地。
              </li>
              <li>
                <strong>網站存取權限（content_scripts）</strong>：
                用於在所有網頁注入一個 iframe，以便在右下角顯示寵物視窗。
                擴充功能不會讀取、修改或存取任何網頁內容，僅用於顯示寵物介面。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. 遠端內容</h2>
            <p>
              擴充功能使用 iframe 載入我們的主站（<code className="bg-muted px-1 rounded">https://sooty-game.vercel.app/embed</code>）
              來顯示寵物介面。此 iframe 僅用於顯示寵物功能，不會存取您造訪的網頁內容。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. 資料安全</h2>
            <p>
              由於擴充功能不收集任何資料，且所有設定都儲存在您的瀏覽器本地，
              因此不存在資料外洩或未經授權存取的風險。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. 第三方服務</h2>
            <p>
              本擴充功能不使用任何第三方分析服務、廣告服務或追蹤工具。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. 資料刪除</h2>
            <p>
              您可以隨時透過以下方式刪除擴充功能儲存的資料：
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
              <li>在 Chrome 擴充功能管理頁面（<code className="bg-muted px-1 rounded">chrome://extensions/</code>）移除擴充功能</li>
              <li>或使用 Chrome 的「清除瀏覽資料」功能清除擴充功能資料</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. 政策變更</h2>
            <p>
              如果我們更新本隱私權政策，我們會在此頁面發布更新後的版本。
              建議您定期查看此頁面以了解最新資訊。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. 聯絡我們</h2>
            <p>
              如果您對本隱私權政策有任何疑問，請透過主站（<a href="https://sooty-game.vercel.app" className="text-primary hover:underline">https://sooty-game.vercel.app</a>）與我們聯絡。
            </p>
          </section>
        </div>

        <div className="mt-12 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>保證聲明：</strong>
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• 除經核准的用途外，我們不會將使用者資料販售或轉移給第三方</li>
            <li>• 我們不會基於與商品單一用途無關的目的，使用或轉移使用者資料</li>
            <li>• 我們不會使用或轉移使用者資料以判斷信用等級或用於貸款</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
