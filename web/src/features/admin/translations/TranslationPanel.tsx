import { useMutation } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useSaveShortcut } from '@/features/admin/lib/useSaveShortcut';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import { TRANSLATION_LANGUAGES, type TranslationLanguage } from './api';
import styles from './TranslationPanel.module.css';
import { splitLines } from './values';

/** One translatable field, with its Arabic shown beside it. */
export interface TranslationField {
  key: string;
  label: string;
  /** lines: a list typed one item per line (specialties, highlights). */
  kind: 'text' | 'textarea' | 'lines';
  /** Characters per value, or per line for `lines`. */
  max: number;
  maxLines?: number;
  required?: boolean;
  /** The Arabic. A list for `lines`. */
  source: string | readonly string[] | null;
  hint?: string;
  rows?: number;
}

/** Field key → text (a `lines` field joined with newlines). */
export type TranslationValues = Record<string, string>;

export interface SavedTranslation {
  values: TranslationValues;
  /** null where the API doesn't say (shipping). */
  updatedAtUtc: string | null;
}

const emptyValues = (fields: TranslationField[]): TranslationValues =>
  Object.fromEntries(fields.map((field) => [field.key, '']));

function check(fields: TranslationField[], values: TranslationValues) {
  const problems: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key] ?? '';
    if (field.required && value.trim() === '') {
      problems[field.key] = `${field.label}: مطلوب في الترجمة.`;
    } else if (field.kind === 'lines') {
      const items = splitLines(value);
      if (field.maxLines !== undefined && items.length > field.maxLines) {
        problems[field.key] =
          `${formatCount(field.maxLines)} أسطر على الأكثر، لديك ${formatCount(items.length)}.`;
      } else if (items.some((item) => item.length > field.max)) {
        problems[field.key] = `كل سطر ${formatCount(field.max)} حرفاً على الأكثر.`;
      }
    }
  }
  return problems;
}

/** Validation errors from the API ("Name", "stages[0].Reason") on the matching field, else general. */
function serverProblems(fields: TranslationField[], error: unknown) {
  if (!(error instanceof ApiError) || error.code !== 'Validation') return {};
  const problems: Record<string, string> = {};
  for (const key of Object.keys(error.fieldErrors)) {
    const head = key.split(/[.[]/)[0]?.toLowerCase();
    const field = fields.find((item) => item.key.toLowerCase() === head);
    problems[field?.key ?? '_'] = 'القيمة غير مقبولة، راجع الطول.';
  }
  return problems;
}

function Source({ field }: { field: TranslationField }) {
  if (field.source === null || field.source === '' || field.source.length === 0) {
    return <span className={styles.none}>— لا يوجد —</span>;
  }
  if (typeof field.source === 'string') return <>{field.source}</>;
  return (
    <ol className={styles.sourceList}>
      {field.source.map((item, index) => (
        <li key={`${item}-${String(index)}`}>{item}</li>
      ))}
    </ol>
  );
}

function Row({ field, children }: { field: TranslationField; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.source} lang="ar" dir="rtl">
        <span className={styles.sourceLabel}>العربية</span>
        <div className={styles.sourceText}>
          <Source field={field} />
        </div>
      </div>
      <div className={styles.target}>{children}</div>
    </div>
  );
}

interface FormProps {
  language: TranslationLanguage;
  fields: TranslationField[];
  saved: SavedTranslation | undefined;
  active: boolean;
  nextLanguage: TranslationLanguage | null;
  save: (language: TranslationLanguage, values: TranslationValues) => Promise<unknown>;
  remove: (language: TranslationLanguage) => Promise<unknown>;
  onChanged: () => void;
  onDirtyChange: (language: TranslationLanguage, dirty: boolean) => void;
  onGoTo: (language: TranslationLanguage) => void;
}

