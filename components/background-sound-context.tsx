"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BackgroundSoundManager } from "@/lib/audio-utils";

export type BackgroundSoundType = "tick" | "fire" | "rain" | "none";

const STORAGE_KEY = "sooty-background-sound";
const DEFAULT_VOLUME = 0.9;

function loadStored(): { type: BackgroundSoundType; volume: number } {
  if (typeof window === "undefined") return { type: "none", volume: DEFAULT_VOLUME };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { type: "none", volume: DEFAULT_VOLUME };
    const data = JSON.parse(raw) as { type?: string; volume?: number };
    const type =
      data.type === "tick" || data.type === "fire" || data.type === "rain" ? data.type : "none";
    const volume =
      typeof data.volume === "number" ? Math.max(0, Math.min(1, data.volume)) : DEFAULT_VOLUME;
    return { type, volume };
  } catch {
    return { type: "none", volume: DEFAULT_VOLUME };
  }
}

function saveStored(type: BackgroundSoundType, volume: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, volume }));
  } catch {}
}

interface BackgroundSoundContextValue {
  type: BackgroundSoundType;
  volume: number;
  setType: (type: BackgroundSoundType) => void;
  cycleType: () => void;
  setVolume: (volume: number) => void;
  isPomodoroPlaying: boolean;
  setPomodoroPlaying: (playing: boolean) => void;
}

const BackgroundSoundContext = createContext<BackgroundSoundContextValue | null>(null);

export function BackgroundSoundProvider({ children }: { children: React.ReactNode }) {
  const [type, setTypeState] = useState<BackgroundSoundType>("none");
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [mounted, setMounted] = useState(false);
  const [isPomodoroPlaying, setPomodoroPlaying] = useState(false);
  const soundManagerRef = useRef<BackgroundSoundManager | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const setType = useCallback((next: BackgroundSoundType) => {
    setTypeState(next);
  }, []);

  const cycleType = useCallback(() => {
    setTypeState((prev) => {
      const next: BackgroundSoundType =
        prev === "none" ? "tick" : prev === "tick" ? "rain" : prev === "rain" ? "fire" : "none";
      saveStored(next, volume);
      return next;
    });
  }, [volume]);

  useEffect(() => {
    setMounted(true);
    const stored = loadStored();
    setTypeState("none");
    setVolume(stored.volume);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!soundManagerRef.current && audioContextRef.current) {
      soundManagerRef.current = new BackgroundSoundManager(audioContextRef.current);
    }
    const manager = soundManagerRef.current;
    if (!manager) return;

    const setup = async () => {
      const candidates: Array<["tick" | "fire" | "rain", string]> = [
        ["tick", "/sounds/tick.mp3"],
        ["fire", "/sounds/fire.mp3"],
        ["rain", "/sounds/rain.mp3"],
      ];
      for (const [soundType, path] of candidates) {
        try {
          const res = await fetch(path, { method: "HEAD" });
          if (res.ok) manager.setCustomSound(soundType, path);
        } catch {}
      }
    };
    setup();

    return () => {
      manager.stop();
    };
  }, [mounted]);

  // Play when type !== "none". Resume AudioContext on first interaction to avoid loud burst.
  useEffect(() => {
    if (!mounted || !soundManagerRef.current || !audioContextRef.current) return;
    if (type !== "none") {
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          soundManagerRef.current?.start(type, volume);
        }).catch(() => {
          soundManagerRef.current?.start(type, volume);
        });
      } else {
        soundManagerRef.current.start(type, volume);
      }
    } else {
      soundManagerRef.current.stop();
    }
  }, [mounted, type, volume]);

  useEffect(() => {
    if (!mounted) return;
    saveStored(type, volume);
  }, [mounted, type, volume]);

  const value: BackgroundSoundContextValue = {
    type,
    volume,
    setType,
    cycleType,
    setVolume,
    isPomodoroPlaying,
    setPomodoroPlaying,
  };

  return (
    <BackgroundSoundContext.Provider value={value}>
      {children}
    </BackgroundSoundContext.Provider>
  );
}

export function useBackgroundSound() {
  const ctx = useContext(BackgroundSoundContext);
  if (!ctx) throw new Error("useBackgroundSound must be used within BackgroundSoundProvider");
  return ctx;
}
