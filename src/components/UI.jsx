import React from 'react';

export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionHead({ kicker, title, action }) {
  return (
    <div className="section-head">
      <div>
        {kicker && <p className="section-kicker">{kicker}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, variant = '' }) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100));
  return (
    <div className={`progress ${variant}`}>
      <div style={{ width: `${safeValue}%` }} />
    </div>
  );
}

export function StatusPill({ status }) {
  const cls = status === 'Aman' ? 'safe' : status === 'Mendekati' ? 'warn' : 'danger';
  return <span className={`pill ${cls}`}>{status}</span>;
}

export function EmptyState({ emoji = '📝', title, description }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <h3>{title}</h3>
      <p className="muted tiny">{description}</p>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
