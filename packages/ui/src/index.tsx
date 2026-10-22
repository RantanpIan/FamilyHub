import type { ReactNode } from "react";

export type StatusTone = "neutral" | "success" | "warning" | "error";

export function StatusCard({
  icon,
  eyebrow,
  title,
  description,
  status,
  tone,
  compact = false,
}: {
  icon?: string;
  eyebrow?: string;
  title: string;
  description: string;
  status: string;
  tone: StatusTone;
  compact?: boolean;
}) {
  return (
    <article className={`status-card${compact ? " status-card-compact" : ""}`}>
      <div className="status-card-top">
        {icon && <span className="status-card-icon" aria-hidden="true">{icon}</span>}
        <span className={`status-pill status-pill-${tone}`}>{status}</span>
      </div>
      {eyebrow && <span className="status-card-eyebrow">{eyebrow}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export function LoadingState({ label = "Wird geladen" }: { label?: string }) {
  return (
    <div className="ui-state ui-loading" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Das hat nicht geklappt",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="ui-state ui-error" role="alert">
      <span className="ui-state-symbol" aria-hidden="true">!</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="ui-state ui-empty">
      <span className="empty-illustration" aria-hidden="true">✳</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
