"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SootSprite, type EmotionType } from "@/components/soot-sprite";
import {
  getStateKey,
  loadState,
  saveState,
  getEmotionFromState,
  getFreshDefaultState,
  type SavedState,
} from "@/lib/sooty-state";
import type { SootAppearance, SootShape } from "@/components/soot-sprite";

const MAX_STAT = 100;
const COMPANION_SLEEPING_KEY_PREFIX = "sooty-companion-sleeping-";
/** 陪伴與主視窗常在不同 window，localStorage 不共用；超過此時間視為過期，不採用以免顯示衰減成生氣/難過 */
const COMPANION_STALE_STATE_MS = 2 * 60 * 1000;

/**
 * 右下角陪伴模式：只顯示一隻小黑炭，表情與主視窗一致（同一 state），點擊會跳一下並更新幸福與 lastInteractionTime。
 * 由 content script 送 COMPANION_TAP 時觸發連跳與醒來。
 */
export function EmbedCharacterOnly() {
  const searchParams = useSearchParams();
  const sootyId = searchParams?.get?.("sootyId") ?? undefined;
  const stateKey = getStateKey(sootyId);
  const companionSleepingKey = COMPANION_SLEEPING_KEY_PREFIX + stateKey;
  const debug = searchParams?.get?.("debug") === "1";
  const log = useCallback(
    (label: string, ...args: unknown[]) => {
      if (debug && typeof console !== "undefined") console.log("[Sooty 陪伴]", label, ...args);
    },
    [debug]
  );
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
  const [clientNow, setClientNow] = useState<number | null>(null);
  useEffect(() => {
    setClientNow(Date.now());
  }, []);

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

  // 測試用：embed 一載入就 log sootyId/stateKey，方便比對主視窗
  useEffect(() => {
    if (typeof console !== "undefined") {
      const id = sootyId ?? "default";
      console.log("[Sooty 陪伴] 陪伴 sootyId=" + id + " stateKey=" + stateKey);
      console.log("[Sooty 陪伴] 主視窗網址需含 ?sootyId=" + id + " 表情才會同步");
    }
  }, [sootyId, stateKey]);

  // 主動向頁面（content script）請求最新 state（popup 已存 chrome.storage），避免 sendMessage 漏送
  useEffect(() => {
    if (typeof window === "undefined" || !window.parent) return;
    try {
      window.parent.postMessage({ type: "REQUEST_STATE", stateKey }, "*");
    } catch (_) {}
    const t = setInterval(function () {
      try {
        window.parent.postMessage({ type: "REQUEST_STATE", stateKey }, "*");
      } catch (_) {}
    }, 2000);
    return () => clearInterval(t);
  }, [stateKey]);

  useEffect(() => {
    const loaded = loadState(stateKey);
    const now = Date.now();
    const stale = loaded && now - loaded.lastSavedAt > COMPANION_STALE_STATE_MS;
    setState(!loaded || stale ? getFreshDefaultState() : loaded);
    if (debug) log("embed 載入", { sootyId, stateKey, stale: !!stale });
  }, [stateKey, debug, log]);

  // 主視窗寫入 localStorage 時（同 origin 另一 tab/iframe）會觸發 storage；用 e.newValue 取得對方寫入的值（本視窗 localStorage 未變）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== stateKey || e.newValue == null) return;
      try {
        const data = JSON.parse(e.newValue) as Record<string, unknown>;
        if (data && typeof data === "object" && data.petState && typeof data.petState === "object") {
          const loaded = data as unknown as SavedState;
          setState(loaded);
          if (debug) log("storage 事件 → 已用 e.newValue 更新 state");
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [stateKey, debug, log]);

  // 主視窗透過 BroadcastChannel 傳完整 state（主視窗與陪伴在不同 window，localStorage 不共用，故直接傳 payload）
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("sooty-state-sync");
    const onMessage = (e: MessageEvent) => {
      if (debug) log("BroadcastChannel 收到", e.data);
      if (e.data?.stateKey !== stateKey) {
        if (debug && e.data?.stateKey) log("stateKey 不符", "收到", e.data.stateKey, "我的", stateKey);
        return;
      }
      try {
        if (e.data?.state && typeof e.data.state === "object") {
          setState(e.data.state as SavedState);
          if (debug) log("BroadcastChannel → 已用訊息內 state 更新");
        } else {
          const loaded = loadState(stateKey);
          if (loaded) setState(loaded);
          if (debug) log("BroadcastChannel → 已重讀 state");
        }
      } catch {
        // ignore
      }
    };
    ch.addEventListener("message", onMessage);
    return () => {
      ch.removeEventListener("message", onMessage);
      ch.close();
    };
  }, [stateKey, debug, log]);

  // 擴充中繼：主視窗 → popup → content script → embed，不依賴 BroadcastChannel 跨視窗
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "SOOTY_STATE_SYNC" || e.data?.stateKey !== stateKey || !e.data?.state) return;
      try {
        const next = e.data.state as SavedState;
        setState(next);
        if (typeof console !== "undefined") {
          const emotion = getEmotionFromState(next, Date.now());
          console.log("[Sooty 陪伴] 從擴充中繼收到 state，已更新表情 emotion=" + emotion + " hunger=" + (next.petState?.hunger ?? "?"));
        }
        if (debug) log("postMessage(擴充中繼) → 已更新 state", "emotion:", getEmotionFromState(next, Date.now()));
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [stateKey, debug, log]);

  // 與主視窗同一份 state：每 500ms 唯讀輪詢；過期資料不採用，避免陪伴顯示衰減成生氣/難過
  useEffect(() => {
    const t = setInterval(() => {
      const loaded = loadState(stateKey);
      if (!loaded) return;
      const now = Date.now();
      if (now - loaded.lastSavedAt > COMPANION_STALE_STATE_MS) return;
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

  const now = clientNow ?? state.lastInteractionTime ?? state.lastSavedAt ?? 0;
  const emotion = getEmotionFromState(state, now);
  const mouthDown =
    emotion === "anger" ||
    emotion === "sorrow" ||
    (emotion === "neutral" &&
      (state.petState.hunger < 30 || state.petState.thirst < 30 || state.petState.energy < 30));

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-transparent cursor-pointer select-none relative"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label="點擊小黑炭"
    >
      {/* 除錯用：畫面上直接顯示 sootyId / stateKey / emotion，方便與主視窗比對 */}
      <div
        className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] font-mono text-left text-black/80 bg-white/85 rounded-t pointer-events-none break-all"
        aria-hidden
      >
        <div>陪伴 sootyId: {sootyId ?? "default"}</div>
        <div>stateKey: {stateKey}</div>
        <div>emotion: {emotion} (h={state.petState.hunger} t={state.petState.thirst})</div>
        <div className="text-black/60">主視窗網址需含 ?sootyId={sootyId ?? "default"} 才會同步</div>
      </div>
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
