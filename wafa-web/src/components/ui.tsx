import { ButtonHTMLAttributes, FormHTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Inbox, X } from 'lucide-react';

export function Button({ className = '', children, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`btn ${className}`} {...props}>{children}</button>;
}

export function PageHeader({ crumb, title, sub, actions }: { crumb: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return <div className="page-head"><div><div className="crumb"><span className="dot" />{crumb}</div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{actions && <div className="head-actions">{actions}</div>}</div>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel glass ${className}`}>{children}</section>;
}

export function EmptyState({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Inbox /></div><h4>{title}</h4><p>{sub}</p>{action}</div>;
}

export function Modal({ title, onClose, children, className = '' }: { title: ReactNode; onClose: () => void; children: ReactNode; className?: string }) {
  if (typeof document === 'undefined') return null;

  const onModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'textarea' || target?.isContentEditable) return;
    const form = target?.closest('form') as HTMLFormElement | null;
    if (form) return;
    const button = (event.currentTarget.querySelector('.form-actions .btn-primary:not(:disabled), .btn-primary:not(:disabled)') as HTMLButtonElement | null);
    if (button) { event.preventDefault(); button.click(); }
  };

  return createPortal(
    <div
      className="modal-back open"
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <div
        className={`modal glass-strong ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        onMouseDown={event => event.stopPropagation()}
        onKeyDown={onModalKeyDown}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function FormActions({ children }: { children: ReactNode }) { return <div className="form-actions">{children}</div>; }

export function SimpleForm({ children, ...props }: FormHTMLAttributes<HTMLFormElement>) { return <form {...props}>{children}</form>; }

export function Field({ label, span = 1, children }: { label: string; span?: 1 | 2 | 3; children: ReactNode }) {
  return <label className={`field field-span${span}`}><span>{label}</span>{children}</label>;
}

export function Badge({ children, color = 'cyan' }: { children: ReactNode; color?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'coral' | 'rose' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}
