import { useMutation } from '@tanstack/react-query';

import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { adminSystemApi } from '@/features/admin/system/api';
import { HEALTH_CHECKS, HEALTH_DATA, HEALTH_STATUS } from '@/features/admin/system/labels';
import { useHealth } from '@/features/admin/system/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { booksPhrase, formatAmount, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import local from './AdminHealthPage.module.css';

const ms = (value: number) => `${formatAmount(Math.round(value))} مللي ثانية`;

/** Search index and image variants: safe to run again; each is written to the audit log. */
function Maintenance() {
  const reindex = useMutation({
    mutationFn: () => adminSystemApi.reindexSearch(),
    onSuccess: (count) => {
      toast.success(`أُعيد بناء فهرس البحث: ${booksPhrase(count)}.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
  const images = useMutation({
    mutationFn: () => adminSystemApi.regenerateImages(),
    onSuccess: (result) => {
      toast.success(
        `اكتمل التحويل: ${formatCount(result.converted)} محوّلة، و${formatCount(result.missing)} ملفها مفقود، و${formatCount(result.failed)} تعذّر تحويلها.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  return (
    <section className={styles.card} aria-labelledby="maintenance">
      <h2 id="maintenance" className={styles.cardTitle}>
        صيانة
      </h2>
      <div className={local.tool}>
        <div>
          <p className={styles.actionTitle}>إعادة بناء فهرس البحث</p>
          <p className={styles.muted}>
            إن لم يجد البحث كتاباً موجوداً، أو بعد ترقية قاعدة البيانات. لا يوقف المتجر.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={reindex.isPending}
          onClick={() => {
            reindex.mutate();
          }}
        >
          {reindex.isPending ? 'جارٍ البناء…' : 'إعادة البناء'}
        </Button>
      </div>
      <div className={local.tool}>
        <div>
          <p className={styles.actionTitle}>تحويل الصور القديمة</p>
          <p className={styles.muted}>
            يصنع نسخ WebP بأحجام مختلفة للصور المرفوعة قبل دعمها، فتُحمَّل الصفحات أسرع. آمن
            التكرار؛ المحوَّل يُتخطّى.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={images.isPending}
          onClick={() => {
            images.mutate();
          }}
        >
          {images.isPending ? 'جارٍ التحويل…' : 'تحويل'}
        </Button>
      </div>
    </section>
  );
}

/** System health (API §10 /admin/health): checked again every 30 seconds. */
export default function AdminHealthPage() {
  const health = useHealth();
  const report = health.data;
  const overall = report ? HEALTH_STATUS[report.status] : null;

  return (
    <>
      <AdminPageHeader
        title="حالة النظام"
        meta={
          report &&
          overall && (
            <>
              <StatusBadge label={overall.label} tone={overall.tone} />
              <span>استغرق الفحص {ms(report.totalDurationMs)} · يتحدّث كل ٣٠ ثانية</span>
            </>
          )
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={health.isFetching}
            onClick={() => {
              void health.refetch();
            }}
          >
            {health.isFetching ? 'جارٍ الفحص…' : 'افحص الآن'}
          </Button>
        }
      />

      <div className={local.sections}>
        {health.isError && !report ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(health.error)}</p>
            <p className={styles.muted}>إن لم يستجب الخادم أصلاً فالمشكلة قبل هذه الفحوص.</p>
          </div>
        ) : !report ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ الفحص" />
        ) : (
          <ul className={local.checks}>
            {report.checks.map((check) => {
              const info = HEALTH_CHECKS[check.name];
              const status = HEALTH_STATUS[check.status];
              const data = Object.entries(check.data);
              return (
                <li key={check.name} className={styles.card}>
                  <div className={local.checkHead}>
                    <div>
                      <h2 className={styles.cardTitle}>{info?.label ?? check.name}</h2>
                      {info && <p className={styles.muted}>{info.about}</p>}
                    </div>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                  {check.description && (
                    <p className={local.technical} dir="ltr">
                      {check.description}
                    </p>
                  )}
                  {check.error && (
                    <p className={local.error} dir="ltr" role="alert">
                      {check.error}
                    </p>
                  )}
                  {data.length > 0 && (
                    <dl className={styles.facts}>
                      {data.map(([key, value]) => (
                        <div key={key}>
                          <dt>{HEALTH_DATA[key] ?? key}</dt>
                          <dd dir={/^\d+$/.test(value ?? '') ? undefined : 'ltr'}>
                            {value === null
                              ? '—'
                              : /^\d+$/.test(value)
                                ? formatCount(Number(value))
                                : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className={styles.sub}>مدة الفحص: {ms(check.durationMs)}</p>
                </li>
              );
            })}
          </ul>
        )}

        <Maintenance />
      </div>
    </>
  );
}