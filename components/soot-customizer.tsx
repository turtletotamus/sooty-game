"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SootAppearance, SootShape } from "@/components/soot-sprite";
import { useLanguage } from "@/components/language-context";

const SHAPE_IDS: SootShape[] = ["circle", "square", "star", "triangle", "heart"];

const COLORS = [
  "#E54B4B",
  "#E88565",
  "#FDF06F",
  "#00B28B",
  "#3E4668",
  "#5C457B",
  "#CDCDD0",
  "#000000",
];

export interface SootCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  initial: SootAppearance;
  onConfirm: (next: SootAppearance) => void;
}

export function SootCustomizer({ isOpen, onClose, initial, onConfirm }: SootCustomizerProps) {
  const { t } = useLanguage();
  const [shape, setShape] = useState<SootShape>(initial.shape);
  const [color, setColor] = useState<string>(initial.color);

  // When opening, reset to initial
  useEffect(() => {
    if (isOpen) {
      setShape(initial.shape);
      setColor(initial.color);
    }
  }, [isOpen, initial.shape, initial.color, setShape, setColor]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-sm mx-4 bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
            aria-label="Close customizer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="p-6 pt-8 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-lg font-semibold text-foreground">{t("customizer.title")}</div>
              <div className="text-xs text-muted-foreground">
                {t("customizer.subtitle")}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">{t("customizer.shape")}</div>
              <div className="grid grid-cols-5 gap-2">
                {SHAPE_IDS.map((s) => (
                  <Button
                    key={s}
                    variant={shape === s ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-[10px] ${shape === s ? "bg-primary" : "bg-transparent"}`}
                    onClick={() => setShape(s)}
                  >
                    {t(`shapes.${s}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">{t("customizer.color")}</div>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-full border ${color === c ? "border-primary ring-2 ring-primary/30" : "border-border/60"} ${["#CDCDD0", "#000000"].includes(c) ? "border-border" : ""}`}
                    style={{ background: c }}
                    aria-label={`Pick ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-7 bg-transparent border border-border/60 rounded"
                  aria-label="Pick custom color"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
                {t("customizer.cancel")}
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => onConfirm({ shape, color })}
              >
                {t("customizer.confirm")}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

