"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings, ChevronUp, ChevronDown, X, Timer, Volume2, VolumeX } from "lucide-react";
import { SootSprite, type EmotionType } from "@/components/soot-sprite";
import type { SootAppearance } from "@/components/soot-sprite";
import { createAlarmSound } from "@/lib/audio-utils";
import { useLanguage } from "@/components/language-context";
import { BackgroundSoundDropdown } from "@/components/background-sound-dropdown";

type TimerMode = "work" | "break";

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkComplete: () => void;
  onBreakComplete: () => void;
  petName: string;
  appearance?: SootAppearance;
}

const DEFAULT_WORK_DURATION = 25; // 25 minutes
const DEFAULT_BREAK_DURATION = 5; // 5 minutes
const MIN_DURATION = 1;
const MAX_WORK_DURATION = 90;
const MAX_BREAK_DURATION = 30;

const CIRCLE_R = 45;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

function PieTimerDisplay({
  mode,
  workDuration,
  breakDuration,
  timeLeft,
  progress,
  formatTime,
  t,
}: {
  mode: TimerMode;
  workDuration: number;
  breakDuration: number;
  timeLeft: number;
  progress: number;
  formatTime: (s: number) => string;
  t: (key: string) => string;
}) {
  const totalMin = workDuration + breakDuration;
  const workLen = CIRCUMFERENCE * (workDuration / totalMin);
  const breakLen = CIRCUMFERENCE * (breakDuration / totalMin);
  const filledLen =
    mode === "work"
      ? (progress / 100) * workLen
      : workLen + (progress / 100) * breakLen;

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        {/* Background: work segment */}
        <circle
          cx="50"
          cy="50"
          r={CIRCLE_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-primary/25"
          strokeDasharray={`${workLen} ${CIRCUMFERENCE - workLen}`}
          strokeDashoffset={0}
        />
        {/* Background: break segment */}
        <circle
          cx="50"
          cy="50"
          r={CIRCLE_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-chart-3/25"
          strokeDasharray={`${breakLen} ${CIRCUMFERENCE - breakLen}`}
          strokeDashoffset={-workLen}
        />
        {/* Progress fill (current segment) */}
        <motion.circle
          cx="50"
          cy="50"
          r={CIRCLE_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className={mode === "work" ? "text-primary" : "text-chart-3"}
          strokeDasharray={`${filledLen} ${CIRCUMFERENCE}`}
          initial={false}
          animate={{ strokeDasharray: `${filledLen} ${CIRCUMFERENCE}` }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {formatTime(timeLeft)}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {mode === "work" ? t("pomodoro.focus") : t("pomodoro.break")}
        </span>
      </div>
    </div>
  );
}

export function PomodoroTimer({ 
  isOpen, 
  onClose, 
  onWorkComplete, 
  onBreakComplete, 
  petName,
  appearance,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>("work");
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK_DURATION);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_DURATION * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const { t } = useLanguage();
  
  // Audio: alarm only (background sound is global via context)
  const [alarmVolume, setAlarmVolume] = useState(0.5);
  const [alarmFilePath, setAlarmFilePath] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalTime = mode === "work" ? workDuration * 60 : breakDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Audio context for alarm only (background sound is in BackgroundSoundProvider)
  useEffect(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/sounds/alarm.mp3", { method: "HEAD" });
        if (res.ok) setAlarmFilePath("/sounds/alarm.mp3");
        else setAlarmFilePath(null);
      } catch {
        setAlarmFilePath(null);
      }
    };
    check();
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMode("work");
      setWorkDuration(DEFAULT_WORK_DURATION);
      setBreakDuration(DEFAULT_BREAK_DURATION);
      setTimeLeft(DEFAULT_WORK_DURATION * 60);
      setIsRunning(false);
      setShowSettings(false);
      setShowIntro(true);
    }
  }, [isOpen]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0 || !isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          
          // Play alarm sound
          if (alarmFilePath) {
            const audio = new Audio(alarmFilePath);
            audio.volume = alarmVolume;
            audio.play().catch(() => {
              if (audioContextRef.current) {
                const playAlarm = createAlarmSound(audioContextRef.current, "gentle", alarmVolume);
                playAlarm();
              }
            });
          } else if (audioContextRef.current) {
            const playAlarm = createAlarmSound(audioContextRef.current, "gentle", alarmVolume);
            playAlarm();
          }
          
          if (mode === "work") {
            onWorkComplete();
            setCompletedSessions((s) => s + 1);
            setMode("break");
            return breakDuration * 60;
          } else {
            onBreakComplete();
            setMode("work");
            return workDuration * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, workDuration, breakDuration, onWorkComplete, onBreakComplete, isOpen, alarmVolume, alarmFilePath]);

  const startTimer = () => {
    setShowIntro(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(newMode === "work" ? workDuration * 60 : breakDuration * 60);
    setIsRunning(false);
  };

  const adjustDuration = (type: "work" | "break", delta: number) => {
    if (isRunning) return;
    
    if (type === "work") {
      const newValue = Math.max(MIN_DURATION, Math.min(MAX_WORK_DURATION, workDuration + delta));
      setWorkDuration(newValue);
      if (mode === "work") {
        setTimeLeft(newValue * 60);
      }
    } else {
      const newValue = Math.max(MIN_DURATION, Math.min(MAX_BREAK_DURATION, breakDuration + delta));
      setBreakDuration(newValue);
      if (mode === "break") {
        setTimeLeft(newValue * 60);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get emotion based on timer state
  const getEmotion = (): EmotionType => {
    if (isRunning) {
      return mode === "work" ? "neutral" : "joy";
    }
    return "neutral";
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
          className="relative w-full max-w-md mx-4 bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Settings and Background Sound at top left */}
          {!showIntro && (
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <BackgroundSoundDropdown />
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-7 w-7"
                onClick={() => setShowSettings(!showSettings)}
                disabled={isRunning}
              >
                <Settings className={`w-3.5 h-3.5 transition-transform ${showSettings ? "rotate-90" : ""}`} />
              </Button>
            </div>
          )}

          <div className="p-6 pt-8">
            {/* Intro screen */}
            {showIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6"
              >
                <div className="space-y-2">
                  <Timer className="w-10 h-10 mx-auto text-primary/70" />
                  <h2 className="text-xl font-semibold text-foreground">{t("pomodoro.title", { name: petName })}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("pomodoro.intro", { name: petName })}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>{t("pomodoro.workBreak", { work: workDuration, break: breakDuration })}</p>
                  <p className="text-muted-foreground/70">{t("pomodoro.customize")}</p>
                </div>

                <Button
                  onClick={startTimer}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {t("pomodoro.start")}
                </Button>
              </motion.div>
            )}

            {/* Timer interface */}
            {!showIntro && (
              <div className="space-y-4">

                {/* Settings Panel */}
                <AnimatePresence>
                  {showSettings && !isRunning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-muted/30 rounded-lg p-3 mb-3 space-y-4">
                        {/* Timer Durations */}
                        <div className="space-y-3">
                          <div className="text-[10px] text-muted-foreground text-center mb-2">
                            {t("pomodoro.timerDurations")}
                          </div>
                          
                          {/* Work Duration */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Brain className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs text-foreground">{t("pomodoro.focus")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => adjustDuration("work", -5)}
                                disabled={workDuration <= MIN_DURATION}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium w-12 text-center tabular-nums">
                                {workDuration}m
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => adjustDuration("work", 5)}
                                disabled={workDuration >= MAX_WORK_DURATION}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Break Duration */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Coffee className="w-3.5 h-3.5 text-chart-3" />
                              <span className="text-xs text-foreground">{t("pomodoro.break")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => adjustDuration("break", -1)}
                                disabled={breakDuration <= MIN_DURATION}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium w-12 text-center tabular-nums">
                                {breakDuration}m
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => adjustDuration("break", 1)}
                                disabled={breakDuration >= MAX_BREAK_DURATION}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Preset Buttons */}
                          <div className="flex gap-1 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-[10px] h-6 bg-transparent"
                              onClick={() => {
                                setWorkDuration(25);
                                setBreakDuration(5);
                                setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
                              }}
                            >
                              25/5
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-[10px] h-6 bg-transparent"
                              onClick={() => {
                                setWorkDuration(50);
                                setBreakDuration(10);
                                setTimeLeft(mode === "work" ? 50 * 60 : 10 * 60);
                              }}
                            >
                              50/10
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-[10px] h-6 bg-transparent"
                              onClick={() => {
                                setWorkDuration(15);
                                setBreakDuration(3);
                                setTimeLeft(mode === "work" ? 15 * 60 : 3 * 60);
                              }}
                            >
                              15/3
                            </Button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border/30" />

                        {/* Alarm Sound Settings */}
                        <div className="space-y-2">
                          <div className="text-[10px] text-muted-foreground text-center">
                            {t("pomodoro.alarmSound")}
                          </div>
                          <div className="flex items-center gap-2">
                            <VolumeX className="w-3 h-3 text-muted-foreground" />
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={alarmVolume}
                              onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                            <Volume2 className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[10px] h-7"
                            onClick={() => {
                              if (alarmFilePath) {
                                const audio = new Audio(alarmFilePath);
                                audio.volume = alarmVolume;
                                audio.play().catch(() => {});
                              } else if (audioContextRef.current) {
                                const playAlarm = createAlarmSound(audioContextRef.current, "gentle", alarmVolume);
                                playAlarm();
                              }
                            }}
                          >
                            {t("pomodoro.testAlarm")} {alarmFilePath ? "(/sounds/alarm.mp3)" : "(synth)"}
                          </Button>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timer Display: Sooty (focus/break face) + Pie chart */}
                <div className="relative flex flex-col items-center py-4">
                  <div className="flex items-center gap-6 w-full justify-center">
                    {/* Sooty: focus face when work (calm), rest face when break */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <SootSprite
                        emotion={mode === "work" ? "neutral" : "neutral"}
                        currentAction={null}
                        isEating={false}
                        isSleeping={mode === "break"}
                        onClick={() => {}}
                        age={1}
                        tapCount={0}
                        showGreeting={false}
                        appearance={appearance}
                      />
                    </div>

                    {/* Pie chart: work + break by ratio, progress fills current segment */}
                    <PieTimerDisplay
                      mode={mode}
                      workDuration={workDuration}
                      breakDuration={breakDuration}
                      timeLeft={timeLeft}
                      progress={progress}
                      formatTime={formatTime}
                      t={t}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-10 h-10 p-0 bg-transparent"
                      onClick={resetTimer}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className={`w-24 gap-1.5 ${mode === "work" ? "bg-primary hover:bg-primary/90" : "bg-chart-3 hover:bg-chart-3/90"}`}
                      onClick={toggleTimer}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          {mode === "break" ? t("pomodoro.breakStart") : t("pomodoro.start")}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Pet Message */}
                  <AnimatePresence>
                    {isRunning && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-4 text-sm text-center text-muted-foreground"
                      >
                        {mode === "work" 
                          ? `${petName} is cheering you on!` 
                          : `${petName} says take a rest!`}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
