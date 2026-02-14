"use client";

import { motion, useAnimation, useSpring } from "framer-motion";
import { useEffect, useState, useRef, useCallback, useId } from "react";

export type EmotionType = "joy" | "anger" | "sorrow" | "neutral";
export type ActionType = "feed" | "drink" | "sleep" | "play" | "pet" | "love" | null;

export type SootShape = "circle" | "square" | "star" | "triangle" | "heart";
export interface SootAppearance {
  shape: SootShape;
  color: string; // hex like #2a2a2a
}

interface SootSpriteProps {
  emotion: EmotionType;
  currentAction: ActionType;
  isEating: boolean;
  isSleeping: boolean;
  onClick: () => void;
  age: number;
  tapCount?: number;
  showGreeting?: boolean;
  appearance?: SootAppearance;
  /** When true (e.g. hunger/thirst/energy < 30), mouth is drawn down */
  mouthDown?: boolean;
  /** Cap max size to this ratio (e.g. 0.8 = 80% of original max size). From URL ?maxSize=0.8 */
  maxSizeScale?: number;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const v = hex.replace("#", "").trim();
  const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const k = clamp01(t);
  const r = Math.round(a.r + (b.r - a.r) * k);
  const g = Math.round(a.g + (b.g - a.g) * k);
  const bb = Math.round(a.b + (b.b - a.b) * k);
  return rgbToHex({ r, g, b: bb });
}

function getClipPath(shape: SootShape): string | undefined {
  switch (shape) {
    case "triangle":
      return "polygon(50% 3%, 3% 97%, 97% 97%)";
    case "star":
      return "polygon(50% 2%, 61% 35%, 96% 35%, 68% 56%, 78% 90%, 50% 70%, 22% 90%, 32% 56%, 4% 35%, 39% 35%)";
    case "heart":
      // Heart uses SVG clipPath (objectBoundingBox) rendered in component so it fills the element; see soot body JSX.
      return undefined;
    case "square":
    case "circle":
    default:
      return undefined;
  }
}

// Black soot body: 2x base size; linear growth so each level adds the same amount.
export const MAX_AGE_SIZE_MULTIPLIER = 1.92;
export const SOOT_BASE_SIZE = 280;

const MIN_MULT = 0.5;
const MULT_PER_LEVEL = (MAX_AGE_SIZE_MULTIPLIER - MIN_MULT) / 99;

export function getSizeMultiplier(age: number): number {
  if (age < 1) return MIN_MULT;
  if (age <= 100) return MIN_MULT + (age - 1) * MULT_PER_LEVEL;
  return MAX_AGE_SIZE_MULTIPLIER;
}

// Max pixel size (at age 60): SOOT_BASE_SIZE * MAX_AGE_SIZE_MULTIPLIER ≈ 422.8

// Sorrow state makes the sprite shrink slightly
function getSorrowShrink(emotion: EmotionType): number {
  return emotion === "sorrow" ? 0.85 : 1;
}

// Get emotion-based color tint - CORE EMOTIONAL FEEDBACK via color changes
function getEmotionColor(emotion: EmotionType, showGreeting: boolean): { 
  tint: string; 
  glow: string; 
  bodyMain: string; 
  bodyHighlight: string; 
  bodyShadow: string 
} {
  // Pink for happiness (greeting, returning)
  if (showGreeting) {
    return {
      tint: "rgba(244, 114, 182, 0.35)",
      glow: "0 0 40px rgba(244, 114, 182, 0.6), 0 0 80px rgba(244, 114, 182, 0.4)",
      bodyMain: "#3a2535",
      bodyHighlight: "#4a3545",
      bodyShadow: "#2a1525",
    };
  }

  switch (emotion) {
    case "joy":
      // Yellow for joy - active gameplay
      return {
        tint: "rgba(255, 214, 57, 0.35)",
        glow: "0 0 40px rgba(255, 214, 57, 0.6), 0 0 80px rgba(255, 214, 57, 0.4)",
        bodyMain: "#3a3520",
        bodyHighlight: "#504830",
        bodyShadow: "#252010",
      };
    case "anger":
      // Red for anger - over-interaction
      return {
        tint: "rgba(239, 68, 68, 0.35)",
        glow: "0 0 35px rgba(239, 68, 68, 0.5), 0 0 70px rgba(239, 68, 68, 0.3)",
        bodyMain: "#3a2020",
        bodyHighlight: "#4a2a2a",
        bodyShadow: "#1a1010",
      };
    case "sorrow":
      // Blue for sorrow - idle/ignored
      return {
        tint: "rgba(96, 165, 250, 0.3)",
        glow: "0 0 30px rgba(96, 165, 250, 0.4), 0 0 60px rgba(96, 165, 250, 0.2)",
        bodyMain: "#252530",
        bodyHighlight: "#353545",
        bodyShadow: "#151520",
      };
    default:
      // Neutral - no tint
      return {
        tint: "transparent",
        glow: "none",
        bodyMain: "#2a2a2a",
        bodyHighlight: "#404040",
        bodyShadow: "#1a1a1a",
      };
  }
}

