"use client";

import { Music, Clock, CloudRain, Flame } from "lucide-react";
import type { BackgroundSoundType } from "@/components/background-sound-context";

interface BackgroundSoundIconProps {
  type: BackgroundSoundType;
  className?: string;
}

const ICON_MAP = {
  none: Music,
  tick: Clock,
  rain: CloudRain,
  fire: Flame,
} as const;

export function BackgroundSoundIcon({ type, className = "w-3 h-3" }: BackgroundSoundIconProps) {
  const Icon = ICON_MAP[type];
  return <Icon className={className} />;
}
