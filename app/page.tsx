"use client";

import { Suspense } from "react";
import { PetWindow } from "@/components/pet-window";
import { FloatingParticles } from "@/components/floating-particles";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-context";
import { APP_VERSION } from "@/lib/version";

export default function Home() {
  const { t } = useLanguage();
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  if (isInIframe) {
    return (
      <main className="h-full min-h-0 w-full overflow-hidden flex items-center justify-center bg-[#f0f0f0] dark:bg-[#1a1a1a]">
        <Suspense fallback={<div className="text-muted-foreground text-sm">...</div>}>
          <PetWindow />
        </Suspense>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <FloatingParticles />

      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t("home.title")}
            <span className="ml-2 text-lg md:text-xl font-normal text-muted-foreground">v{APP_VERSION}</span>
          </h1>
        </motion.div>

        <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-muted-foreground">...</div>}>
          <PetWindow />
        </Suspense>
      </div>
    </main>
  );
}
