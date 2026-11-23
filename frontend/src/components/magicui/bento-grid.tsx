"use client";

import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-5",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon: any;
  description: string;
  href?: string;
  cta?: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl",
      "bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl hover:border-blue-500/50 transition-all duration-300",
      "shadow-[0_0_24px_rgba(0,0,0,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
      className
    )}
  >
    <div className="absolute inset-0 z-0">{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-2 p-6 transition-all duration-300 group-hover:-translate-y-2">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold tracking-tight text-white mt-2 font-mono">
        {name}
      </h3>
      <p className="max-w-lg text-sm text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>

    {cta && (
      <div className="pointer-events-none z-10 flex transform-gpu flex-row items-center p-6 pt-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-semibold tracking-wider uppercase text-blue-400 flex items-center gap-2">
          {cta}
          <ArrowRight className="h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    )}
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-blue-500/[0.03]" />
  </div>
);
