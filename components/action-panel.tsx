"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { WeatherType } from "@/components/weather-effects";
import { Utensils, Droplets, Moon, Gamepad2, Footprints, Heart, Sun, CloudRain, Snowflake, Leaf, Wind, Timer } from "lucide-react";
import { useLanguage } from "@/components/language-context";

export interface ActionItem {
  id: string;
  name: string;
  messageKey: string;
  icon: React.ReactNode;
  type: "feed" | "drink" | "activity";
  hungerGain: number;
  thirstGain: number;
  happinessGain: number;
  energyCost: number;
  energyGain: number;
  duration: number;
  message: string;
}

const actions: ActionItem[] = [
  {
    id: "feed",
    name: "Feed",
    messageKey: "yum",
    icon: <Utensils className="w-5 h-5" />,
    type: "feed",
    hungerGain: 25,
    thirstGain: 0,
    happinessGain: 10,
    energyCost: 0,
    energyGain: 0,
    duration: 1500,
    message: "Yum yum!",
  },
  {
    id: "drink",
    name: "Drink",
    messageKey: "refreshing",
    icon: <Droplets className="w-5 h-5" />,
    type: "drink",
    hungerGain: 0,
    thirstGain: 30,
    happinessGain: 5,
    energyCost: 0,
    energyGain: 0,
    duration: 1200,
    message: "Refreshing!",
  },
  {
    id: "sleep",
    name: "Sleep",
    messageKey: "zzz",
    icon: <Moon className="w-5 h-5" />,
    type: "activity",
    hungerGain: 0,
    thirstGain: 0,
    happinessGain: 5,
    energyCost: 0,
    energyGain: 40,
    duration: 4000,
    message: "Zzz...",
  },
  {
    id: "play",
    name: "Play",
    messageKey: "soFun",
    icon: <Gamepad2 className="w-5 h-5" />,
    type: "activity",
    hungerGain: 0,
    thirstGain: 0,
    happinessGain: 25,
    energyCost: 15,
    energyGain: 0,
    duration: 2500,
    message: "So fun!",
  },
  {
    id: "walk",
    name: "Walk",
    messageKey: "walkTime",
    icon: <Footprints className="w-5 h-5" />,
    type: "activity",
    hungerGain: 0,
    thirstGain: 0,
    happinessGain: 0,
    energyCost: 0,
    energyGain: 0,
    duration: 0,
    message: "Walk time!",
  },
  {
    id: "love",
    name: "Love",
    messageKey: "lovesYou",
    icon: <Heart className="w-5 h-5" />,
    type: "activity",
    hungerGain: 0,
    thirstGain: 0,
    happinessGain: 30,
    energyCost: 10,
    energyGain: 0,
    duration: 2000,
    message: "Loves you!",
  },
];

const weatherTypes: WeatherType[] = ["sunny", "rain", "snow", "leaves"];
const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4" />,
  rain: <CloudRain className="w-4 h-4" />,
  snow: <Snowflake className="w-4 h-4" />,
  leaves: <Leaf className="w-4 h-4" />,
};

interface ActionPanelProps {
  onAction: (action: ActionItem) => void;
  currentEnergy: number;
  disabled: boolean;
  onBreathingStart: () => void;
  currentWeather: WeatherType;
  onWeatherChange: (weather: WeatherType) => void;
  onPomodoroStart: () => void;
}

export function ActionPanel({ 
  onAction, 
  currentEnergy, 
  disabled, 
  onBreathingStart,
  currentWeather,
  onWeatherChange,
  onPomodoroStart
}: ActionPanelProps) {
  const { t } = useLanguage();
  const weatherOptions = weatherTypes.map((type) => ({
    type,
    icon: weatherIcons[type],
    label: t(`weather.${type === "leaves" ? "autumn" : type}`),
  }));

  return (
    <div className="space-y-3">
      {/* Main actions */}
      <div className="grid grid-cols-6 gap-2">
        {actions.map((action, index) => {
          const canAfford = action.energyCost <= 0 || currentEnergy >= action.energyCost;

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant="ghost"
                className="w-full h-auto flex flex-col gap-1 p-2 hover:bg-secondary/60 transition-all disabled:opacity-40 rounded-xl"
                onClick={() => onAction(action)}
                disabled={disabled || !canAfford}
              >
                <motion.span
                  className="text-foreground"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {action.icon}
                </motion.span>
                <span className="text-[10px] font-medium text-muted-foreground">{t(`actions.${action.id}`)}</span>
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Wellness and Weather row */}
      <div className="flex items-center justify-between gap-2">
        {/* Breathing exercise and Pomodoro buttons */}
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-foreground hover:text-black dark:hover:text-foreground"
              onClick={onBreathingStart}
              disabled={disabled}
            >
              <Wind className="w-4 h-4" />
              <span className="text-xs">{t("actions.breathe")}</span>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-foreground hover:text-black dark:hover:text-foreground"
              onClick={onPomodoroStart}
              disabled={disabled}
            >
              <Timer className="w-4 h-4" />
              <span className="text-xs">{t("actions.timer")}</span>
            </Button>
          </motion.div>
        </div>

        {/* Weather selector */}
        <div className="flex items-center gap-1">
          {weatherOptions.map((weather, index) => (
            <motion.div
              key={weather.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 + index * 0.05 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`w-8 h-8 min-w-8 min-h-8 p-0 rounded-lg transition-all shrink-0 ${
                  currentWeather === weather.type 
                    ? "bg-primary/15 text-primary ring-2 ring-primary/70 ring-inset shadow-sm" 
                    : "hover:bg-secondary/50 text-muted-foreground border border-transparent"
                }`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWeatherChange(weather.type); }}
                title={weather.label}
              >
                {weather.icon}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
