"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Wind } from "lucide-react";
import { useLanguage } from "@/components/language-context";

interface BreathingExerciseProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  petName: string;
}

type BreathPhase = "inhale" | "hold" | "exhale" | "rest";

const BREATH_CYCLE = {
  inhale: { duration: 4, next: "hold" as BreathPhase, label: "Breathe In" },
  hold: { duration: 4, next: "exhale" as BreathPhase, label: "Hold" },
  exhale: { duration: 6, next: "rest" as BreathPhase, label: "Breathe Out" },
  rest: { duration: 2, next: "inhale" as BreathPhase, label: "Rest" },
};

const TOTAL_CYCLES = 3;

const phaseLabelKey: Record<BreathPhase, string> = {
  inhale: "breatheIn",
  hold: "hold",
  exhale: "breatheOut",
  rest: "rest",
};

export function BreathingExercise({ isOpen, onClose, onComplete, petName }: BreathingExerciseProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [countdown, setCountdown] = useState(BREATH_CYCLE.inhale.duration);
  const [cycleCount, setCycleCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [preCountdown, setPreCountdown] = useState<number | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setPhase("inhale");
      setCountdown(BREATH_CYCLE.inhale.duration);
      setCycleCount(0);
      setIsActive(false);
      setShowIntro(true);
      setPreCountdown(null);
    }
  }, [isOpen]);

  // 3-second countdown before breathing starts
  useEffect(() => {
    if (preCountdown === null || !isOpen) return;
    if (preCountdown <= 0) {
      setPreCountdown(null);
      setIsActive(true);
      return;
    }
    const t = setTimeout(() => setPreCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [preCountdown, isOpen]);

  // Breathing timer logic
  useEffect(() => {
    if (!isActive || !isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Move to next phase
          const currentConfig = BREATH_CYCLE[phase];
          const nextPhase = currentConfig.next;

          // Check if we completed a full cycle (after exhale)
          if (phase === "exhale") {
            const newCycleCount = cycleCount + 1;
            if (newCycleCount >= TOTAL_CYCLES) {
              setIsActive(false);
              setTimeout(() => {
                onComplete();
                onClose();
              }, 1500);
              return 0;
            }
            setCycleCount(newCycleCount);
          }

          setPhase(nextPhase);
          return BREATH_CYCLE[nextPhase].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isOpen, phase, cycleCount, onComplete, onClose]);

  const startExercise = useCallback(() => {
    setShowIntro(false);
    setPreCountdown(3);
  }, []);

  // Get the scale for the breathing circle based on phase
  const getCircleScale = () => {
    switch (phase) {
      case "inhale":
        return 1.4;
      case "hold":
        return 1.4;
      case "exhale":
        return 1;
      case "rest":
        return 1;
      default:
        return 1;
    }
  };

  // Get color based on phase
  const getPhaseColor = () => {
    switch (phase) {
      case "inhale":
        return "from-sky-400/40 to-teal-400/40";
      case "hold":
        return "from-violet-400/40 to-indigo-400/40";
      case "exhale":
        return "from-amber-400/40 to-orange-400/40";
      case "rest":
        return "from-emerald-400/40 to-green-400/40";
      default:
        return "from-sky-400/40 to-teal-400/40";
    }
  };

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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm mx-4 bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="p-6 pt-8">
            {/* Intro screen */}
            {showIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <Wind className="w-10 h-10 mx-auto text-primary/70" />
                  <h2 className="text-xl font-semibold text-foreground">{t("breathing.title", { name: petName })}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("breathing.intro")}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="text-muted-foreground/70">{t("breathing.cycles", { n: TOTAL_CYCLES })}</p>
                </div>

                <Button
                  onClick={startExercise}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {t("breathing.start")}
                </Button>
              </motion.div>
            )}

            {/* Active breathing exercise */}
            {!showIntro && (
              <div className="space-y-6">
                {/* 3-second prep countdown */}
                {preCountdown !== null && preCountdown > 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">{t("breathing.getReady")}</p>
                    <motion.div
                      key={preCountdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-7xl font-light text-primary tabular-nums"
                    >
                      {preCountdown}
                    </motion.div>
                  </div>
                ) : (
                  <>
                {/* Cycle indicator */}
                <div className="flex justify-center gap-2">
                  {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        i < cycleCount
                          ? "bg-primary"
                          : i === cycleCount && isActive
                            ? "bg-primary/50"
                            : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Breathing circle */}
                <div className="relative flex items-center justify-center h-48">
                  {/* Outer glow ring */}
                  <motion.div
                    className={`absolute w-36 h-36 rounded-full bg-gradient-to-br ${getPhaseColor()} blur-xl`}
                    animate={{
                      scale: isActive ? getCircleScale() : 1,
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      scale: { duration: BREATH_CYCLE[phase].duration, ease: "easeInOut" },
                      opacity: { duration: 2, repeat: Number.POSITIVE_INFINITY },
                    }}
                  />

                  {/* Main breathing circle */}
                  <motion.div
                    className="relative w-32 h-32 rounded-full bg-gradient-to-br from-card via-secondary to-muted border border-border/50 flex items-center justify-center shadow-lg"
                    animate={{
                      scale: isActive ? getCircleScale() : 1,
                    }}
                    transition={{
                      duration: BREATH_CYCLE[phase].duration,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Sooty breathing inside */}
                    <motion.div
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 relative"
                      animate={{
                        scale: isActive ? [1, getCircleScale() * 0.85, 1] : 1,
                      }}
                      transition={{
                        duration: BREATH_CYCLE[phase].duration,
                        ease: "easeInOut",
                      }}
                    >
                      {/* Eyes - change based on breathing */}
                      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex gap-2">
                        <motion.div
                          className="w-3 h-3 rounded-full bg-white"
                          animate={{
                            scaleY: phase === "exhale" || phase === "rest" ? 0.3 : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </motion.div>
                        <motion.div
                          className="w-3 h-3 rounded-full bg-white"
                          animate={{
                            scaleY: phase === "exhale" || phase === "rest" ? 0.3 : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </motion.div>
                      </div>
                      {/* Mouth - changes with breath */}
                      <motion.div
                        className="absolute top-[55%] left-1/2 -translate-x-1/2 bg-white/60 rounded-full"
                        animate={{
                          width: phase === "inhale" ? 8 : phase === "exhale" ? 6 : 4,
                          height: phase === "inhale" || phase === "exhale" ? 8 : 2,
                          borderRadius: phase === "inhale" || phase === "exhale" ? "50%" : "9999px",
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Floating particles during breathing */}
                  {isActive && phase === "exhale" && (
                    <>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1.5 h-1.5 rounded-full bg-primary/40"
                          initial={{ x: 0, y: 0, opacity: 0 }}
                          animate={{
                            x: (Math.random() - 0.5) * 80,
                            y: -30 - Math.random() * 40,
                            opacity: [0, 0.8, 0],
                            scale: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            delay: i * 0.2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* Phase label and countdown */}
                <div className="text-center space-y-2">
                  <motion.h3
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-medium text-foreground"
                  >
                    {t(`breathing.${phaseLabelKey[phase]}`)}
                  </motion.h3>
                  <div className="text-4xl font-light text-primary tabular-nums">
                    {countdown}
                  </div>
                </div>

                {/* Completion message */}
                {!isActive && cycleCount >= TOTAL_CYCLES && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {t("breathing.done", { name: petName })}
                  </motion.div>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
