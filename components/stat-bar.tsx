"use client";

import React from "react"

import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: "primary" | "accent" | "chart-3" | "chart-4";
  icon: React.ReactNode;
}

export function StatBar({ label, value, maxValue, color, icon }: StatBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const getColorClass = () => {
    switch (color) {
      case "primary":
        return "bg-primary";
      case "accent":
        return "bg-accent";
      case "chart-3":
        return "bg-chart-3";
      case "chart-4":
        return "bg-chart-4";
      default:
        return "bg-primary";
    }
  };

  const getLowWarning = () => {
    return percentage < 25;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <motion.span
          className={`text-xs tabular-nums ${getLowWarning() ? "text-destructive" : "text-muted-foreground"}`}
          animate={getLowWarning() ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: getLowWarning() ? Number.POSITIVE_INFINITY : 0 }}
        >
          {Math.round(value)}/{maxValue}
        </motion.span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColorClass()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
