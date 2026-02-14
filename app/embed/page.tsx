"use client";

import { Suspense } from "react";
import { PetWindow } from "@/components/pet-window";

/**
 * Embed / popup view: only the pet window, no title, no footer, no tagline.
 * Used by Chrome extension popup and iframes.
 * URL params: ?maxSize=0.8 (cap character size to 80%), ?sootyId=... (for same pet across tabs).
 */
export default function EmbedPage() {
  return (
    <main className="min-h-screen min-w-[320px] bg-background flex items-center justify-center p-0">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="min-h-[300px] flex items-center justify-center text-muted-foreground">...</div>}>
          <PetWindow embedMode />
        </Suspense>
      </div>
    </main>
  );
}
