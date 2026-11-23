"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SquaresProps {
  direction?: "diagonal" | "up" | "right" | "down" | "left";
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  className?: string;
}

export function Squares({
  direction = "diagonal",
  speed = 0.35,
  borderColor = "rgba(59, 130, 246, 0.16)",
  squareSize = 44,
  hoverFillColor = "rgba(56, 189, 248, 0.26)",
  className,
}: SquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const startX = Math.floor(gridOffset.current.x / squareSize) * squareSize;
      const startY = Math.floor(gridOffset.current.y / squareSize) * squareSize;

      for (let x = startX; x < canvas.width + squareSize; x += squareSize) {
        for (let y = startY; y < canvas.height + squareSize; y += squareSize) {
          const squareX = x - (gridOffset.current.x % squareSize);
          const squareY = y - (gridOffset.current.y % squareSize);

          if (
            hoveredSquare.current &&
            Math.floor((hoveredSquare.current.x - squareX) / squareSize) === 0 &&
            Math.floor((hoveredSquare.current.y - squareY) / squareSize) === 0
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(squareX, squareY, squareSize, squareSize);
          }

          ctx.strokeStyle = borderColor;
          ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        }
      }

      // Smooth cybernetic radial vignette centered on viewport
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxDim = Math.max(canvas.width, canvas.height);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxDim * 0.72
      );
      gradient.addColorStop(0, "rgba(8, 12, 20, 0)");
      gradient.addColorStop(0.5, "rgba(8, 12, 20, 0.15)");
      gradient.addColorStop(0.85, "rgba(8, 12, 20, 0.7)");
      gradient.addColorStop(1, "rgba(8, 12, 20, 0.95)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const updateAnimation = () => {
      switch (direction) {
        case "right":
          gridOffset.current.x -= speed;
          break;
        case "left":
          gridOffset.current.x += speed;
          break;
        case "down":
          gridOffset.current.y += speed;
          break;
        case "up":
          gridOffset.current.y -= speed;
          break;
        case "diagonal":
          gridOffset.current.x -= speed;
          gridOffset.current.y -= speed;
          break;
      }

      draw();
      animationFrameId = requestAnimationFrame(updateAnimation);
    };

    const handleMouseMove = (event: MouseEvent) => {
      hoveredSquare.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handleMouseLeave = () => {
      hoveredSquare.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    updateAnimation();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none fixed inset-0 z-0 h-full w-full", className)}
    />
  );
}

