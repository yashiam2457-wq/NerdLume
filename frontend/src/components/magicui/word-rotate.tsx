"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WordRotateProps {
  words: string[];
  duration?: number;
  className?: string;
}

export function WordRotate({
  words,
  duration = 2400,
  className,
}: WordRotateProps) {
  const [index, setIndex] = useState(0);
  const wordsRef = useRef(words);
  wordsRef.current = words;

  useEffect(() => {
    if (!words || words.length === 0) return;
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        const total = wordsRef.current?.length || 1;
        return (prevIndex + 1) % total;
      });
    }, duration);
    return () => clearInterval(interval);
  }, [duration, words?.length]);

  const currentWord = (words && words[index % words.length]) || words?.[0] || "";

  return (
    <span className="relative inline-flex items-center justify-center min-w-[220px] sm:min-w-[320px] h-[1.3em] overflow-hidden align-middle">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${currentWord}-${index}`}
          initial={{ opacity: 0, y: 22, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -22, filter: "blur(2px)" }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className={cn("whitespace-nowrap inline-block font-mono tracking-tight text-center", className)}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
