"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SootSprite, type EmotionType } from "@/components/soot-sprite";
import {
  getStateKey,
  loadState,
  saveState,
  getEmotionFromState,
  type SavedState,
  DEFAULT_SAVED_STATE,
} from "@/lib/sooty-state";
import type { SootAppearance, SootShape } from "@/components/soot-sprite";

const MAX_STAT = 100;
const COMPANION_SLEEPING_KEY_PREFIX = "sooty-companion-sleeping-";

/**
 * 右下角陪伴模式：只顯示一隻小黑炭，表情與主視窗一致（同一 state），點擊會跳一下並更新幸福與 lastInteractionTime。
 * 由 content script 送 COMPANION_TAP 時觸發連跳與醒來。
 */
export function EmbedCharacterOnly() {
  const searchParams = useSearchParams();
  const sootyId = searchParams?.get?.("sootyId") ?? undefined;
  const stateKey = getStateKey(sootyId);
  const companionSleepingKey = COMPANION_SLEEPING_KEY_PREFIX + stateKey;
  const validShapes: SootShape[] = ["circle", "square", "star", "triangle", "heart"];
  const appearanceFromUrl = (() => {
    const shape = searchParams?.get?.("shape");
    const color = searchParams?.get?.("color");
    if (shape && validShapes.includes(shape as SootShape) && color && /^#[0-9a-fA-F]{6}$/.test(color)) {
      return { shape: shape as SootShape, color } as SootAppearance;
    }
    return null;
  })();
  const maxSizeScale = (() => {
    try {
      const raw = searchParams?.get?.("maxSize");
      if (raw == null) return 1;
      const n = parseFloat(raw);
      if (Number.isNaN(n)) return 1;
      return Math.min(1, Math.max(0.1, n));
    } catch {
      return 1;
    }
  })();

  const [state, setState] = useState<SavedState | null>(null);
  const [key, setKey] = useState(0);
  const [externalJumpTrigger, setExternalJumpTrigger] = useState(0);
  const [isCompanionSleeping, setIsCompanionSleeping] = useState(false);

  const readCompanionSleeping = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(companionSleepingKey) === "1";
  }, [companionSleepingKey]);

  useEffect(() => {
    setIsCompanionSleeping(readCompanionSleeping());
  }, [readCompanionSleeping]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === companionSleepingKey) setIsCompanionSleeping(readCompanionSleeping());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [companionSleepingKey, readCompanionSleeping]);

  useEffect(() => {
    const loaded = loadState(stateKey);
    setState(loaded ?? DEFAULT_SAVED_STATE);
  }, [stateKey]);

  // 主視窗寫入 localStorage 時（同 origin 另一 tab/iframe）立即同步，必用 loadState 重讀避免漏接
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== stateKey || e.newValue == null) return;
      try {
        const loaded = loadState(stateKey);
        if (loaded) setState(loaded);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [stateKey]);

  // 主視窗透過 BroadcastChannel 通知「剛寫入」，陪伴立即重讀（不依賴 storage 事件）
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("sooty-state-sync");
    const onMessage = (e: MessageEvent) => {
      if (e.data?.stateKey === stateKey) {
        try {
          const loaded = loadState(stateKey);
          if (loaded) setState(loaded);
        } catch {
          // ignore
        }
      }
    };
    ch.addEventListener("message", onMessage);
    return () => {
      ch.removeEventListener("message", onMessage);
      ch.close();
    };
  }, [stateKey]);

  // 與主視窗同一份 state：每 500ms 唯讀輪詢（不寫回，避免覆蓋主視窗剛寫入的狀態）
  useEffect(() => {
    const t = setInterval(() => {
      const loaded = loadState(stateKey);
      if (!loaded) return;
      setState((prev) => {
        if (
          !prev ||
          prev.lastSavedAt !== loaded.lastSavedAt ||
          prev.lastInteractionTime !== loaded.lastInteractionTime ||
          prev.petState.hunger !== loaded.petState.hunger ||
          prev.petState.thirst !== loaded.petState.thirst ||
          prev.petState.happiness !== loaded.petState.happiness ||
          prev.petState.energy !== loaded.petState.energy
        ) {
          return loaded;
        }
        return prev;
      });
    }, 500);
    return () => clearInterval(t);
  }, [stateKey]);

  // 分頁／視窗回到前景時立即重讀 state，讓情緒與主視窗馬上一致
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const loaded = loadState(stateKey);
      if (loaded) setState(loaded);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stateKey]);

  const persist = useCallback(
    (next: SavedState) => {
      setState(next);
      saveState(stateKey, next);
    },
    [stateKey]
  );

  const handleClick = useCallback(() => {
    if (!state) return;
    const now = Date.now();
    const next: SavedState = {
      ...state,
      petState: {
        ...state.petState,
        happiness: Math.min(MAX_STAT, state.petState.happiness + 3),
      },
      lastInteractionTime: now,
      lastSavedAt: now,
    };
    persist(next);
    setKey((k) => k + 1);
  }, [state, persist]);

  const jumpTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "COMPANION_TAP" || e.source !== window.parent) return;
      handleClick();
      if (isCompanionSleeping) {
        try {
          localStorage.removeItem(companionSleepingKey);
        } catch {
          // ignore
        }
        setIsCompanionSleeping(false);
      }
      jumpTimeoutsRef.current.forEach((id) => clearTimeout(id));
      jumpTimeoutsRef.current = [];
      setExternalJumpTrigger(Date.now());
      const t1 = setTimeout(() => setExternalJumpTrigger((t) => t + 1), 380);
      const t2 = setTimeout(() => setExternalJumpTrigger((t) => t + 2), 760);
      jumpTimeoutsRef.current = [t1, t2];
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      jumpTimeoutsRef.current.forEach((id) => clearTimeout(id));
      jumpTimeoutsRef.current = [];
    };
  }, [handleClick, isCompanionSleeping, companionSleepingKey]);

  if (!state) {
    return (
      <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">...</span>
      </div>
    );
  }

  const now = Date.now();
  const emotion = getEmotionFromState(state, now);
  const mouthDown =
    emotion === "anger" ||
    emotion === "sorrow" ||
    (emotion === "neutral" &&
      (state.petState.hunger < 30 || state.petState.thirst < 30 || state.petState.energy < 30));

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-transparent cursor-pointer select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label="點擊小黑炭"
    >
      <SootSprite
        key={key}
        emotion={emotion}
        currentAction={null}
        isEating={false}
        isSleeping={isCompanionSleeping}
        onClick={() => {}}
        age={state.age}
        appearance={(appearanceFromUrl ?? state.appearance) as SootAppearance}
        mouthDown={mouthDown}
        maxSizeScale={maxSizeScale}
        externalJumpTrigger={externalJumpTrigger}
      />
    </div>
  );
}
