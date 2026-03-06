import React from "react";

export interface Step {
  key: string;
  label: string;
}

export interface StepNavProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
}

export function StepNav({
  steps,
  currentStep,
  completedSteps = [],
}: StepNavProps) {
  return (
    <nav className="step-nav" aria-label="Progresso">
      <ol className="step-nav-list">
        {steps.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const isCompleted = completedSteps.includes(step.key);

          let state: string;
          if (isCurrent) state = "active";
          else if (isCompleted) state = "completed";
          else state = "pending";

          return (
            <li
              key={step.key}
              className={`step-item ${state}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="step-item-number">{index + 1}</span>
              <span className="step-item-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
