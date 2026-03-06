import React from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}

const variantClass: Record<AlertVariant, string> = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
}: AlertProps) {
  const role = variant === "error" || variant === "warning" ? "alert" : "status";
  const classes = `alert ${variantClass[variant]}`;

  return (
    <div className={classes} role={role}>
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          className="btn btn-ghost btn-sm alert-dismiss"
          onClick={onDismiss}
          aria-label="Fechar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
}
