import { type ComponentProps, type ReactNode, useId, useState } from 'react';

import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './Field.module.css';

interface FieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function Messages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className={styles.error}>
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className={styles.hint}>
        {hint}
      </p>
    );
  }
  return null;
}

/** 52px field, ink focus ring, red error state. Works with react-hook-form's register(). */
export function TextField({ label, error, hint, id, className, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        {...input}
      />
      <Messages id={inputId} hint={hint} error={error} />
    </div>
  );
}

/** Password with a show/hide toggle. */
export function PasswordField({ label, error, hint, id, className, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          dir="ltr"
          className={cx(styles.input, styles.withButton, error && styles.invalid)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          {...input}
        />
        <button
          type="button"
          className={styles.reveal}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          aria-pressed={visible}
          onClick={() => {
            setVisible((value) => !value);
          }}
        >
          <Icon name="eye" />
        </button>
      </div>
      <Messages id={inputId} hint={hint} error={error} />
    </div>
  );
}

/** Black-when-checked checkbox with a 44px touch row. */
export function Checkbox({
  children,
  className,
  ...input
}: ComponentProps<'input'> & { children: ReactNode }) {
  return (
    <label className={cx(styles.check, className)}>
      <input type="checkbox" className={styles.checkInput} {...input} />
      <span>{children}</span>
    </label>
  );
}

export function FormAlert({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success';
}) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx(styles.alert, styles[tone])}>
      {children}
    </div>
  );
}

/** Multi-line field, same look as TextField. */
export function TextAreaField({
  label,
  error,
  hint,
  id,
  className,
  ...textarea
}: ComponentProps<'textarea'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <textarea
        id={inputId}
        className={cx(styles.input, styles.textarea, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        {...textarea}
      />
      <Messages id={inputId} hint={hint} error={error} />
    </div>
  );
}

/** Native select, same look as TextField. Works with react-hook-form's register(). */
export function SelectField({
  label,
  error,
  hint,
  id,
  className,
  children,
  ...select
}: ComponentProps<'select'> & {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <select
        id={inputId}
        className={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        {...select}
      >
        {children}
      </select>
      <Messages id={inputId} hint={hint} error={error} />
    </div>
  );
}
