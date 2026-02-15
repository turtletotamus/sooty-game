/**
 * 主視窗與右下角 embed 共用的狀態：同一 sootyId 讀寫同一份資料，表情與數值一致。
 */
import type { SootAppearance } from "@/components/soot-sprite";
import type { EmotionType } from "@/components/soot-sprite";

const MAX_STAT = 100;
const HUNGER_DECAY = 8 / 120;
const THIRST_DECAY = 10 / 120;
const HAPPINESS_DECAY = 30 / 2880;
const ENERGY_DECAY = 30 / 2880;
const DECAY_INTERVAL_MS = 30000;
const SORROW_THRESHOLD_MS = 3 * 60 * 1000;

export interface PetState {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
}

export interface SavedState {
  petName: string;
  age: number;
  petState: PetState;
  appearance: SootAppearance;
  lastSavedAt: number;
  lastInteractionTime: number;
}

const DEFAULT_PET_STATE: PetState = {
  hunger: 80,
  thirst: 85,
  happiness: 90,
  energy: 95,
};

const DEFAULT_APPEARANCE: SootAppearance = { shape: "circle", color: "#2a2a2a" };

export function getStateKey(sootyId: string | null | undefined): string {
  return "sooty-game-state-" + (sootyId || "default");
}

function clampStat(n: number): number {
  return Math.min(MAX_STAT, Math.max(0, n));
}

/** 依經過的時間做補算衰減，回傳新 state（不寫入 storage） */
export function applyCatchUpDecay(state: SavedState, now: number): SavedState {
  const elapsed = Math.max(0, now - state.lastSavedAt);
  const steps = Math.floor(elapsed / DECAY_INTERVAL_MS);
  if (steps <= 0) return state;
  const prev = state.petState;
  const next: PetState = {
    hunger: clampStat(prev.hunger - steps * HUNGER_DECAY),
    thirst: clampStat(prev.thirst - steps * THIRST_DECAY),
    happiness: clampStat(prev.happiness - steps * HAPPINESS_DECAY),
    energy: clampStat(prev.energy - steps * ENERGY_DECAY),
  };
  return {
    ...state,
    petState: next,
    lastSavedAt: state.lastSavedAt + steps * DECAY_INTERVAL_MS,
  };
}

/** 從 storage 讀取並做補算衰減；無 sootyId 或無資料時回傳預設 */
export function loadState(key: string): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const petName = typeof o.petName === "string" ? o.petName : "Sooty";
    const age = typeof o.age === "number" && o.age >= 1 ? o.age : 1;
    const ps = o.petState as Record<string, unknown> | undefined;
    const petState: PetState = {
      hunger: clampStat(typeof ps?.hunger === "number" ? ps.hunger : DEFAULT_PET_STATE.hunger),
      thirst: clampStat(typeof ps?.thirst === "number" ? ps.thirst : DEFAULT_PET_STATE.thirst),
      happiness: clampStat(typeof ps?.happiness === "number" ? ps.happiness : DEFAULT_PET_STATE.happiness),
      energy: clampStat(typeof ps?.energy === "number" ? ps.energy : DEFAULT_PET_STATE.energy),
    };
    const a = o.appearance as Record<string, unknown> | undefined;
    const shape = (a?.shape as SootAppearance["shape"]) ?? "circle";
    const color = typeof a?.color === "string" ? a.color : "#2a2a2a";
    const appearance: SootAppearance = { shape, color };
    const lastSavedAt = typeof o.lastSavedAt === "number" ? o.lastSavedAt : Date.now();
    const lastInteractionTime = typeof o.lastInteractionTime === "number" ? o.lastInteractionTime : Date.now();
    const loaded: SavedState = { petName, age, petState, appearance, lastSavedAt, lastInteractionTime };
    return applyCatchUpDecay(loaded, Date.now());
  } catch {
    return null;
  }
}

/** 寫入 storage，會帶上 lastSavedAt 與 lastInteractionTime */
export function saveState(key: string, state: Omit<SavedState, "lastSavedAt"> & { lastSavedAt?: number }): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const toSave: SavedState = {
      ...state,
      lastSavedAt: state.lastSavedAt ?? now,
      lastInteractionTime: state.lastInteractionTime ?? now,
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

/** 依狀態與 lastInteractionTime 算出表情（與主視窗邏輯一致：飢餓/口渴低→生氣，久未互動→難過） */
export function getEmotionFromState(state: SavedState, now: number): EmotionType {
  if (state.petState.hunger < 20 || state.petState.thirst < 20) return "anger";
  if (now - state.lastInteractionTime > SORROW_THRESHOLD_MS) return "sorrow";
  return "neutral";
}

export const DEFAULT_SAVED_STATE: SavedState = {
  petName: "Sooty",
  age: 1,
  petState: DEFAULT_PET_STATE,
  appearance: DEFAULT_APPEARANCE,
  lastSavedAt: Date.now(),
  lastInteractionTime: Date.now(),
};

/** 陪伴模式用：回傳「剛建立」的預設 state（lastInteractionTime 為現在），避免顯示難過/生氣 */
export function getFreshDefaultState(): SavedState {
  const now = Date.now();
  return {
    petName: "Sooty",
    age: 1,
    petState: { ...DEFAULT_PET_STATE },
    appearance: { ...DEFAULT_APPEARANCE },
    lastSavedAt: now,
    lastInteractionTime: now,
  };
}
