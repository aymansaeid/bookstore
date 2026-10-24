import { useRef, useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import type { PublicLegalType } from '@/features/legal/api';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

import { type AdminLegalDocument, adminLegalApi, LEGAL_LIMITS, type LegalLanguage } from '../api';
import { LEGAL_STATUS, PLACEHOLDER_LABELS, placeholdersIn } from '../labels';
import { useLegalMutation, useLegalPlaceholders } from '../queries';

import local from './LegalEditor.module.css';

interface LegalEditorProps {
  type: PublicLegalType;
  language: LegalLanguage;
  /** null = a new version. */
  doc: AdminLegalDocument | null;
  /** For a new version: the text it starts from. */
  base: AdminLegalDocument | null;
  onCreated: (id: number) => void;
  /** Frozen versions can only be copied into a new draft. */
  onBranch: (from: AdminLegalDocument) => void;
}

/** Placeholders the template may use; a click puts {{Name}} at the cursor. */
function PlaceholderHelp({ onInsert }: { onInsert: (name: string) => void }) {
  const placeholders = useLegalPlaceholders();
  if (!placeholders.data) return null;
  return (
    <details className={local.help}>
      <summary>الحقول التلقائية ({formatCount(Object.keys(placeholders.data).length)})</summary>
      <p className={styles.muted}>
        تُستبدل عند كل طلب ببياناته، وتظهر «—» في الصفحة العامة. اضغط لإدراجها في مكان المؤشر.
      </p>
      <ul className={local.chips}>
        {Object.entries(placeholders.data).map(([name, english]) => (
          <li key={name}>
            <button
              type="button"
              className={local.chip}
              onClick={() => {
                onInsert(name);
              }}
            >
              <bdi className={local.code}>{`{{${name}}}`}</bdi>
              <span>{PLACEHOLDER_LABELS[name] ?? english}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** A frozen (published or archived) version: read only. */
function FrozenVersion({
  doc,
  onBranch,
}: {
  doc: AdminLegalDocument;
  onBranch: (from: AdminLegalDocument) => void;
}) {
  return (
    <div className={local.stack}>
      <p className={styles.muted}>
        {doc.status === 'Published'
          ? `منشورة منذ ${doc.publishedAtUtc ? formatDateTime(doc.publishedAtUtc) : '—'}، وتُحفظ مع كل طلب جديد.`
          : `أُرشفت ${doc.archivedAtUtc ? formatDateTime(doc.archivedAtUtc) : ''}. تبقى محفوظة مع الطلبات التي وافقت عليها.`}{' '}
        النسخ المنشورة لا تُعدَّل؛ لتغيير النص أنشئ نسخة جديدة.
      </p>
      <h3 className={local.docTitle}>{doc.title}</h3>
      <pre className={local.frozen} dir="auto">
        {doc.bodyMarkdown}
      </pre>
      <div className={styles.buttons}>
        <Button
          variant="ink"
          size="sm"
          onClick={() => {
            onBranch(doc);
          }}
        >
          نسخة جديدة من هذا النص
        </Button>
      </div>
    </div>
  );
}

/** Draft editor (API §10 /admin/legal): Markdown with {{placeholders}}, then publish. */
export function LegalEditor({ type, language, doc, base, onCreated, onBranch }: LegalEditorProps) {
  const creating = doc === null;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const placeholders = useLegalPlaceholders();
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState(doc?.title ?? base?.title ?? '');
  const [body, setBody] = useState(doc?.bodyMarkdown ?? base?.bodyMarkdown ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const save = useLegalMutation(
    () =>
      doc
        ? adminLegalApi.update(doc.id, { title: title.trim(), bodyMarkdown: body })
        : adminLegalApi.create({
            type,
            language,
            version: version.trim(),
            title: title.trim(),
            bodyMarkdown: body,
          }),
    creating ? 'أُنشئت المسودة.' : 'حُفظت المسودة.',
  );
  const publish = useLegalMutation(
    () => adminLegalApi.publish(doc?.id ?? 0),
    'نُشرت النسخة، وأُرشفت السابقة.',
  );

  if (doc && doc.status !== 'Draft') return <FrozenVersion doc={doc} onBranch={onBranch} />;

  const known = placeholders.data ? new Set(Object.keys(placeholders.data)) : null;
  const unknown = known ? placeholdersIn(body).filter((name) => !known.has(name)) : [];
  const dirty = doc ? title !== doc.title || body !== doc.bodyMarkdown : true;

  const insert = (name: string) => {
    const area = bodyRef.current;
    const token = `{{${name}}}`;
    if (!area) {
      setBody(body + token);
      return;
    }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    setBody(body.slice(0, start) + token + body.slice(end));
    // Put the cursor after the inserted token once React has re-rendered.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <form
      className={local.stack}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setProblem(null);
        if (creating && version.trim() === '') {
          setProblem('اكتب رقم النسخة.');
          return;
        }
        if (title.trim() === '' || body.trim() === '') {
          setProblem('العنوان والنص مطلوبان.');
          return;
        }
        save.mutate(undefined, {
          onSuccess: (saved) => {
            if (creating) onCreated(saved.id);
          },
        });
      }}
    >
      {base && creating && (
        <p className={styles.muted}>
          تبدأ من نص النسخة <bdi className={local.code}>{base.version}</bdi>. النسخة الحالية تبقى
          منشورة حتى تنشر هذه.
        </p>
      )}
      <div className={local.grid}>
        {creating ? (
          <TextField
            label="رقم النسخة"
            hint="مثل 2026-10 أو 1.1. يُحفظ مع كل طلب، ولا يتكرر للنص نفسه."
            dir="ltr"
            maxLength={LEGAL_LIMITS.version}
            value={version}
            onChange={(event) => {
              setVersion(event.target.value);
            }}
          />
        ) : (
          <dl className={local.fixed}>
            <dt>النسخة</dt>
            <dd>
              <bdi className={local.code}>{doc.version}</bdi> · {LEGAL_STATUS.Draft.label}
            </dd>
          </dl>
        )}
        <TextField
          label="العنوان"
          maxLength={LEGAL_LIMITS.title}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </div>

      <div className={local.bodyField}>
        <label htmlFor="legal-body" className={local.label}>
          النص (Markdown)
        </label>
        <textarea
          ref={bodyRef}
          id="legal-body"
          className={local.body}
          dir="auto"
          rows={22}
          maxLength={LEGAL_LIMITS.body}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
          }}
        />
        <p className={styles.sub}>
          ## للعناوين، و**نص** للخط العريض، وجداول بالخط العمودي |. لا يُقبل HTML.
        </p>
      </div>

      <PlaceholderHelp onInsert={insert} />

      {unknown.length > 0 && (
        <FormAlert>
          حقول غير معروفة، صحّحها قبل النشر:{' '}
          {unknown.map((name) => (
            <bdi key={name} className={local.code}>{`{{${name}}} `}</bdi>
          ))}
        </FormAlert>
      )}
      {problem && <FormAlert>{problem}</FormAlert>}

      <div className={styles.buttons}>
        <Button type="submit" variant="ink" disabled={save.isPending || !dirty}>
          {save.isPending ? 'جارٍ الحفظ…' : creating ? 'إنشاء المسودة' : 'حفظ المسودة'}
        </Button>
        {doc && !confirming && (
          <Button
            variant="red"
            disabled={dirty || unknown.length > 0 || publish.isPending}
            onClick={() => {
              setConfirming(true);
            }}
          >
            نشر هذه النسخة
          </Button>
        )}
      </div>
      {doc && dirty && <p className={styles.sub}>احفظ المسودة قبل نشرها.</p>}

      {doc && confirming && (
        <div className={styles.actionForm} role="group" aria-label="تأكيد النشر">
          <p className={styles.actionTitle}>نشر النسخة {doc.version}؟</p>
          <p className={styles.muted}>
            تصبح النص الذي يوافق عليه كل مشترٍ جديد، وتُؤرشف النسخة المنشورة الآن. الطلبات السابقة
            تبقى مرتبطة بالنص الذي وافقت عليه. لا يمكن تعديلها بعد النشر.
          </p>
          <div className={styles.buttons}>
            <Button
              variant="red"
              size="sm"
              disabled={publish.isPending}
              onClick={() => {
                publish.mutate(undefined, {
                  onSettled: () => {
                    setConfirming(false);
                  },
                });
              }}
            >
              {publish.isPending ? 'جارٍ النشر…' : 'نعم، انشر'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}