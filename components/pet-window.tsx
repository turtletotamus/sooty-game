"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { SootSprite, type EmotionType, type ActionType } from "@/components/soot-sprite";
import { ActionPanel, type ActionItem } from "@/components/action-panel";
import { StatBar } from "@/components/stat-bar";
import { WeatherEffects, type WeatherType } from "@/components/weather-effects";
import { BreathingExercise } from "@/components/breathing-exercise";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SootCustomizer } from "@/components/soot-customizer";
import { FloatingWidget } from "@/components/floating-widget";
import { useLanguage } from "@/components/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Droplets, Zap, Sparkles, Cookie, Pencil, Check, Settings, Shirt, LayoutGrid } from "lucide-react";
import { WhiteNoiseControl } from "@/components/white-noise-control";
import type { SootAppearance } from "@/components/soot-sprite";
import { getSizeMultiplier, SOOT_BASE_SIZE } from "@/components/soot-sprite";
import { APP_VERSION } from "@/lib/version";
import { getStateKey, loadState, saveState as persistState } from "@/lib/sooty-state";

interface PetState {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
}

const MAX_STAT = 100;

// Decay: check every 30 seconds
const DECAY_INTERVAL = 30000;
// Hunger: 8 per hour → 8/120 per 30s
const HUNGER_DECAY = 8 / 120;
// Thirst: 10 per hour → 10/120 per 30s
const THIRST_DECAY = 10 / 120;
// Happiness: 30 per day → 30/2880 per 30s
const HAPPINESS_DECAY = 30 / 2880;
// Energy: 30 per day → 30/2880 per 30s
const ENERGY_DECAY = 30 / 2880;

// Age: +1 year every 3 hours
const AGE_INTERVAL = 3 * 60 * 60 * 1000;

// Sorrow trigger: No interaction for 3 minutes
const SORROW_THRESHOLD = 3 * 60 * 1000; // 3 minutes

// Rapid tap anger detection
const TAP_WINDOW = 2000; // 2 second window
const TAP_THRESHOLD = 5; // 5 taps in window triggers anger

type WalkScene = "forest" | "beach" | "city";
const WALK_SCENE_IDS: WalkScene[] = ["forest", "beach", "city"];
const WALK_DURATIONS_MIN = [5, 15, 30] as const;
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FOOD_EMOJIS = ["🍎", "🍊", "🍌", "🍇", "🥕", "🍞", "🧁", "🍪", "🍩", "🥐"];
const DRINK_EMOJIS = ["🥤", "🍵", "☕", "🧃", "🥛", "🧋", "🍶", "🥤"];
const BALL_EMOJIS = ["⚾", "⚽", "🏀", "🎾"];
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
function getWalkSceneBg(scene: WalkScene): string {
  switch (scene) {
    case "forest":
      return "bg-gradient-to-b from-green-200/50 via-emerald-200/40 to-lime-200/40 dark:from-green-950/55 dark:via-emerald-950/40 dark:to-lime-950/30";
    case "beach":
      return "bg-gradient-to-b from-sky-200/60 via-cyan-200/40 to-amber-100/60 dark:from-sky-900/35 dark:via-cyan-950/30 dark:to-amber-950/30";
    case "city":
    default:
      return "bg-gradient-to-b from-slate-200/70 via-violet-200/35 to-slate-100/70 dark:from-slate-950/65 dark:via-violet-950/25 dark:to-slate-950/50";
  }
}

const WIDGET_VISIBLE_KEY = "sooty-widget-visible";

function loadWidgetVisible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(WIDGET_VISIBLE_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

function saveWidgetVisible(visible: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIDGET_VISIBLE_KEY, visible ? "1" : "0");
  } catch {
    // ignore
  }
}

function saveState(
  key: string,
  petName: string,
  age: number,
  petState: PetState,
  appearance: SootAppearance,
  lastInteractionTime: number
) {
  persistState(key, {
    petName,
    age,
    petState,
    appearance,
    lastSavedAt: Date.now(),
    lastInteractionTime,
  });
}

const defaultPetState: PetState = {
  hunger: 80,
  thirst: 85,
  happiness: 90,
  energy: 95,
};

