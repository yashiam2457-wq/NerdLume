"use client";

import { cn } from "@/lib/utils";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = "",
}: ShinyTextProps) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent bg-[linear-gradient(110deg,#93c5fd,45%,#ffffff,55%,#93c5fd)] bg-[length:250%_100%]",
        !disabled && "animate-marquee",
        className
      )}
      style={{
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
}

