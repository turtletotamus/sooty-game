"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SootSprite, type EmotionType, type ActionType } from "@/components/soot-sprite";
import type { SootAppearance } from "@/components/soot-sprite";
import { useLanguage } from "@/components/language-context";

const SAVED_STATE_KEY = "sooty-game-state";

interface PetState {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
}

function loadSavedState(): {
  petName: string;
  age: number;
  petState: PetState;
  appearance: SootAppearance;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const petName = typeof o.petName === "string" ? o.petName : "Sooty";
    const age = typeof o.age === "number" && o.age >= 1 ? o.age : 1;
    const ps = o.petState as Record<string, unknown> | undefined;
    const petState: PetState = {
      hunger: typeof ps?.hunger === "number" ? ps.hunger : 80,
      thirst: typeof ps?.thirst === "number" ? ps.thirst : 85,
      happiness: typeof ps?.happiness === "number" ? ps.happiness : 90,
      energy: typeof ps?.energy === "number" ? ps.energy : 95,
    };
    const a = o.appearance as Record<string, unknown> | undefined;
    const shape = (a?.shape as SootAppearance["shape"]) ?? "circle";
    const color = typeof a?.color === "string" ? a.color : "#2a2a2a";
    const appearance: SootAppearance = { shape, color };
    return { petName, age, petState, appearance };
  } catch {
    return null;
  }
}

export default function WidgetPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<{
    petName: string;
    age: number;
    petState: PetState;
    appearance: SootAppearance;
  } | null>(null);

  useEffect(() => {
    setState(loadSavedState() ?? {
      petName: "Sooty",
      age: 1,
      petState: { hunger: 80, thirst: 85, happiness: 90, energy: 95 },
      appearance: { shape: "circle", color: "#2a2a2a" },
    });
  }, []);

  const handleClick = useCallback(() => {
    // Optional: tiny happiness bump on click (sync back to localStorage)
    const saved = loadSavedState();
    if (!saved) return;
    const next = {
      ...saved,
      petState: {
        ...saved.petState,
        happiness: Math.min(100, saved.petState.happiness + 2),
      },
    };
    try {
      localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(next));
      setState(next);
    } catch {
      // ignore
    }
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const emotion: EmotionType =
    state.petState.happiness >= 70 ? "joy" : state.petState.happiness <= 30 ? "sorrow" : "neutral";

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* Fixed bottom-right area: just the soot, no chrome */}
      <div className="fixed bottom-0 right-0 w-[280px] h-[280px] flex items-center justify-center pointer-events-none select-none">
        <div className="pointer-events-auto cursor-pointer" onClick={handleClick}>
          <SootSprite
            emotion={emotion}
            currentAction={null}
            isEating={false}
            isSleeping={false}
            onClick={() => {}}
            age={state.age}
            appearance={state.appearance}
          />
        </div>
      </div>

      {/* Minimal link to full app - top left, small */}
      <div className="fixed top-2 left-2 z-10 pointer-events-auto">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground underline bg-background/80 dark:bg-background/80 px-2 py-1 rounded"
        >
          {t("widget.openFull")}
        </Link>
      </div>
    </div>
  );
}
