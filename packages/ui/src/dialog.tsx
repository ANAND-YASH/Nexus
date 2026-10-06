'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name. Visible unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  /** `center` for confirmations and forms; `start` slides in as a drawer. */
  placement?: 'center' | 'start';
  /** Width of a centered dialog. */
  size?: 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const placementClasses = {
  center:
    'm-auto w-[calc(100%-2rem)] rounded-xl border border-border open:animate-dialog-in',
  start:
    'my-0 mr-auto ml-0 h-dvh max-h-dvh w-[min(20rem,calc(100%-3rem))] border-r border-border open:animate-drawer-in',
} as const;

/**
 * Modal dialog on the native `<dialog>` element, which supplies the focus
 * trap, inert background, top-layer stacking and Escape handling.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  placement = 'center',
  size = 'md',
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={hideTitle ? title : undefined}
      aria-labelledby={hideTitle ? undefined : titleId}
      // Fires for Escape, form[method=dialog] and close(); keeps state in sync.
      onClose={onClose}
      // Clicks on the backdrop target the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'bg-surface-raised p-0 text-fg shadow-overlay backdrop:bg-scrim backdrop:backdrop-blur-[2px]',
        placementClasses[placement],
        placement === 'center' && (size === 'lg' ? 'max-w-xl' : 'max-w-md'),
        className,
      )}
    >
      {/* Fills the dialog so only true backdrop clicks reach the <dialog>. */}
      <div className="flex h-full flex-col">
        {!hideTitle && (
          <h2 id={titleId} className="px-5 pt-5 text-base font-semibold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
}
