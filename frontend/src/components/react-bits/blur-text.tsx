"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
}

export function BlurText({
  text,
  delay = 80,
  className = "",
  animateBy = "words",
  direction = "top",
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  return (
    <span className={cn("inline-flex flex-wrap", className)}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          initial={{
            filter: "blur(10px)",
            opacity: 0,
            transform: direction === "top" ? "translate3d(0,-20px,0)" : "translate3d(0,20px,0)",
          }}
          animate={{
            filter: "blur(0px)",
            opacity: 1,
            transform: "translate3d(0,0,0)",
          }}
          transition={{
            duration: 0.5,
            delay: (i * delay) / 1000,
            ease: "easeOut",
          }}
          className={cn("inline-block", animateBy === "words" && "mr-2")}
        >
          {el}
        </motion.span>
      ))}
    </span>
  );
}

