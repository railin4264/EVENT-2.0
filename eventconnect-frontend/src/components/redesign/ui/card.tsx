import * as React from "react";
import { cn } from "./utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Base: glass card with violet-tinted border
        "bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border transition-all duration-300",
        // Dark mode: deep glass effect
        "dark:bg-[rgba(9,9,14,0.80)] dark:backdrop-blur-xl dark:border-[rgba(139,92,246,0.12)]",
        "dark:shadow-[0_4px_24px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.04)]",
        // Light mode: clean white card
        "bg-white/90 backdrop-blur-sm border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)]",
        // Hover: lift + glow
        "hover:-translate-y-0.5 dark:hover:border-[rgba(139,92,246,0.25)] dark:hover:shadow-[0_8px_40px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

function CardGlass({ className, tint = "violet", ...props }: React.ComponentProps<"div"> & { tint?: "violet" | "cyan" | "pink" | "none" }) {
  const tintMap = {
    violet: "dark:border-[rgba(139,92,246,0.20)] dark:bg-[rgba(139,92,246,0.05)] dark:shadow-[0_4px_24px_rgba(139,92,246,0.10)]",
    cyan:   "dark:border-[rgba(6,182,212,0.20)]   dark:bg-[rgba(6,182,212,0.05)]   dark:shadow-[0_4px_24px_rgba(6,182,212,0.10)]",
    pink:   "dark:border-[rgba(236,72,153,0.20)]  dark:bg-[rgba(236,72,153,0.05)]  dark:shadow-[0_4px_24px_rgba(236,72,153,0.10)]",
    none:   "",
  };

  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-2xl border transition-all duration-300",
        "backdrop-blur-xl",
        "dark:bg-[rgba(9,9,14,0.70)] dark:border-[rgba(255,255,255,0.07)]",
        "bg-white/80 border-white/50",
        tintMap[tint],
        "hover:-translate-y-1",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardGlass,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