const defaultAppearance: SootAppearance = { shape: "circle", color: "#2a2a2a" };

export function PetWindow({ embedMode }: { embedMode?: boolean } = {}) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const sootyId = searchParams?.get?.("sootyId") ?? undefined;
  const stateKey = getStateKey(sootyId);
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
  const [petName, setPetName] = useState("Sooty");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(petName);
  const [age, setAge] = useState(1);
  const [petState, setPetState] = useState<PetState>(defaultPetState);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [isPureJoy, setIsPureJoy] = useState(false);
  const [wasWokenUp, setWasWokenUp] = useState(false);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [isOverTapped, setIsOverTapped] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const hasShownGreeting = useRef(false);

  const [currentWeather, setCurrentWeather] = useState<WeatherType>("sunny");
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);

  const [appearance, setAppearance] = useState<SootAppearance>(defaultAppearance);
  const [sootyKey, setSootyKey] = useState(0);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [showFloatingWidget, setShowFloatingWidget] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const hasLoadedSave = useRef(false);

  const [fallingItem, setFallingItem] = useState<{
    type: "food" | "drink" | "play";
    emoji: string;
    key: number;
    dropXPercent?: number;
  } | null>(null);
  const [runToTarget, setRunToTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) setShowSettingsMenu(false);
    };
    if (showSettingsMenu) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showSettingsMenu]);

  // Load saved progress once on mount（與 embed 共用同一 stateKey，數值一致）
  useEffect(() => {
    if (hasLoadedSave.current) return;
    hasLoadedSave.current = true;
    const saved = loadState(stateKey);
    if (saved) {
      setPetName(saved.petName);
      setTempName(saved.petName);
      setAge(saved.age);
      setPetState(saved.petState);
      setAppearance(saved.appearance);
      setLastInteractionTime(saved.lastInteractionTime);
    }
    setShowFloatingWidget(loadWidgetVisible());
  }, [stateKey]);

  // Persist progress when key state changes
  useEffect(() => {
    saveState(stateKey, petName, age, petState, appearance, lastInteractionTime);
  }, [stateKey, petName, age, petState, appearance, lastInteractionTime]);

  // Walk mode (inline DEMO)
  const [isWalking, setIsWalking] = useState(false);
  const [walkScene, setWalkScene] = useState<WalkScene>("forest");
  const [walkDurationMin, setWalkDurationMin] = useState<(typeof WALK_DURATIONS_MIN)[number]>(5);
  const [walkSecondsLeft, setWalkSecondsLeft] = useState(5 * 60);
  const [walkPaused, setWalkPaused] = useState(false);
  const [walkHidden, setWalkHidden] = useState(false);
  const [walkPos, setWalkPos] = useState({ x: 0, y: 0 });
  const walkAreaRef = useRef<HTMLDivElement>(null);

  // Show greeting when user first opens or returns to the app
  useEffect(() => {
    if (!hasShownGreeting.current) {
      hasShownGreeting.current = true;
      setShowGreeting(true);
      setIsPureJoy(true);
      showNotification(t("notifications.missedYou", { name: petName }));
      
      setTimeout(() => {
        setShowGreeting(false);
      }, 3000);
    }

    // Also detect tab visibility for return greeting
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeAway = Date.now() - lastInteractionTime;
        // If away for more than 5 minutes, show greeting
        if (timeAway > 5 * 60 * 1000) {
          setShowGreeting(true);
          setIsPureJoy(true);
          showNotification(t("notifications.missedYou", { name: petName }));
          setTimeout(() => setShowGreeting(false), 3000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lastInteractionTime, petName]);

  // Get emotion based on triggers
  const getEmotion = useCallback((): EmotionType => {
    // Anger: Over-tapped, woken up, or very low hunger/thirst
    if (isOverTapped || wasWokenUp) return "anger";
    if (petState.hunger < 20 || petState.thirst < 20) return "anger";
    
    // Pure Joy: Triggered by pet/love/feed actions (temporary peak state)
    if (isPureJoy) return "joy";
    
    // Sorrow: No interaction for 3 minutes
    const timeSinceInteraction = Date.now() - lastInteractionTime;
    if (timeSinceInteraction > SORROW_THRESHOLD) return "sorrow";
    
    // Default neutral
    return "neutral";
  }, [petState, wasWokenUp, isPureJoy, lastInteractionTime, isOverTapped]);

  // Check for sorrow state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update emotion
      setLastInteractionTime((prev) => prev);
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Slow stat decay over time (office-worker friendly)
  useEffect(() => {
    const interval = setInterval(() => {
      setPetState((prev) => ({
        hunger: Math.max(0, prev.hunger - HUNGER_DECAY),
        thirst: Math.max(0, prev.thirst - THIRST_DECAY),
        happiness: Math.max(0, prev.happiness - HAPPINESS_DECAY),
        energy: Math.max(0, prev.energy - ENERGY_DECAY),
      }));
    }, DECAY_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Age progression
  useEffect(() => {
    const interval = setInterval(() => {
      setAge((prev) => prev + 1);
    }, AGE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Reset Pure Joy after a delay
  useEffect(() => {
    if (isPureJoy) {
      const timeout = setTimeout(() => setIsPureJoy(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isPureJoy]);

  // Reset woken up anger after a delay
  useEffect(() => {
    if (wasWokenUp) {
      const timeout = setTimeout(() => setWasWokenUp(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [wasWokenUp]);

  // Reset over-tapped anger after a delay
  useEffect(() => {
    if (isOverTapped) {
      const timeout = setTimeout(() => setIsOverTapped(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOverTapped]);

  // Show notification
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  };

  // Update last interaction time
  const recordInteraction = () => {
    setLastInteractionTime(Date.now());
  };

  // Handle rapid tap detection
  const handleTap = () => {
    const now = Date.now();
    const recentTaps = tapTimes.filter((t) => now - t < TAP_WINDOW);
    const newTapTimes = [...recentTaps, now];
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= TAP_THRESHOLD && !isOverTapped) {
      setIsOverTapped(true);
      showNotification(t("notifications.tooMuchPoking"));
    }
  };

  // Handle name edit
  const handleNameSave = () => {
    if (tempName.trim()) {
      setPetName(tempName.trim());
    } else {
      setTempName(petName);
    }
    setIsEditingName(false);
  };

  // Handle action
  const handleAction = (action: ActionItem) => {
    if (isPerformingAction) return;
    if (action.energyCost > 0 && petState.energy < action.energyCost) return;

    recordInteraction();

    // Walk mode demo: opens a dedicated modal instead of a short action animation
    if (action.id === "walk") {
      const scene = randomFrom(WALK_SCENE_IDS);
      const mins = randomFrom(WALK_DURATIONS_MIN);
      setWalkScene(scene);
      setWalkDurationMin(mins);
      setWalkSecondsLeft(mins * 60);
      setWalkPaused(false);
      setWalkHidden(false);
      setIsWalking(true);
      showNotification(t("notifications.letsWalk"));
      return;
    }

    // Check if clicking while sleeping (anger trigger)
    if (currentAction === "sleep" && action.id !== "sleep") {
      setWasWokenUp(true);
      setCurrentAction(null);
      setIsPerformingAction(false);
      showNotification(t("notifications.dontWakeMe"));
      return;
    }

    setIsPerformingAction(true);
    setCurrentAction(action.id);

    // Feed/drink: falling emoji + pet runs toward it
    if (action.id === "feed") {
      const emoji = randomFrom(FOOD_EMOJIS);
      setFallingItem({ type: "food", emoji, key: Date.now() });
      setRunToTarget({ x: (Math.random() - 0.5) * 24, y: 18 });
    } else if (action.id === "drink") {
      const emoji = randomFrom(DRINK_EMOJIS);
      setFallingItem({ type: "drink", emoji, key: Date.now() });
      setRunToTarget({ x: (Math.random() - 0.5) * 24, y: 18 });
    } else if (action.id === "play") {
      const emoji = randomFrom(BALL_EMOJIS);
      const dropXPercent = 20 + Math.random() * 60;
      setFallingItem({ type: "play", emoji, key: Date.now(), dropXPercent });
      setRunToTarget({ x: (Math.random() - 0.5) * 40, y: 24 });
    }

    // Trigger Pure Joy for love/feed actions
    if (action.id === "love" || action.id === "feed") {
      setIsPureJoy(true);
    }

    showNotification(t(`actionMessages.${action.messageKey}`));

    setPetState((prev) => ({
      hunger: Math.min(MAX_STAT, prev.hunger + action.hungerGain),
      thirst: Math.min(MAX_STAT, prev.thirst + action.thirstGain),
      happiness: Math.min(MAX_STAT, prev.happiness + action.happinessGain),
      energy: Math.min(MAX_STAT, Math.max(0, prev.energy - action.energyCost + action.energyGain)),
    }));

    setTimeout(() => {
      setIsPerformingAction(false);
      setCurrentAction(null);
      setFallingItem(null);
      setRunToTarget(null);
    }, action.duration);
  };

  // Click on sprite
  const handleSpriteClick = () => {
    recordInteraction();
    handleTap();

    // If sleeping and clicked, wake up angry
    if (currentAction === "sleep") {
      setWasWokenUp(true);
      setCurrentAction(null);
      setIsPerformingAction(false);
      showNotification(t("notifications.grrSleeping"));
      return;
    }

    // Don't trigger joy if over-tapped
    if (isOverTapped) return;

    if (!isPerformingAction) {
      // Trigger brief Pure Joy on click (with random chance)
      if (Math.random() > 0.3) {
        setIsPureJoy(true);
      }
      setPetState((prev) => ({
        ...prev,
        happiness: Math.min(MAX_STAT, prev.happiness + 3),
      }));

      const messages = ["~!", "Squeak!", "Poof!", "Wiggle~", "*bounce*"];
      showNotification(messages[Math.floor(Math.random() * messages.length)]);
    }
  };

  // Handle breathing exercise completion
  const handleBreathingComplete = () => {
    recordInteraction();
    setIsPureJoy(true);
    setPetState((prev) => ({
      ...prev,
      happiness: Math.min(MAX_STAT, prev.happiness + 20),
      energy: Math.min(MAX_STAT, prev.energy + 15),
    }));
    showNotification(t("notifications.soRelaxed"));
  };

  // Handle Pomodoro events
  const handleWorkComplete = () => {
    recordInteraction();
    setIsPureJoy(true);
    setPetState((prev) => ({
      ...prev,
      happiness: Math.min(MAX_STAT, prev.happiness + 15),
    }));
    showNotification(t("notifications.greatWork"));
  };

  const handleBreakComplete = () => {
    recordInteraction();
    setPetState((prev) => ({
      ...prev,
      energy: Math.min(MAX_STAT, prev.energy + 10),
    }));
    showNotification(t("notifications.breakOver"));
  };

  // Handle weather change - affects pet mood
  const handleWeatherChange = (weather: WeatherType) => {
    setCurrentWeather(weather);
    recordInteraction();
    if (weather === "rain") showNotification(t("notifications.cozyRain"));
    else if (weather === "snow") showNotification(t("notifications.soPretty"));
    else if (weather === "leaves") showNotification(t("notifications.autumnVibes"));
    else showNotification(t("notifications.warmSunshine"));
  };

  const emotion = getEmotion();
  const isEating = currentAction === "feed" || currentAction === "drink";
  const isSleeping = currentAction === "sleep";

  // Walk drift movement + rare vanish (inline DEMO)
  useEffect(() => {
    if (!isWalking || walkPaused) return;

    const placeRandom = () => {
      const el = walkAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spriteFootprint = 140; // loose bound; sprite can overflow for humor
      const maxX = Math.max(0, rect.width - spriteFootprint);
      const maxY = Math.max(0, rect.height - spriteFootprint);
      setWalkPos({ x: Math.random() * maxX, y: Math.random() * maxY });
    };

    placeRandom();
    const moveEveryMs = 7000;
    const moveInterval = setInterval(() => {
      if (Math.random() < 0.06 && !walkHidden) {
        setWalkHidden(true);
        setTimeout(() => setWalkHidden(false), 800 + Math.random() * 900);
      }
      placeRandom();
    }, moveEveryMs);

    return () => clearInterval(moveInterval);
  }, [isWalking, walkPaused, walkHidden]);

  useEffect(() => {
    if (!isWalking || walkPaused) return;
    if (walkSecondsLeft <= 0) return;
    const t = setInterval(() => setWalkSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isWalking, walkPaused, walkSecondsLeft]);

  useEffect(() => {
    if (!isWalking) return;
    if (walkSecondsLeft > 0) return;
    // walk complete
    setIsWalking(false);
    setIsPureJoy(true);
    setPetState((prev) => ({
      ...prev,
      happiness: Math.min(MAX_STAT, prev.happiness + 12),
      energy: Math.min(MAX_STAT, Math.max(0, prev.energy - 6)),
    }));
    showNotification(t("notifications.walkBack", { min: walkDurationMin, scene: t(`walkScene.${walkScene}`) }));
  }, [isWalking, walkSecondsLeft, walkDurationMin, walkScene, t]);

  // Get emotion display text
  const getEmotionDisplay = () => {
    if (isSleeping) return t("petWindow.sleeping");
    return t(`emotion.${emotion}`);
  };

  // Get emotion color for display
  const getEmotionColor = () => {
    switch (emotion) {
      case "joy": return "text-yellow-400";
      case "anger": return "text-red-400";
      case "sorrow": return "text-blue-400";
      default: return "text-muted-foreground";
    }
  };

  const spriteSize = Math.round(SOOT_BASE_SIZE * getSizeMultiplier(age));
  const isOverflowing = spriteSize > 200;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm mx-auto"
      >
        <Card className={`border-2 border-border/50 shadow-2xl bg-card/95 backdrop-blur ${isOverflowing ? "overflow-visible" : "overflow-hidden"}`}>
          {/* Window Title Bar */}
          <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t("petWindow.windowTitle")}</span>
              <span className="text-xs font-normal text-muted-foreground">v{APP_VERSION}</span>
            </div>
            <div className="relative flex items-center gap-1" ref={settingsMenuRef}>
              {typeof window !== "undefined" && window.self !== window.top && (
                <button
                  type="button"
                  className="px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-primary/20 hover:text-primary text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    try { window.parent.postMessage({ type: "OPEN_COMPANION" }, "*"); } catch (_) {}
                  }}
                  title={t("petWindow.widgetTitle")}
                >
                  {t("petWindow.widget")}
                </button>
              )}
              <button
                type="button"
                className={`p-1 rounded transition-colors ${showSettingsMenu ? "bg-primary/20 text-primary" : "hover:bg-muted text-muted-foreground"}`}
                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu((v) => !v); }}
                title="Settings"
              >
                <Settings className="w-3 h-3" />
              </button>
              {showSettingsMenu && (
                <div className="absolute top-full right-0 mt-1 py-1 min-w-[160px] bg-card border border-border rounded-lg shadow-lg z-50 flex flex-col">
                  <div className="px-3 py-2 border-b border-border/50 text-[10px] font-medium text-muted-foreground uppercase">Settings</div>
                  <div className="px-3 py-2 text-sm hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                    <ThemeToggle labelWhenDark={t("petWindow.darkMode")} labelWhenLight={t("petWindow.lightMode")} />
                  </div>
                  <button type="button" className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted rounded-none" onClick={() => { setIsCustomizerOpen(true); setShowSettingsMenu(false); }}>
                    <Shirt className="w-4 h-4 text-muted-foreground" />
                    <span>{t("petWindow.appearanceLabel")}</span>
                  </button>
                  <button type="button" className={`flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted rounded-none ${showFloatingWidget ? "text-primary" : ""}`} onClick={() => { const next = !showFloatingWidget; setShowFloatingWidget(next); saveWidgetVisible(next); setShowSettingsMenu(false); }}>
                    <LayoutGrid className="w-4 h-4" />
                    <span>{t("petWindow.widget")}</span>
                  </button>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                    <LanguageToggle />
                  </div>
                </div>
              )}
              <WhiteNoiseControl alignDropdownRight />
            </div>
          </div>

          {/* Character Info Header */}
          <div className="bg-secondary/30 px-4 py-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                      className="h-7 w-32 text-sm bg-background/50"
                      maxLength={12}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleNameSave}
                      className="p-1 hover:bg-primary/20 rounded transition-colors"
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">{petName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(petName);
                        setIsEditingName(true);
                      }}
                      className="p-1 hover:bg-muted rounded transition-colors opacity-60 hover:opacity-100"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{t("petWindow.age")}</span>
                  <div className="text-sm font-medium text-foreground">{age}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{t("petWindow.mood")}</span>
                  <div className={`text-sm font-medium ${getEmotionColor()}`}>
                    {getEmotionDisplay()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="space-y-4 px-4 py-4">

            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  className="absolute top-36 left-1/2 -translate-x-1/2 z-30"
                >
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    {notification}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Walk status (inline) */}
            {isWalking && (
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-muted-foreground">
                  {t("petWindow.walking")}: <span className="text-foreground">{t(`walkScene.${walkScene}`)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums text-primary">{formatTime(walkSecondsLeft)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 bg-transparent"
                    onClick={() => setIsWalking(false)}
                  >
                    {t("petWindow.stop")}
                  </Button>
                </div>
              </div>
            )}

            {/* Sprite Container with Weather / Walk scene */}
            <div 
              ref={walkAreaRef}
              className={`relative flex justify-center items-center py-2 rounded-xl ${
                isOverflowing ? "overflow-visible min-h-[250px]" : "overflow-hidden min-h-[180px]"
              } ${isWalking ? getWalkSceneBg(walkScene) : ""}`}
            >
              {/* Weather Effects Layer (disabled during walking) */}
              {!isWalking && <WeatherEffects weather={currentWeather} />}

              {/* Background ambience based on emotion */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-40 h-40 rounded-full"
                  style={{
                    background: emotion === "anger" 
                      ? "radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)"
                      : emotion === "joy"
                      ? "radial-gradient(circle, rgba(255,214,57,0.25) 0%, transparent 70%)"
                      : emotion === "sorrow"
                      ? "radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)"
                      : showGreeting
                      ? "radial-gradient(circle, rgba(244,114,182,0.25) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(200,180,100,0.08) 0%, transparent 70%)"
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: emotion === "joy" ? 1.5 : 4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              </div>

              {/* Sleeping indicator */}
              {isSleeping && (
                <motion.div
                  className="absolute top-4 right-12 text-2xl z-10"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  zzZ
                </motion.div>
              )}

              {/* Falling food/drink/play ball — play: random position, falls with bounce; food/drink: straight drop */}
              <AnimatePresence>
                {fallingItem && !isWalking && (
                  <motion.div
                    key={fallingItem.key}
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: fallingItem.dropXPercent != null ? `${fallingItem.dropXPercent}%` : "50%",
                      x: "-50%",
                      top: 0,
                    }}
                    initial={{ y: -20, opacity: 1 }}
                    animate={
                      fallingItem.type === "play"
                        ? { y: [-20, 72, 48, 66, 58, 64], opacity: 1 }
                        : { y: 70, opacity: 1 }
                    }
                    exit={{ opacity: 0 }}
                    transition={
                      fallingItem.type === "play"
                        ? { duration: 0.9, ease: [0.33, 1, 0.68, 1] }
                        : { duration: 0.6, ease: "easeIn" }
                    }
                  >
                    <span className="text-3xl drop-shadow-md">{fallingItem.emoji}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className={isWalking ? "absolute" : "relative"}
                animate={
                  isWalking
                    ? { x: walkPos.x, y: walkPos.y }
                    : runToTarget
                      ? { x: runToTarget.x, y: runToTarget.y }
                      : { x: 0, y: 0 }
                }
                transition={
                  isWalking
                    ? { duration: 7.5, ease: "easeInOut" }
                    : runToTarget
                      ? { duration: 0.35, ease: "easeOut" }
                      : { duration: 0.25 }
                }
              >
                <AnimatePresence>
                  {(!isWalking || !walkHidden) && (
                    <motion.div
                      key={walkHidden ? "hidden" : "shown"}
                      className="origin-center"
                      initial={{ opacity: 0 }}
                      animate={
                        currentAction === "play"
                          ? { opacity: 1, y: [0, -18, 0] }
                          : { opacity: 1, y: 0 }
                      }
                      exit={{ opacity: 0 }}
                      transition={
                        currentAction === "play"
                          ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.25 }
                      }
                    >
                      <SootSprite
                        key={sootyKey}
                        emotion={isWalking ? "neutral" : isSleeping ? "neutral" : emotion}
                        currentAction={isWalking ? null : (currentAction as ActionType)}
                        isEating={isWalking ? false : isEating}
                        isSleeping={isWalking ? false : isSleeping}
                        onClick={handleSpriteClick}
                        age={embedMode ? 1 : age}
                        tapCount={tapTimes.length}
                        showGreeting={showGreeting}
                        appearance={appearance}
                        mouthDown={emotion === "anger" || emotion === "sorrow" || (emotion === "neutral" && (petState.hunger < 30 || petState.thirst < 30 || petState.energy < 30))}
                        maxSizeScale={maxSizeScale}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Overflow warning - humorous effect */}
              {isOverflowing && (
                <motion.div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {t("petWindow.gettingBig", { name: petName })}
                </motion.div>
              )}
            </div>

            {/* Stats - Compact 2x2 Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <StatBar
                label={t("petWindow.hunger")}
                value={petState.hunger}
                maxValue={MAX_STAT}
                color="primary"
                icon={<Cookie className="w-3 h-3" />}
              />
              <StatBar
                label={t("petWindow.thirst")}
                value={petState.thirst}
                maxValue={MAX_STAT}
                color="chart-3"
                icon={<Droplets className="w-3 h-3" />}
              />
              <StatBar
                label={t("petWindow.happiness")}
                value={petState.happiness}
                maxValue={MAX_STAT}
                color="accent"
                icon={<Heart className="w-3 h-3" />}
              />
              <StatBar
                label={t("petWindow.energy")}
                value={petState.energy}
                maxValue={MAX_STAT}
                color="chart-4"
                icon={<Zap className="w-3 h-3" />}
              />
            </div>

            {/* Unified Action Panel */}
            <div className="pt-2">
              <ActionPanel
                onAction={handleAction}
                currentEnergy={petState.energy}
                disabled={isPerformingAction}
                onBreathingStart={() => setIsBreathingOpen(true)}
                currentWeather={currentWeather}
                onWeatherChange={handleWeatherChange}
                onPomodoroStart={() => setIsPomodoroOpen(true)}
              />
            </div>

            {/* Tips */}
            <div className="text-center text-[10px] text-muted-foreground pt-1">
              {t("petWindow.tip", { name: petName })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breathing Exercise Modal */}
      <BreathingExercise
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
        onComplete={handleBreathingComplete}
        petName={petName}
      />

      {/* Pomodoro Timer Modal */}
      <PomodoroTimer
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        onWorkComplete={handleWorkComplete}
        onBreakComplete={handleBreakComplete}
        petName={petName}
        appearance={appearance}
      />

      {/* Replace/customize Sooty (DEMO) */}
      <SootCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        initial={appearance}
        onConfirm={(next) => {
          const ok = window.confirm(t("petWindow.confirmReplace"));
          if (!ok) return;
          setAppearance(next);
          setSootyKey((k) => k + 1);
          setAge(1);
          setPetState({ hunger: 80, thirst: 85, happiness: 90, energy: 95 });
          setCurrentAction(null);
          setIsPerformingAction(false);
          setWasWokenUp(false);
          setIsOverTapped(false);
          setIsPureJoy(false);
          setTapTimes([]);
          recordInteraction();
          showNotification(t("petWindow.meetNew"));
          setIsCustomizerOpen(false);
        }}
      />

      {/* Floating widget: 僅在「單獨開主站分頁」時顯示；在擴充 popup（iframe）內不顯示，改由「陪伴模式」按鈕關閉 popup 並在目前分頁顯示 */}
      <AnimatePresence>
        {showFloatingWidget && !embedMode && typeof window !== "undefined" && window.self === window.top && (
          <FloatingWidget
            age={age}
            appearance={appearance}
            emotion={emotion}
            onClose={() => {
              setShowFloatingWidget(false);
              saveWidgetVisible(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