function LanguageForm({
  language,
  fields,
  saved,
  active,
  nextLanguage,
  save,
  remove,
  onChanged,
  onDirtyChange,
  onGoTo,
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [initial, setInitial] = useState(() => ({ ...emptyValues(fields), ...saved?.values }));
  const [values, setValues] = useState(initial);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const goNext = useRef(false);
  const meta = TRANSLATION_LANGUAGES.find((item) => item.code === language);
  const nextMeta = TRANSLATION_LANGUAGES.find((item) => item.code === nextLanguage);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const saving = useMutation({
    mutationFn: (next: TranslationValues) => save(language, next),
    onSuccess: (_result, next) => {
      // Clean at once; the refetch then remounts this form with the saved text.
      setInitial(next);
      toast.success(`حُفظت الترجمة ${meta?.label ?? ''}.`);
      onChanged();
      if (goNext.current && nextLanguage) onGoTo(nextLanguage);
      goNext.current = false;
    },
    onError: (error) => {
      goNext.current = false;
      setProblems(serverProblems(fields, error));
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });
  const deleting = useMutation({
    mutationFn: () => remove(language),
    onSuccess: () => {
      toast.success('حُذفت الترجمة. ستظهر النصوص العربية مكانها.');
      onChanged();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  useEffect(() => {
    onDirtyChange(language, dirty);
  }, [dirty, language, onDirtyChange]);
  useSaveShortcut(formRef, active && dirty);

  return (
    <form
      ref={formRef}
      noValidate
      className={styles.form}
      hidden={!active}
      aria-label={`الترجمة ${meta?.label ?? ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        const found = check(fields, values);
        setProblems(found);
        if (Object.keys(found).length > 0) {
          goNext.current = false;
          return;
        }
        saving.mutate(values);
      }}
    >
      {problems._ && <FormAlert>{problems._}</FormAlert>}

      {fields.map((field) => {
        const common = {
          label:
            field.kind === 'lines'
              ? `${field.label}، سطر لكل عنصر (${formatCount(splitLines(values[field.key] ?? '').length)})`
              : field.label,
          hint: field.hint,
          error: problems[field.key],
          lang: language,
          dir: 'ltr' as const,
          value: values[field.key] ?? '',
          required: field.required,
          onChange: (event: { target: { value: string } }) => {
            setValues({ ...values, [field.key]: event.target.value });
            if (problems[field.key]) {
              setProblems(
                Object.fromEntries(Object.entries(problems).filter(([key]) => key !== field.key)),
              );
            }
          },
        };
        return (
          <Row key={field.key} field={field}>
            {field.kind === 'text' ? (
              <TextField maxLength={field.max} {...common} />
            ) : (
              <TextAreaField
                rows={field.rows ?? (field.kind === 'lines' ? 4 : 5)}
                maxLength={field.kind === 'textarea' ? field.max : undefined}
                {...common}
              />
            )}
          </Row>
        );
      })}

      <div className={styles.bar}>
        <span className={styles.state} aria-live="polite">
          {dirty ? (
            <b className={styles.dirty}>تغييرات غير محفوظة</b>
          ) : saved ? (
            saved.updatedAtUtc ? (
              `آخر حفظ ${formatDateTime(saved.updatedAtUtc)}`
            ) : (
              'محفوظة'
            )
          ) : (
            'لم تُترجم بعد'
          )}
        </span>
        <div className={styles.barButtons}>
          {saved && (
            <Button
              variant="ghost"
              size="sm"
              className={cx(confirmDelete && styles.confirm)}
              disabled={deleting.isPending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                deleting.mutate();
              }}
              onBlur={() => {
                setConfirmDelete(false);
              }}
            >
              {confirmDelete ? 'اضغط مجدداً للحذف' : 'حذف الترجمة'}
            </Button>
          )}
          {nextMeta && (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={saving.isPending}
              onClick={() => {
                goNext.current = true;
              }}
            >
              حفظ ثم {nextMeta.label} ←
            </Button>
          )}
          <Button type="submit" variant="ink" size="sm" disabled={saving.isPending}>
            {saving.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
            <kbd className={styles.kbd} aria-hidden="true">
              Ctrl S
            </kbd>
          </Button>
        </div>
      </div>
    </form>
  );
}

export interface TranslationPanelProps {
  fields: TranslationField[];
  saved: Partial<Record<TranslationLanguage, SavedTranslation>>;
  save: (language: TranslationLanguage, values: TranslationValues) => Promise<unknown>;
  remove: (language: TranslationLanguage) => Promise<unknown>;
  /** After a save or delete: refetch. */
  onChanged: () => void;
  /** Either language has unsaved edits. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * English and Turkish tabs, each field beside its Arabic (API §2b). Both
 * forms stay mounted, so switching tabs never loses typing. Opens on the
 * first language still missing.
 */
export function TranslationPanel({
  fields,
  saved,
  save,
  remove,
  onChanged,
  onDirtyChange: reportDirty,
}: TranslationPanelProps) {
  const [language, setLanguage] = useState<TranslationLanguage>(
    () => TRANSLATION_LANGUAGES.find((item) => !saved[item.code])?.code ?? 'en',
  );
  const [dirty, setDirty] = useState<Record<TranslationLanguage, boolean>>({
    en: false,
    tr: false,
  });
  const [onDirtyChange] = useState(() => (code: TranslationLanguage, value: boolean) => {
    setDirty((old) => (old[code] === value ? old : { ...old, [code]: value }));
  });
  const anyDirty = dirty.en || dirty.tr;
  useEffect(() => {
    reportDirty?.(anyDirty);
  }, [anyDirty, reportDirty]);
  // Closed (another record picked): nothing of ours is pending any more.
  useEffect(
    () => () => {
      reportDirty?.(false);
    },
    [reportDirty],
  );

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label="لغة الترجمة">
        {TRANSLATION_LANGUAGES.map((item) => {
          const done = saved[item.code] !== undefined;
          return (
            <button
              key={item.code}
              type="button"
              role="tab"
              aria-selected={language === item.code}
              className={cx(styles.tab, language === item.code && styles.tabOn)}
              onClick={() => {
                setLanguage(item.code);
              }}
            >
              <span lang={item.code}>{item.native}</span>
              <span className={cx(styles.status, done ? styles.done : styles.todo)}>
                {dirty[item.code] ? 'غير محفوظة' : done ? 'مترجمة' : 'ناقصة'}
              </span>
            </button>
          );
        })}
      </div>

      {TRANSLATION_LANGUAGES.map((item) => {
        const current = saved[item.code];
        const other = TRANSLATION_LANGUAGES.find((x) => x.code !== item.code)?.code ?? null;
        return (
          <LanguageForm
            // Fresh form after a save or delete: the saved text becomes the new baseline.
            key={`${item.code}|${current ? (current.updatedAtUtc ?? JSON.stringify(current.values)) : 'none'}|${fields.map((f) => f.key).join()}`}
            language={item.code}
            fields={fields}
            saved={current}
            active={language === item.code}
            nextLanguage={other && saved[other] === undefined ? other : null}
            save={save}
            remove={remove}
            onChanged={onChanged}
            onDirtyChange={onDirtyChange}
            onGoTo={setLanguage}
          />
        );
      })}
    </div>
  );
}

/** Loading and error states shared by the panels. */
export function PanelState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return error ? (
    <div role="alert" className={styles.problem}>
      <p>{errorMessage(error)}</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        أعد المحاولة
      </Button>
    </div>
  ) : (
    <div className={styles.loading} aria-busy="true" aria-label="جارٍ تحميل الترجمات" />
  );
}

export function PanelNote({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}