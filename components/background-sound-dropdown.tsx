"use client";

import { useState, useRef, useEffect } from "react";
import { useBackgroundSound } from "@/components/background-sound-context";
import { BackgroundSoundIcon } from "@/components/background-sound-icon";
import { useLanguage } from "@/components/language-context";
import { ChevronDown } from "lucide-react";
import type { BackgroundSoundType } from "@/components/background-sound-context";

const SOUND_OPTIONS: BackgroundSoundType[] = ["none", "tick", "rain", "fire"];

export function BackgroundSoundDropdown() {
  const { t } = useLanguage();
  const { type, setType } = useBackgroundSound();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMenu]);

  const getLabel = (soundType: BackgroundSoundType): string => {
    if (soundType === "none") return t("pomodoro.none");
    return t(`pomodoro.${soundType}`);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu((v) => !v);
        }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-sm ${
          type !== "none"
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "hover:bg-muted text-muted-foreground"
        }`}
        title={t("pomodoro.backgroundSound")}
      >
        <BackgroundSoundIcon type={type} className="w-3.5 h-3.5" />
        <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? "rotate-180" : ""}`} />
      </button>
      {showMenu && (
        <div
          className="absolute top-full left-0 mt-1 py-1 min-w-[120px] bg-card border border-border rounded-lg shadow-lg z-50 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setType(opt);
                setShowMenu(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${
                type === opt ? "bg-primary/10 text-primary" : "text-foreground"
              }`}
            >
              <BackgroundSoundIcon type={opt} className="w-3.5 h-3.5" />
              <span>{getLabel(opt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
