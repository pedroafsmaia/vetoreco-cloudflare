import React from "react";

type CardVariant = "default" | "sub" | "interactive";

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<CardVariant, string> = {
  default: "",
  sub: "sub",
  interactive: "interactive",
};

export function Card({
  variant = "default",
  children,
  className,
}: CardProps) {
  const classes = ["card", variantClass[variant], className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
