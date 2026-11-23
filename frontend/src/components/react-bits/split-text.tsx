"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: any;
  animationTo?: any;
  threshold?: number;
  rootMargin?: string;
}

export function SplitText({
  text,
  className = "",
  delay = 50,
  animationFrom = { opacity: 0, transform: "translate3d(0,30px,0)" },
  animationTo = { opacity: 1, transform: "translate3d(0,0,0)" },
}: SplitTextProps) {
  const words = text.split(" ");

  return (
    <span className={cn("inline-block", className)}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-2">
          {word.split("").map((char, charIndex) => {
            const index = wordIndex * 5 + charIndex;
            return (
              <motion.span
                key={charIndex}
                initial={animationFrom}
                animate={animationTo}
                transition={{
                  duration: 0.4,
                  delay: (index * delay) / 1000,
                  ease: [0.2, 0.65, 0.3, 0.9],
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

