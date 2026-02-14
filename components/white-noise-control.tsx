"use client";

import { BackgroundSoundDropdown } from "@/components/background-sound-dropdown";

interface WhiteNoiseControlProps {
  alignDropdownRight?: boolean;
}

/** Background sound dropdown selector (same as Pomodoro). */
export function WhiteNoiseControl({ alignDropdownRight = true }: WhiteNoiseControlProps) {
  return <BackgroundSoundDropdown />;
}
