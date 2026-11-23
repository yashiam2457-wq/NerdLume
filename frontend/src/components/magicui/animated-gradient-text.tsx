import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AnimatedGradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative mx-auto flex max-w-fit flex-row items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f] backdrop-blur-sm transition-shadow duration-500 ease-out [--bg-size:300%]",
        "border border-white/10 bg-white/5 hover:shadow-[inset_0_-5px_10px_#ffffff3f]",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 block h-full w-full animate-marquee rounded-[inherit] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 bg-[length:var(--bg-size)_100%] p-[1px] ![mask-composite:subtract] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
        )}
      />
      {children}
    </div>
  );
}
