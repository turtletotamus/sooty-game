"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { SootSprite, type EmotionType } from "@/components/soot-sprite";
import type { SootAppearance } from "@/components/soot-sprite";
import { X } from "lucide-react";

const WIDGET_POSITION_KEY = "sooty-widget-position";
const DEFAULT_RIGHT = 24;
const DEFAULT_BOTTOM = 24;
const SLEEP_IDLE_TIME = 30000; // 30 seconds of inactivity = sleep
const WIDGET_SIZE = 40; // ~40% of previous (98), very small

function loadPosition(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  try {
    const raw = localStorage.getItem(WIDGET_POSITION_KEY);
    if (!raw) {
      return { x: window.innerWidth - WIDGET_SIZE - DEFAULT_RIGHT, y: window.innerHeight - WIDGET_SIZE - DEFAULT_BOTTOM };
    }
    const data = JSON.parse(raw) as { x?: number; y?: number };
    const x = typeof data.x === "number" ? data.x : window.innerWidth - WIDGET_SIZE - DEFAULT_RIGHT;
    const y = typeof data.y === "number" ? data.y : window.innerHeight - WIDGET_SIZE - DEFAULT_BOTTOM;
    return {
      x: Math.max(0, Math.min(window.innerWidth - WIDGET_SIZE, x)),
      y: Math.max(0, Math.min(window.innerHeight - WIDGET_SIZE, y)),
    };
  } catch {
    return { x: window.innerWidth - WIDGET_SIZE - DEFAULT_RIGHT, y: window.innerHeight - WIDGET_SIZE - DEFAULT_BOTTOM };
  }
}

function savePosition(x: number, y: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify({ x, y }));
  } catch {
    // ignore
  }
}

interface FloatingWidgetProps {
  age: number;
  appearance: SootAppearance;
  emotion: EmotionType;
  onClose: () => void;
}

export function FloatingWidget({ age, appearance, emotion, onClose }: FloatingWidgetProps) {
  const [position, setPosition] = useState(() => loadPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const lastInteractionRef = useRef<number>(Date.now());
  const jumpControls = useAnimation();
  const breathingControls = useAnimation();

  // Handle window resize to keep widget in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(0, Math.min(window.innerWidth - WIDGET_SIZE, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight - WIDGET_SIZE, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sleep detection: if idle for SLEEP_IDLE_TIME, go to sleep
  useEffect(() => {
    const checkSleep = () => {
      const now = Date.now();
      const idleTime = now - lastInteractionRef.current;
      setIsSleeping(idleTime > SLEEP_IDLE_TIME);
    };
    const interval = setInterval(checkSleep, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update breathing animation based on sleep state
  useEffect(() => {
    if (isSleeping) {
      // Slower breathing when sleeping
      breathingControls.start({
        scale: [1, 1.02, 1],
        transition: {
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        },
      });
    } else {
      // Normal breathing
      breathingControls.start({
        scale: [1, 1.04, 1],
        transition: {
          duration: 2.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        },
      });
    }
  }, [isSleeping, breathingControls]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const deltaX = e.clientX - start.clientX;
      const deltaY = e.clientY - start.clientY;
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) hasMovedRef.current = true;
      
      const newX = start.x + deltaX;
      const newY = start.y + deltaY;
      
      // Allow dragging anywhere, but keep within viewport bounds
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - WIDGET_SIZE, newX)),
        y: Math.max(0, Math.min(window.innerHeight - WIDGET_SIZE, newY)),
      });
    };
    const onUp = () => {
      const start = dragStartRef.current;
      if (start && !hasMovedRef.current) {
        // Click without drag: wake up if sleeping, or jump
        if (isSleeping) {
          setIsSleeping(false);
          lastInteractionRef.current = Date.now();
        } else {
          jumpControls.start({ 
            y: [0, -24, 0], 
            transition: { duration: 0.4, ease: "easeOut" } 
          });
        }
        lastInteractionRef.current = Date.now();
      }
      dragStartRef.current = null;
      hasMovedRef.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPosition((p) => {
        savePosition(p.x, p.y);
        return p;
      });
      lastInteractionRef.current = Date.now();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, jumpControls, isSleeping]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    hasMovedRef.current = false;
    lastInteractionRef.current = Date.now();
    if (isSleeping) {
      setIsSleeping(false);
    }
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: position.x,
      y: position.y,
    };
    setIsDragging(true);
  }, [position, isSleeping]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[100] select-none"
      style={{
        left: position.x,
        top: position.y,
        width: WIDGET_SIZE,
        height: WIDGET_SIZE,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Scale content to fit small widget (~40% of previous size) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={breathingControls}
        style={{ transform: "scale(0.4)" }}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={jumpControls}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <SootSprite
            emotion={isSleeping ? "neutral" : emotion}
            currentAction={null}
            isEating={false}
            isSleeping={isSleeping}
            onClick={() => {
              if (isSleeping) {
                setIsSleeping(false);
                lastInteractionRef.current = Date.now();
              }
            }}
            age={1}
            appearance={appearance}
          />
        </motion.div>
      </motion.div>

      {/* Close button: positioned at bottom-right corner to avoid blocking sprite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-muted/90 hover:bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground shadow z-10"
        aria-label="Close widget"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  );
}
