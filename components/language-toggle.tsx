"use client";

import { useLanguage } from "@/components/language-context";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-primary/30 bg-muted/30 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-xs ${
          locale === "en"
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-primary/20 hover:text-primary"
        }`}
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 px-2 text-xs ${
          locale === "zh-TW"
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-primary/20 hover:text-primary"
        }`}
        onClick={() => setLocale("zh-TW")}
      >
        繁中
      </Button>
    </div>
  );
}
