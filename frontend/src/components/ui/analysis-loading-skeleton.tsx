"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Search } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

// p-2 (8px * 2) + h-4/w-4 icon (16px) = 32px
const ICON_SIZE = 32;

const SKELETON_SECTIONS = [
  { lines: 4, tags: true },   // Skills
  { lines: 3, tags: false },  // Resumo Profissional
  { lines: 2, tags: false },  // Datas
  { lines: 3, tags: false },  // Frases de Impacto
  { lines: 2, tags: false },  // Contato
];

// ─── Shimmer bar ─────────────────────────────────────────────────────────────

function ShimmerBar({ width = "100%", height = "h-3" }: { width?: string; height?: string }) {
  return (
    <motion.div
      className={`rounded-full ${height} bg-gray-200`}
      style={{ width }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Skeleton Card (forwardRef so parent can measure position) ────────────────

const SkeletonCard = forwardRef<HTMLDivElement, { index: number }>(
  function SkeletonCard({ index }, ref) {
    const { lines, tags } = SKELETON_SECTIONS[index] ?? { lines: 3, tags: false };

    return (
      <motion.div
        ref={ref}
        // flex-basis mirrors the lg:3-col grid — 3 cards top row, 2 bottom (centred by justify-center)
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4
                   w-full
                   sm:w-[calc(50%-0.5rem)]
                   lg:w-[calc(33.333%-0.667rem)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <motion.div
                className="w-4 h-4 rounded bg-gray-200"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.15 }}
              />
            </div>
            <ShimmerBar width="120px" height="h-4" />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBar width="36px" height="h-4" />
            <div className="w-14 h-5 rounded-full bg-gray-200 opacity-60" />
          </div>
        </div>

        {/* Progress bar */}
        <motion.div
          className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 + index * 0.1 }}
        >
          <motion.div
            className="h-full rounded-full bg-gray-300"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "65%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
          />
        </motion.div>

        {/* Content lines */}
        <div className="space-y-2.5 pt-1">
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerBar
              key={i}
              width={i === lines - 1 ? "60%" : i % 2 === 0 ? "100%" : "85%"}
              height="h-3"
            />
          ))}
        </div>

        {/* Skill tags (first card only) */}
        {tags && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[80, 60, 90, 70, 50].map((w, i) => (
              <motion.div
                key={i}
                className="h-5 rounded-full bg-gray-200"
                style={{ width: `${w}px` }}
                animate={{ opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  }
);

// ─── Score ring skeleton ──────────────────────────────────────────────────────

function ScoreRingSkeleton() {
  return (
    <motion.div
      className="flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="w-28 h-28 rounded-full border-8 border-gray-200"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <ShimmerBar width="80px" height="h-4" />
      <ShimmerBar width="120px" height="h-3" />
    </motion.div>
  );
}

// ─── Tab bar skeleton ─────────────────────────────────────────────────────────

function TabBarSkeleton() {
  return (
    <div className="rounded-xl bg-gray-100 p-1 flex gap-1 overflow-x-auto">
      {SKELETON_SECTIONS.map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 h-8 rounded-lg bg-gray-200 min-w-[80px]"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalysisLoadingSkeleton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const controls = useAnimation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let active = true;

    // Small delay to ensure the layout has painted before measuring
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container || !active) return;

      const containerRect = container.getBoundingClientRect();

      const positions = cardRefs.current
        .map((card) => {
          if (!card) return null;
          const r = card.getBoundingClientRect();
          return {
            x: r.left - containerRect.left + r.width / 2 - ICON_SIZE / 2,
            y: r.top - containerRect.top + r.height / 2 - ICON_SIZE / 2,
          };
        })
        .filter((p): p is { x: number; y: number } => p !== null);

      if (positions.length === 0) return;

      let i = 0;
      async function loop() {
        while (active) {
          const pos = positions[i % positions.length];
          await controls.start({
            x: pos.x,
            y: pos.y,
            transition: { duration: 0.6, ease: "easeInOut" },
          });
          if (!active) break;
          await new Promise<void>((r) => setTimeout(r, 900));
          i++;
        }
      }
      loop();
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isMounted]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-28 h-8 rounded-lg bg-gray-200 opacity-60" />
            <div className="w-16 h-8 rounded-lg bg-gray-200 opacity-60" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ShimmerBar width="80px" height="h-3" />
            <ShimmerBar width="140px" height="h-4" />
          </div>
        </div>

        {/* Score ring */}
        <ScoreRingSkeleton />

        {/* Tab bar */}
        <TabBarSkeleton />

        {/* Cards — container is the positioning reference for the icon */}
        <div ref={containerRef} className="relative overflow-hidden">
          {/* Floating search icon */}
          <motion.div
            className="absolute z-10 pointer-events-none"
            animate={controls}
          >
            <motion.div
              className="bg-indigo-600 text-white rounded-full p-2 shadow-lg"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <Search className="h-4 w-4" />
            </motion.div>
          </motion.div>

          {/* Flex wrap: 3 cards top row, 2 cards bottom row centred */}
          <div className="flex flex-wrap justify-center gap-4">
            {SKELETON_SECTIONS.map((_, i) => (
              <SkeletonCard
                key={i}
                index={i}
                ref={(el) => { cardRefs.current[i] = el; }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-2">
          <ShimmerBar width="200px" height="h-3" />
        </div>

      </div>
    </main>
  );
}
