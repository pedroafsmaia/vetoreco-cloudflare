import React from "react";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  green: "badge-success",
  yellow: "badge-warning",
  red: "badge-error",
  blue: "badge-info",
  gray: "badge-neutral",
};

export function Badge({
  variant = "gray",
  children,
  className,
}: BadgeProps) {
  const classes = ["badge", variantClass[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
