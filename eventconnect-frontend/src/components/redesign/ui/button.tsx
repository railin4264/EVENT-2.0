import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        // Default — electric violet fill with glow
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(139,92,246,0.35)] hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(139,92,246,0.50)] hover:-translate-y-px",

        // Electric — violet → cyan gradient
        electric:
          "text-white shadow-[0_4px_20px_rgba(139,92,246,0.30)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.45)] hover:-translate-y-px"
          + " [background:linear-gradient(135deg,#8B5CF6_0%,#06B6D4_100%)]"
          + " hover:[background:linear-gradient(135deg,#7C3AED_0%,#0891B2_100%)]",

        // Cyan electric
        cyan:
          "bg-secondary text-secondary-foreground shadow-[0_4px_14px_rgba(6,182,212,0.30)] hover:bg-secondary/90 hover:shadow-[0_6px_20px_rgba(6,182,212,0.45)] hover:-translate-y-px",

        // Hot pink accent
        pink:
          "bg-accent text-accent-foreground shadow-[0_4px_14px_rgba(236,72,153,0.30)] hover:bg-accent/90 hover:shadow-[0_6px_20px_rgba(236,72,153,0.45)] hover:-translate-y-px",

        // Destructive
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",

        // Outline — violet tinted border + glass
        outline:
          "border border-primary/25 bg-transparent text-foreground backdrop-blur-sm"
          + " hover:border-primary/50 hover:bg-primary/8 hover:text-primary"
          + " dark:border-primary/20 dark:hover:bg-primary/10",

        // Secondary (alias for backward compat — same as outline)
        secondary:
          "border border-primary/25 bg-transparent text-foreground backdrop-blur-sm"
          + " hover:border-primary/50 hover:bg-primary/8 hover:text-primary"
          + " dark:border-primary/20 dark:hover:bg-primary/10",

        // Ghost
        ghost:
          "text-foreground hover:bg-primary/8 hover:text-primary dark:hover:bg-primary/10",

        // Glass — frosted glass
        glass:
          "backdrop-blur-xl bg-white/8 border border-white/12 text-foreground"
          + " hover:bg-white/12 hover:border-primary/30"
          + " dark:bg-white/5 dark:border-primary/15 dark:hover:bg-primary/10",

        // Link
        link: "text-primary underline-offset-4 hover:underline rounded-none h-auto px-0 py-0 font-medium",
      },
      size: {
        sm:      "h-8  rounded-lg  px-3  text-xs gap-1.5",
        default: "h-10 rounded-xl  px-5",
        lg:      "h-12 rounded-xl  px-7  text-base",
        xl:      "h-14 rounded-2xl px-9  text-base",
        icon:    "size-10 rounded-xl",
        "icon-sm":"size-8  rounded-lg",
        "icon-lg":"size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
