import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

const controlBase =
  'block w-full rounded-lg border border-border-strong bg-surface text-sm text-fg shadow-xs transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger';

export const inputClasses = cn(controlBase, 'h-9 px-3');

const textAreaClasses = cn(
  controlBase,
  'min-h-24 resize-y px-3 py-2 leading-6',
);

const selectClasses = cn(controlBase, 'h-9 appearance-none pr-9 pl-3');

interface FieldProps {
  /** Required: labels and messages are wired to the control by id. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Shown after the label, e.g. "Optional" or a character count. */
  labelAside?: ReactNode;
  className?: string;
}

/** ARIA wiring shared by every field type. */
function describe(id: string, hint?: ReactNode, error?: ReactNode) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return {
    'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined,
    'aria-invalid': error ? true : undefined,
  };
}

function FieldShell({
  id,
  label,
  hint,
  error,
  labelAside,
  className,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {labelAside && (
          <span className="text-xs text-fg-subtle tabular-nums">
            {labelAside}
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>;

/** Labelled input with optional hint and error, wired up for assistive tech. */
export function TextField({
  id,
  label,
  hint,
  error,
  labelAside,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, labelAside, className }}>
      <input
        id={id}
        className={inputClasses}
        {...describe(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

export type TextAreaFieldProps = FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>;

export function TextAreaField({
  id,
  label,
  hint,
  error,
  labelAside,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, labelAside, className }}>
      <textarea
        id={id}
        className={textAreaClasses}
        {...describe(id, hint, error)}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectFieldProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  };

/** Native select: keyboard, screen-reader and mobile pickers for free. */
export function SelectField({
  id,
  label,
  hint,
  error,
  labelAside,
  className,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell {...{ id, label, hint, error, labelAside, className }}>
      <div className="relative">
        <select
          id={id}
          className={selectClasses}
          {...describe(id, hint, error)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
        </svg>
      </div>
    </FieldShell>
  );
}
