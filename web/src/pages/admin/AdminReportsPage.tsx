import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { addDays, storeToday } from '@/features/admin/dates';
import {
  adminSystemApi,
  type CsvDelimiter,
  MAX_EXPORT_DAYS,
  saveFile,
} from '@/features/admin/system/api';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';
import { toast } from '@/shared/ui/toast/toastStore';

import local from './AdminReportsPage.module.css';

interface Range {
  from: string;
  to: string;
}

/** Calendar days between two YYYY-MM-DD dates. */
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Quick ranges in Istanbul days. Impure (today), so built on click. */
const PRESETS: { label: string; range: () => Range }[] = [
  {
    label: 'آخر ٣٠ يوماً',
    range: () => ({ from: addDays(storeToday(), -29), to: storeToday() }),
  },
  {
    label: 'هذا الشهر',
    range: () => ({ from: `${storeToday().slice(0, 7)}-01`, to: storeToday() }),
  },
  {
    label: 'الشهر الماضي',
    range: () => {
      const lastDay = addDays(`${storeToday().slice(0, 7)}-01`, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    },
  },
  {
    label: 'هذه السنة',
    range: () => ({ from: `${storeToday().slice(0, 4)}-01-01`, to: storeToday() }),
  },
];

const DELIMITERS: { value: CsvDelimiter; label: string; hint: string }[] = [
  {
    value: 'Semicolon',
    label: 'Excel بإعدادات تركية أو عربية',
    hint: 'فاصلة منقوطة بين الأعمدة، والكسور بفاصلة (1234,50).',
  },
  {
    value: 'Comma',
    label: 'Google Sheets وExcel الإنجليزي',
    hint: 'فاصلة بين الأعمدة، والكسور بنقطة (1234.50).',
  },
];

const COLUMNS = [
  'رقم الطلب',
  'تاريخ الإنشاء والدفع',
  'الحالة',
  'بريد العميل',
  'المستلم والمدينة والدولة',
  'عدد الكتب',
  'المجموع والخصم والشحن والإجمالي',
  'الكوبون',
  'شركة الشحن ورقم التتبع',
  'مرجع الدفع',
  'المُرجَع والمُسترَد',
];

/** Reports (API §10): the orders CSV for accounting. */
export default function AdminReportsPage() {
  const [range, setRange] = useState<Range>(() => PRESETS[0]?.range() ?? { from: '', to: '' });
  const [delimiter, setDelimiter] = useState<CsvDelimiter>('Semicolon');
  const [problem, setProblem] = useState<string | null>(null);

  const download = useMutation({
    mutationFn: async (r: Range) => {
      const blob = await adminSystemApi.exportOrders(r.from, r.to, delimiter);
      // Same name the API gives it.
      saveFile(blob, `orders_${r.from}_to_${r.to}.csv`);
    },
    onSuccess: () => {
      toast.success('بدأ تنزيل الملف.');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  return (
    <>
      <AdminPageHeader title="التقارير" />

      <section className={styles.card} aria-labelledby="orders-csv">
        <h2 id="orders-csv" className={styles.cardTitle}>
          تصدير الطلبات (CSV)
        </h2>
        <p className={styles.muted}>
          طلب في كل سطر، للمحاسبة والإقرارات الضريبية. الأيام بتوقيت إسطنبول، حتى سنة واحدة في
          الملف. يُسجَّل كل تصدير في سجل التدقيق لأنه يحوي بيانات العملاء.
        </p>

        <form
          className={local.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setProblem(null);
            if (range.from === '' || range.to === '') {
              setProblem('اختر تاريخ البداية والنهاية.');
              return;
            }
            const days = daysBetween(range.from, range.to);
            if (days < 0) {
              setProblem('تاريخ البداية بعد تاريخ النهاية.');
              return;
            }
            if (days > MAX_EXPORT_DAYS) {
              setProblem(`المدة أطول من سنة. اختر ${formatCount(MAX_EXPORT_DAYS)} يوماً أو أقل.`);
              return;
            }
            download.mutate(range);
          }}
        >
          <div className={local.presets} role="group" aria-label="مدة جاهزة">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.filter}
                onClick={() => {
                  setRange(preset.range());
                  setProblem(null);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className={local.dates}>
            <TextField
              label="من"
              type="date"
              dir="ltr"
              value={range.from}
              onChange={(event) => {
                setRange({ ...range, from: event.target.value });
              }}
            />
            <TextField
              label="إلى"
              type="date"
              dir="ltr"
              value={range.to}
              onChange={(event) => {
                setRange({ ...range, to: event.target.value });
              }}
            />
          </div>

          <fieldset className={local.delimiters}>
            <legend className={local.legend}>البرنامج الذي ستفتح به الملف</legend>
            {DELIMITERS.map((option) => (
              <label key={option.value} className={local.radio}>
                <input
                  type="radio"
                  name="delimiter"
                  value={option.value}
                  checked={delimiter === option.value}
                  onChange={() => {
                    setDelimiter(option.value);
                  }}
                />
                <span className={local.radioLabel}>{option.label}</span>
                <span className={local.radioHint}>{option.hint}</span>
              </label>
            ))}
          </fieldset>

          {problem && <FormAlert>{problem}</FormAlert>}

          <div className={styles.buttons}>
            <Button type="submit" variant="ink" disabled={download.isPending}>
              {download.isPending ? 'جارٍ التحضير…' : 'تنزيل الملف'}
            </Button>
          </div>
        </form>

        <details className={local.columns}>
          <summary>الأعمدة في الملف</summary>
          <ul>
            {COLUMNS.map((column) => (
              <li key={column}>{column}</li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}