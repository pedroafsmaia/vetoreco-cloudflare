import React from "react";

type TooltipPosition = "top" | "bottom";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: TooltipPosition;
}

export function Tooltip({
  content,
  children,
  position = "top",
}: TooltipProps) {
  return (
    <span className={`tooltip-wrapper tooltip-${position}`}>
      {children}
      <span className="tooltip-content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
