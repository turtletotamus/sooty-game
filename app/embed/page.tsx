"use client";

import { Suspense } from "react";
import { EmbedCharacterOnly } from "@/components/embed-character-only";

/**
 * 右下角陪伴模式：只顯示一隻小黑炭，與主視窗同一份 state（sootyId），表情一致；點擊會跳一下。
 * URL params: ?sootyId=...（與主視窗共用）, ?maxSize=0.8（可選）
 */
export default function EmbedPage() {
  return (
    <main className="min-h-screen min-w-[120px] bg-transparent flex items-center justify-center p-0">
      <div className="w-full h-full min-h-[200px] flex items-center justify-center">
        <Suspense fallback={<div className="min-h-[200px] flex items-center justify-center text-muted-foreground">...</div>}>
          <EmbedCharacterOnly />
        </Suspense>
      </div>
    </main>
  );
}
