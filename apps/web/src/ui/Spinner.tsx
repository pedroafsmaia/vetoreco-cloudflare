import React from "react";

type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: "spinner-sm",
  md: "spinner-md",
  lg: "spinner-lg",
};

export function Spinner({
  size = "md",
  label = "Carregando...",
}: SpinnerProps) {
  return (
    <span
      className={`spinner ${sizeClass[size]}`}
      role="status"
      aria-label={label}
    />
  
  );
}
