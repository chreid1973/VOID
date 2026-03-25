"use client";

import { useEffect } from "react";

type CursorEffectHandle = {
  destroy(): void;
};

function getSeasonalCursorEffectKey(now: Date) {
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 3 && day === 1) {
    return "april-fools" as const;
  }

  if (month === 5 && day >= 1 && day <= 30) {
    return "pride-month" as const;
  }

  return null;
}

export default function SeasonalCursorEffect() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (prefersReducedMotion || !hasFinePointer) {
      return;
    }

    const effectKey = getSeasonalCursorEffectKey(new Date());

    if (!effectKey) {
      return;
    }

    let effect: CursorEffectHandle | null = null;
    let cancelled = false;

    async function loadEffect() {
      const { emojiCursor, rainbowCursor } = await import("cursor-effects");

      if (cancelled) {
        return;
      }

      if (effectKey === "april-fools") {
        effect = emojiCursor({
          emoji: ["🤡", "🥸", "🃏", "😜"],
          delay: 18,
        });
        return;
      }

      effect = rainbowCursor({
        length: 18,
        size: 4,
        colors: [
          "#e40303",
          "#ff8c00",
          "#ffed00",
          "#008026",
          "#004dff",
          "#750787",
        ],
      });
    }

    void loadEffect();

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return null;
}
