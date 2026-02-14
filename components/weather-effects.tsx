"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type WeatherType = "sunny" | "rain" | "snow" | "leaves";

interface WeatherEffectsProps {
  weather: WeatherType;
  className?: string;
}

// Rain droplet component
function RainDrop({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute w-0.5 bg-gradient-to-b from-transparent via-sky-300/60 to-sky-400/80 rounded-full"
      style={{ left: `${x}%`, height: "12px" }}
      initial={{ top: "-5%", opacity: 0 }}
      animate={{ top: "105%", opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    />
  );
}

// Snowflake component
function Snowflake({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/80"
      style={{ left: `${x}%`, width: size, height: size }}
      initial={{ top: "-5%", opacity: 0, rotate: 0 }}
      animate={{
        top: "105%",
        opacity: [0, 1, 1, 0],
        rotate: 360,
        x: [0, 10, -10, 5, 0],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    />
  );
}

// Falling leaf component
function Leaf({ delay, x, rotation }: { delay: number; x: number; rotation: number }) {
  const colors = ["#d97706", "#ea580c", "#dc2626", "#b45309", "#92400e"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%` }}
      initial={{ top: "-10%", opacity: 0, rotate: 0 }}
      animate={{
        top: "105%",
        opacity: [0, 1, 1, 0.8, 0],
        rotate: [0, rotation, rotation * 2, rotation * 3],
        x: [0, 20, -15, 25, 0],
      }}
      transition={{
        duration: 5 + Math.random() * 3,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8.16 20C11.29 20 13.87 17.83 14.64 14.86C15.41 17.83 17.99 20 21.12 20H21.54V18H21.12C18.5 18 16.32 15.87 16.32 13.28V12H21.54V10H16.32V8H17Z" />
      </svg>
    </motion.div>
  );
}

// Sun ray component
function SunRay({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  return (
    <motion.div
      className="absolute bg-gradient-to-t from-amber-300/40 to-transparent"
      style={{
        width: "3px",
        height: "60px",
        left: "50%",
        top: "50%",
        transformOrigin: "center bottom",
        transform: `translateX(-50%) translateY(-100%) rotate(${angle}deg)`,
      }}
      animate={{
        opacity: [0.3, 0.6, 0.3],
        height: ["50px", "70px", "50px"],
      }}
      transition={{
        duration: 2,
        delay: index * 0.1,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
  );
}

export function WeatherEffects({ weather, className = "" }: WeatherEffectsProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; size?: number; rotation?: number }>>([]);

  useEffect(() => {
    const count = weather === "rain" ? 30 : weather === "snow" ? 20 : weather === "leaves" ? 12 : 0;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      size: 3 + Math.random() * 4,
      rotation: (Math.random() - 0.5) * 180,
    }));
    setParticles(newParticles);
  }, [weather]);

  // Background overlay for different weather
  const getOverlay = () => {
    switch (weather) {
      case "rain":
        return "bg-gradient-to-b from-slate-600/20 via-slate-500/10 to-transparent";
      case "snow":
        return "bg-gradient-to-b from-slate-300/15 via-slate-200/10 to-transparent";
      case "leaves":
        return "bg-gradient-to-b from-amber-500/10 via-orange-400/5 to-transparent";
      case "sunny":
        return "bg-gradient-to-b from-amber-200/20 via-yellow-100/10 to-transparent";
      default:
        return "";
    }
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Weather overlay */}
      <div className={`absolute inset-0 ${getOverlay()} transition-colors duration-1000`} />

      {/* Sunny - sun glow and rays */}
      {weather === "sunny" && (
        <div className="absolute top-4 right-4">
          <motion.div
            className="relative w-16 h-16"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <SunRay key={i} index={i} total={12} />
            ))}
          </motion.div>
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400"
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 20px rgba(251, 191, 36, 0.4)",
                "0 0 40px rgba(251, 191, 36, 0.6)",
                "0 0 20px rgba(251, 191, 36, 0.4)",
              ],
            }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Rain drops */}
      {weather === "rain" &&
        particles.map((p) => <RainDrop key={p.id} delay={p.delay} x={p.x} />)}

      {/* Snowflakes */}
      {weather === "snow" &&
        particles.map((p) => <Snowflake key={p.id} delay={p.delay} x={p.x} size={p.size || 4} />)}

      {/* Falling leaves */}
      {weather === "leaves" &&
        particles.map((p) => <Leaf key={p.id} delay={p.delay} x={p.x} rotation={p.rotation || 0} />)}

      {/* Ambient glow effect for rain */}
      {weather === "rain" && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-sky-400/10 to-transparent"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
    </div>
  );
}
