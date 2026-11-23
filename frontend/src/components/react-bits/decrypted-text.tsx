"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()",
  className = "",
  encryptedClassName = "text-blue-400 opacity-70",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<any>(null);

  const startDecryption = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current);
      }
      iteration += 1 / 2;
    }, speed);
  };

  useEffect(() => {
    startDecryption();
    return () => clearInterval(intervalRef.current);
  }, [text]);

  return (
    <span
      className={cn("inline-block font-mono tracking-wider cursor-default", className)}
      onMouseEnter={() => {
        setIsHovering(true);
        startDecryption();
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      {displayText}
    </span>
  );
}

