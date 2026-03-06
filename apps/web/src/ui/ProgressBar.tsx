import React from "react";

type ProgressVariant = "green" | "yellow" | "red" | "blue";

export interface ProgressBarProps {
  value: number;
  variant?: ProgressVariant;
  label?: string;
  showLabel?: boolean;
}

const variantClass: Record<ProgressVariant, string> = {
  green: "progress-bar-green",
  yellow: "progress-bar-yellow",
  red: "progress-bar-red",
  blue: "progress-bar-blue",
};

export function ProgressBar({
  value,
  variant = "green",
  label,
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div>
      {showLabel && (
        <div className="progress-bar-label">
          {label ?? `${Math.round(clamped)}%`}
        </div>
      )}
      <div
        className={`progress-bar ${variantClass[variant]}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${Math.round(clamped)}%`}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
