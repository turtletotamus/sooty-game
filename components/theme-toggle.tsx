"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

interface ThemeToggleProps {
  /** 若提供，整列（圖示+文字）都可點擊切換 */
  label?: React.ReactNode;
  /** 當前為深夜模式時顯示的文字（切換到白天後會變成 labelWhenLight） */
  labelWhenDark?: React.ReactNode;
  /** 當前為白天模式時顯示的文字 */
  labelWhenLight?: React.ReactNode;
}

export function ThemeToggle({ label, labelWhenDark, labelWhenLight }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggle = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const hasLabel = label != null || (labelWhenDark != null && labelWhenLight != null);
  const displayLabel = labelWhenDark != null && labelWhenLight != null
    ? (theme === "dark" ? labelWhenDark : labelWhenLight)
    : label;

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        hasLabel
          ? "flex items-center gap-2 w-full px-0 py-0 text-left text-sm hover:bg-muted rounded-none min-h-0"
          : "p-1 hover:bg-muted rounded transition-colors"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      <span className={hasLabel ? "w-4 flex justify-center flex-shrink-0" : ""}>
        {theme === "dark" ? (
          <Sun className="w-3 h-3 text-muted-foreground" />
        ) : (
          <Moon className="w-3 h-3 text-muted-foreground" />
        )}
      </span>
      {displayLabel != null && <span>{displayLabel}</span>}
    </button>
  );
}

