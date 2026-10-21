import { useState } from 'react';

import { badgeLabel, type BookBadge, levelLabel, type ReaderLevel } from '@/shared/api/enums';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Checkbox, FormAlert, SelectField, TextField } from '@/shared/ui/form/Field';

import { type AdminBook, adminBooksApi, BOOK_LIMITS, type MerchandisingInput } from '../api';
import { useBookMutation } from '../queries';

import styles from './BookEditor.module.css';

const LEVELS: ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];
const BADGES: BookBadge[] = ['New', 'Deluxe', 'Bestseller'];

/** Old price, level, volumes, edition label, badges and highlights (API §4c). */
export function BookMerchandisingForm({ book }: { book: AdminBook }) {
  const [level, setLevel] = useState<ReaderLevel | ''>(book.level ?? '');
  const [volumes, setVolumes] = useState(book.volumes === null ? '' : String(book.volumes));
  const [oldPrice, setOldPrice] = useState(
    book.compareAtPrice === null ? '' : String(book.compareAtPrice),
  );
  const [editionLabel, setEditionLabel] = useState(book.editionLabel ?? '');
  const [installments, setInstallments] = useState(book.installmentsAllowed);
  const [badges, setBadges] = useState<BookBadge[]>(book.badges);
  const [highlights, setHighlights] = useState<string[]>(book.highlights);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const save = useBookMutation(
    book.id,
    (input: MerchandisingInput) => adminBooksApi.setMerchandising(book.id, input),
    'حُفظت بيانات العرض.',
  );

  const addHighlight = () => {
    const text = draft.trim();
    if (text === '' || highlights.length >= BOOK_LIMITS.maxHighlights) return;
    setHighlights([...highlights, text.slice(0, BOOK_LIMITS.maxHighlightLength)]);
    setDraft('');
  };

  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        setProblem(null);
        const volumesValue = volumes.trim() === '' ? null : Number(volumes);
        const oldPriceValue = oldPrice.trim() === '' ? null : Number(oldPrice);
        if (
          volumesValue !== null &&
          (!Number.isInteger(volumesValue) ||
            volumesValue < 1 ||
            volumesValue > BOOK_LIMITS.maxVolumes)
        ) {
          setProblem(`عدد المجلدات بين ١ و${formatCount(BOOK_LIMITS.maxVolumes)}.`);
          return;
        }
        if (oldPriceValue !== null && !(oldPriceValue > book.price)) {
          setProblem('السعر القديم يجب أن يكون أعلى من السعر الحالي، وإلا اتركه فارغاً.');
          return;
        }
        save.mutate({
          level: level === '' ? null : level,
          volumes: volumesValue,
          compareAtPrice: oldPriceValue,
          installmentsAllowed: installments,
          highlights,
          badges,
          editionLabel: editionLabel.trim() === '' ? null : editionLabel.trim(),
        });
      }}
    >
      {problem && <FormAlert>{problem}</FormAlert>}

      <div className={styles.grid}>
        <TextField
          label="السعر قبل الخصم (اختياري)"
          hint={`السعر الحالي ${formatMoney(book.price, book.currency)}. يظهر القديم مشطوباً مع «وفّر».`}
          dir="ltr"
          inputMode="decimal"
          value={oldPrice}
          onChange={(event) => {
            setOldPrice(event.target.value);
          }}
        />
        <SelectField
          label="مستوى القارئ"
          value={level}
          onChange={(event) => {
            setLevel(event.target.value as ReaderLevel | '');
          }}
        >
          <option value="">غير محدد</option>
          {LEVELS.map((value) => (
            <option key={value} value={value}>
              {levelLabel(value)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="عدد المجلدات (اختياري)"
          dir="ltr"
          inputMode="numeric"
          value={volumes}
          onChange={(event) => {
            setVolumes(event.target.value);
          }}
        />
        <TextField
          label="اسم الطبعة (اختياري)"
          hint="مثل «الكاملة ٦ مجلدات» أو «مجلد واحد»، يظهر في اختيار الطبعة."
          maxLength={BOOK_LIMITS.maxEditionLabel}
          value={editionLabel}
          onChange={(event) => {
            setEditionLabel(event.target.value);
          }}
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>الشارات</legend>
        <div className={styles.checks}>
          {BADGES.map((badge) => (
            <Checkbox
              key={badge}
              checked={badges.includes(badge)}
              onChange={() => {
                setBadges(
                  badges.includes(badge) ? badges.filter((b) => b !== badge) : [...badges, badge],
                );
              }}
            >
              {badgeLabel(badge)}
            </Checkbox>
          ))}
          <Checkbox
            checked={installments}
            onChange={() => {
              setInstallments(!installments);
            }}
          >
            يُسمح بالتقسيط
          </Checkbox>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          أبرز موضوعات الكتاب ({formatCount(highlights.length)} /{' '}
          {formatCount(BOOK_LIMITS.maxHighlights)})
        </legend>
        {highlights.length > 0 && (
          <ol className={styles.list}>
            {highlights.map((item, index) => (
              <li key={`${item}-${String(index)}`} className={styles.listItem}>
                <span className={styles.listText}>{item}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`نقل «${item}» للأعلى`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...highlights];
                    [next[index - 1], next[index]] = [next[index] ?? '', next[index - 1] ?? ''];
                    setHighlights(next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`حذف «${item}»`}
                  onClick={() => {
                    setHighlights(highlights.filter((_, i) => i !== index));
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className={styles.addRow}>
          <TextField
            label="موضوع جديد"
            maxLength={BOOK_LIMITS.maxHighlightLength}
            value={draft}
            disabled={highlights.length >= BOOK_LIMITS.maxHighlights}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addHighlight();
              }
            }}
          />
          <Button variant="ghost" size="sm" disabled={draft.trim() === ''} onClick={addHighlight}>
            إضافة
          </Button>
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="ink" disabled={save.isPending}>
          {save.isPending ? 'جارٍ الحفظ…' : 'حفظ بيانات العرض'}
        </Button>
      </div>
    </form>
  );
}