export function SootSprite({ 
  emotion, 
  currentAction, 
  isEating, 
  isSleeping, 
  onClick, 
  age,
  tapCount = 0,
  showGreeting = false,
  appearance,
  mouthDown = false,
  maxSizeScale = 1,
}: SootSpriteProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const [clickTrigger, setClickTrigger] = useState(0);
  const [blinkState, setBlinkState] = useState(false);
  const [idleState, setIdleState] = useState<"normal" | "yawning" | "corner">("normal");
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  
  // Mouse position for eye tracking
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  
  // Squash and stretch spring physics
  const squashY = useSpring(1, { stiffness: 300, damping: 15 });
  const squashX = useSpring(1, { stiffness: 300, damping: 15 });

  const scale = Math.min(1, Math.max(0.1, maxSizeScale));
  const sizeMultiplier = getSizeMultiplier(age) * getSorrowShrink(emotion) * scale;
  const baseSize = SOOT_BASE_SIZE;
  const shape: SootShape = appearance?.shape ?? "circle";
  const squareScale = shape === "square" ? 0.75 : 1;
  // Circle, triangle, square, star, heart all at 60% size (same visual size)
  const shapeScale = 0.6;
  const size = Math.round(baseSize * sizeMultiplier * squareScale * shapeScale);
  const shadowScale = size / 140;
  const referenceSize = baseSize * sizeMultiplier * 0.6;
  const bodyScale = referenceSize > 0 ? size / referenceSize : 1;

  // Scale features with body size so each shape has same face/body proportion (fixes heart looking oversized)
  const eyeSize = Math.round(28 * sizeMultiplier * bodyScale);
  const pupilSize = Math.round(12 * sizeMultiplier * bodyScale);
  const sparkleSize = Math.round(6 * sizeMultiplier * bodyScale);
  const smallSparkleSize = Math.round(3 * sizeMultiplier * bodyScale);
  const fuzzSize = Math.round(4 * sizeMultiplier * bodyScale);

  // Get colors based on emotion (overlay) and appearance base color (body)
  const emotionColors = getEmotionColor(emotion, showGreeting);
  const base = appearance?.color && appearance.color.startsWith("#") ? appearance.color : emotionColors.bodyMain;
  const main = base;
  const highlight = mix(base, "#ffffff", 0.18);
  const shadow = mix(base, "#000000", 0.22);
  
  const currentTint = emotionColors.tint;
  const currentGlow = emotionColors.glow;
  const bodyColors = {
    main,
    highlight,
    shadow,
  };

  const isCircular = shape === "circle";
  const borderRadius = shape === "square" ? Math.max(10, Math.round(18 * sizeMultiplier)) : 9999;
  const heartClipId = useId();
  const clipPath = shape === "heart" ? `url(#${heartClipId})` : getClipPath(shape);

  // Eye tracking - follow mouse cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      // Limit eye movement range
      const maxOffset = 5;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, 1) * maxOffset : 0;
      const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, 1) * maxOffset : 0;
      
      setEyeOffset({ x: normalizedX, y: normalizedY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking animation - ALWAYS blink, face is static
  useEffect(() => {
    if (isSleeping) return; // Only skip blinking when sleeping
    
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [isSleeping]);

  // Idle behavior - yawning and corner sitting after inactivity
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      
      if (timeSinceInteraction > 20000 && idleState === "normal" && !currentAction) {
        if (Math.random() > 0.5) {
          setIdleState("yawning");
          setTimeout(() => setIdleState("normal"), 2500);
        }
      }
      
      if (timeSinceInteraction > 45000 && idleState === "normal" && !currentAction) {
        setIdleState("corner");
      }
    }, 5000);

    return () => clearInterval(checkIdle);
  }, [lastInteractionTime, idleState, currentAction]);

  // Reset idle state on interaction
  useEffect(() => {
    if (currentAction) {
      setLastInteractionTime(Date.now());
      setIdleState("normal");
    }
  }, [currentAction]);

  // Squash and stretch on click; jump animation is coordinated in the idle useEffect via lastClickTimeRef
  const handleClick = useCallback(() => {
    setLastInteractionTime(Date.now());
    lastClickTimeRef.current = Date.now();
    setClickTrigger((t) => t + 1);
    setIdleState("normal");
    // 壓扁 → 拉高 → 落回，時長與 ease 讓落地與後續 idle 銜接順暢
    squashY.set(0.72);
    squashX.set(1.28);
    setTimeout(() => {
      squashY.set(1.12);
      squashX.set(0.88);
      setTimeout(() => {
        squashY.set(1);
        squashX.set(1);
      }, 180);
    }, 120);
    onClick();
  }, [onClick, squashX, squashY]);

  // Emotion and action based body animations
  useEffect(() => {
    if (currentAction === "pet") {
      controls.start({
        scaleY: [1, 0.7, 0.75, 0.7, 0.75],
        scaleX: [1, 1.2, 1.15, 1.2, 1.15],
        y: [0, 8, 6, 8, 6],
        transition: { duration: 0.8, repeat: Number.POSITIVE_INFINITY },
      });
    } else if (currentAction === "love") {
      controls.start({
        scale: [1, 1.08, 1, 1.12, 1],
        transition: { duration: 0.6, repeat: Number.POSITIVE_INFINITY },
      });
    } else if (currentAction === "feed" || currentAction === "drink") {
      controls.start({
        scaleY: [1, 0.92, 1.05, 0.95, 1],
        scaleX: [1, 1.05, 0.95, 1.02, 1],
        transition: { duration: 0.35, repeat: Number.POSITIVE_INFINITY },
      });
    } else if (currentAction === "sleep") {
      controls.start({
        scaleY: [1, 1.06, 1],
        scaleX: [1, 0.96, 1],
        y: [0, -2, 0],
        transition: { duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
      });
    } else if (emotion === "anger") {
      controls.start({
        x: [-2, 2, -2, 2, 0],
        scale: [1, 1.02, 1, 1.02, 1],
        transition: { duration: 0.3, repeat: Number.POSITIVE_INFINITY },
      });
    } else if (emotion === "sorrow") {
      controls.start({
        y: [0, 3, 0],
        transition: { duration: 3, repeat: Number.POSITIVE_INFINITY },
      });
    } else if (emotion === "joy") {
      controls.start({
        y: [0, -12, 0],
        rotate: [0, -8, 8, -8, 0],
        transition: { duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.1 },
      });
    } else if (idleState === "yawning") {
      controls.start({
        scaleY: [1, 1.1, 1.15, 1.1, 1],
        transition: { duration: 2.5 },
      });
    } else if (idleState === "corner") {
      controls.start({
        x: 40,
        y: 20,
        rotate: -5,
        transition: { duration: 1, ease: "easeOut" },
      });
    } else {
      // Idle: 若剛點擊過，先播一次「跳起→落回」再接上飄動，避免跳躍與原本姿態銜接不順
      const now = Date.now();
      const justClicked = lastClickTimeRef.current && now - lastClickTimeRef.current < 650;
      const idleKeyframes = {
        x: [0, 3, -2, 2, 0],
        y: [0, -8, -4, -6, 0],
        rotate: [0, 1, -1, 0],
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        transition: { duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const },
      };
      if (justClicked) {
        lastClickTimeRef.current = 0;
        controls
          .start(
            {
              x: 0,
              y: [0, -22, 0],
              scale: 1,
              scaleX: 1,
              scaleY: 1,
              rotate: 0,
              transition: { duration: 0.52, ease: [0.22, 0.61, 0.36, 1] },
            },
            { onComplete: () => controls.start(idleKeyframes) }
          );
        return;
      }
      controls.start(idleKeyframes);
    }
  }, [emotion, currentAction, idleState, clickTrigger, controls]);

  // Render eyes: sleeping = closed; sorrow = crying (sad curve + tears); else default eyes
  const renderEyes = () => {
    const eyeGap = Math.round(14 * sizeMultiplier * bodyScale);
    const baseLookX = -1.5 * sizeMultiplier * bodyScale;
    const baseLookY = -0.5 * sizeMultiplier * bodyScale;
    const lookScale = 0.55; // reduce mouse tracking intensity for the simple look

    // Sleeping: u_u closed eyes
    if (isSleeping) {
      return (
        <div 
          className="flex items-center justify-center"
          style={{ gap: eyeGap }}
        >
          <svg width={eyeSize} height={eyeSize * 0.5} viewBox="0 0 24 12">
            <path d="M2 2 Q12 12 22 2" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <svg width={eyeSize} height={eyeSize * 0.5} viewBox="0 0 24 12">
            <path d="M2 2 Q12 12 22 2" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      );
    }

    // Sorrow: crying face – sad downturned eyes + teardrops
    if (emotion === "sorrow") {
      const tearSize = Math.round(4 * sizeMultiplier * bodyScale);
      return (
        <div 
          className="flex items-center justify-center"
          style={{ gap: eyeGap }}
        >
          <div className="relative">
            <svg width={eyeSize} height={eyeSize * 0.5} viewBox="0 0 24 12">
              <path d="M2 8 Q12 2 22 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="absolute left-1/2 -translate-x-1/2 top-full" style={{ width: tearSize, height: tearSize * 1.2 }}>
              <svg viewBox="0 0 8 10" className="w-full h-full opacity-90">
                <path d="M4 0 Q6 4 4 8 Q2 4 4 0" fill="rgba(255,255,255,0.9)" />
              </svg>
            </span>
          </div>
          <div className="relative">
            <svg width={eyeSize} height={eyeSize * 0.5} viewBox="0 0 24 12">
              <path d="M2 8 Q12 2 22 8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="absolute left-1/2 -translate-x-1/2 top-full" style={{ width: tearSize, height: tearSize * 1.2 }}>
              <svg viewBox="0 0 8 10" className="w-full h-full opacity-90">
                <path d="M4 0 Q6 4 4 8 Q2 4 4 0" fill="rgba(255,255,255,0.9)" />
              </svg>
            </span>
          </div>
        </div>
      );
    }

    // Default: simple white eyes + small pupil (no sparkles)
    return (
      <div 
        className="flex items-center justify-center"
        style={{ gap: eyeGap }}
      >
        {/* Left eye */}
        <motion.div
          className="relative"
          animate={blinkState ? { scaleY: 0.1 } : { scaleY: 1 }}
          transition={{ duration: 0.1 }}
        >
          <div 
            className="bg-white shadow-lg relative overflow-hidden"
            style={{ width: eyeSize, height: Math.round(eyeSize * 0.85), borderRadius: 9999 }}
          >
            {/* Pupil with tracking */}
            <motion.div
              className="absolute rounded-full"
              style={{ 
                width: Math.round(pupilSize * 0.75), 
                height: Math.round(pupilSize * 0.75),
                top: "50%",
                left: "50%",
                background: "#111",
              }}
              animate={{
                x: -Math.round(pupilSize * 0.75) / 2 + baseLookX + eyeOffset.x * lookScale,
                y: -Math.round(pupilSize * 0.75) / 2 + baseLookY + eyeOffset.y * lookScale,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.div>

        {/* Right eye */}
        <motion.div
          className="relative"
          animate={blinkState ? { scaleY: 0.1 } : { scaleY: 1 }}
          transition={{ duration: 0.1 }}
        >
          <div 
            className="bg-white shadow-lg relative overflow-hidden"
            style={{ width: eyeSize, height: Math.round(eyeSize * 0.85), borderRadius: 9999 }}
          >
            {/* Pupil with tracking */}
            <motion.div
              className="absolute rounded-full"
              style={{ 
                width: Math.round(pupilSize * 0.75), 
                height: Math.round(pupilSize * 0.75),
                top: "50%",
                left: "50%",
                background: "#111",
              }}
              animate={{
                x: -Math.round(pupilSize * 0.75) / 2 + baseLookX + eyeOffset.x * lookScale,
                y: -Math.round(pupilSize * 0.75) / 2 + baseLookY + eyeOffset.y * lookScale,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.div>
      </div>
    );
  };

  const renderMouth = () => {
    const mouthWidth = Math.round(26 * sizeMultiplier * bodyScale);
    const mouthHeight = Math.round(10 * sizeMultiplier * bodyScale);
    // Smile: curve down in middle (Q13 10). Frown: curve up in middle (Q13 0), mouth ends lower
    const pathD = mouthDown ? "M4 7 Q13 0 22 7" : "M4 3 Q13 10 22 3";

    return (
      <div className="flex justify-center">
        <svg width={mouthWidth} height={mouthHeight} viewBox="0 0 26 10">
          <path
            d={pathD}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  const renderFuzz = () => null;

  // Render tiny limbs
  const renderLimbs = () => {
    if (!isCircular) return null;
    const limbSize = Math.round(16 * sizeMultiplier * bodyScale);
    const limbOffset = size * 0.38;
    
    return (
      <>
        {/* Left arm */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: limbSize,
            height: limbSize * 0.7,
            backgroundColor: bodyColors.main,
            left: `calc(50% - ${limbOffset}px)`,
            bottom: "22%",
            borderRadius: "50%",
          }}
          animate={{
            rotate: emotion === "joy" ? [-15, 15, -15] : [-5, 5, -5],
            y: emotion === "joy" ? [-2, 2, -2] : [0, 1, 0],
          }}
          transition={{
            duration: emotion === "joy" ? 0.3 : 1.5,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
        
        {/* Right arm */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: limbSize,
            height: limbSize * 0.7,
            backgroundColor: bodyColors.main,
            right: `calc(50% - ${limbOffset}px)`,
            bottom: "22%",
            borderRadius: "50%",
          }}
          animate={{
            rotate: emotion === "joy" ? [15, -15, 15] : [5, -5, 5],
            y: emotion === "joy" ? [-2, 2, -2] : [0, 1, 0],
          }}
          transition={{
            duration: emotion === "joy" ? 0.3 : 1.5,
            repeat: Number.POSITIVE_INFINITY,
            delay: 0.15,
          }}
        />
        
        {/* Left foot */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: limbSize * 0.9,
            height: limbSize * 0.5,
            backgroundColor: bodyColors.main,
            left: `calc(50% - ${limbOffset * 0.6}px)`,
            bottom: "8%",
            borderRadius: "50%",
          }}
          animate={{
            scaleX: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
        
        {/* Right foot */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: limbSize * 0.9,
            height: limbSize * 0.5,
            backgroundColor: bodyColors.main,
            right: `calc(50% - ${limbOffset * 0.6}px)`,
            bottom: "8%",
            borderRadius: "50%",
          }}
          animate={{
            scaleX: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            delay: 0.5,
          }}
        />
      </>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative cursor-pointer select-none z-10"
      style={{ width: size, height: size }}
      onClick={handleClick}
      animate={controls}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* SVG clipPath for heart so it fills the element (objectBoundingBox 0–1); CSS path() would be px and sit in corner */}
      {shape === "heart" && (
        <svg width={0} height={0} className="absolute" aria-hidden>
          <defs>
            <clipPath id={heartClipId} clipPathUnits="objectBoundingBox">
              <path d="M0.5 0.92 C0.2 0.74 0.06 0.56 0.06 0.38 C0.06 0.22 0.18 0.1 0.34 0.1 C0.42 0.1 0.48 0.14 0.5 0.18 C0.52 0.14 0.58 0.1 0.66 0.1 C0.82 0.1 0.94 0.22 0.94 0.38 C0.94 0.56 0.8 0.74 0.5 0.92 Z" />
            </clipPath>
          </defs>
        </svg>
      )}
      {/* Emotion color glow effect - PRIMARY WAY TO SHOW EMOTION (same shape as body) */}
      {currentGlow !== "none" && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            clipPath,
            boxShadow: currentGlow,
          }}
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: emotion === "anger" ? 0.5 : 2,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      )}

      {/* Squash/stretch container */}
      <motion.div
        className="relative w-full h-full"
        style={{ scaleX: squashX, scaleY: squashY }}
      >
        {/* Fuzzy outline */}
        {renderFuzz()}
        
        {/* Main body - COLOR CHANGES BASED ON EMOTION */}
        <motion.div
          className="absolute inset-0"
          style={{
            borderRadius,
            clipPath,
            background: `radial-gradient(circle at 35% 30%, ${bodyColors.highlight} 0%, ${bodyColors.main} 50%, ${bodyColors.shadow} 100%)`,
            boxShadow: `inset -${8 * shadowScale}px -${8 * shadowScale}px ${20 * shadowScale}px ${bodyColors.shadow}, inset ${4 * shadowScale}px ${4 * shadowScale}px ${15 * shadowScale}px ${bodyColors.highlight}`,
          }}
        />
        
        {/* Color tint overlay - EMOTION INDICATOR */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            clipPath,
            background: currentTint,
          }}
          animate={{
            opacity: currentTint !== "transparent" ? [0.6, 0.9, 0.6] : 0,
          }}
          transition={{
            duration: emotion === "anger" ? 0.3 : 1.5,
            repeat: Number.POSITIVE_INFINITY,
          }}
        />

        {/* Limbs */}
        {renderLimbs()}

        {/* Face: eyes + mouth; heart visual center is slightly above geometric center */}
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center"
          style={{
            left: "50%",
            top: shape === "heart" ? "45%" : "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div style={{ marginBottom: Math.round(6 * sizeMultiplier * bodyScale) }}>
            {renderEyes()}
          </div>
          {!isSleeping && renderMouth()}
        </div>
      </motion.div>
    </motion.div>
  );
}
