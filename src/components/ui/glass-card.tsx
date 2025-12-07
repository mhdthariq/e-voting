import React from "react";
import { cn } from "@/lib/theme";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: "low" | "medium" | "high";
}

export function GlassCard({ 
  children, 
  className, 
  intensity = "medium",
  ...props 
}: GlassCardProps) {
  const intensityClasses = {
    low: "bg-white/50 dark:bg-black/30 backdrop-blur-sm border-white/20",
    medium: "bg-glass-bg backdrop-blur-md border-white/30 dark:border-white/10",
    high: "bg-white/90 dark:bg-black/80 backdrop-blur-lg border-white/40",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-xl transition-all duration-500",
        intensityClasses[intensity],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
