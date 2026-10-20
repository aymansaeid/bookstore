import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { BookList } from '@/features/catalog/components/BookList';
import { useCatalogSearch, useCategories } from '@/features/catalog/queries';
import { PathCard } from '@/features/paths/components/PathCard';
import { useShippingSummary } from '@/features/store/queries';
import { cx } from '@/shared/lib/cx';
import { countriesPhrase, editionsPhrase, formatMoney, worksPhrase } from '@/shared/lib/format';
import { useNow } from '@/shared/lib/useNow';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import type { IconName } from '@/shared/ui/Icon/icons';
import { SectionHeader } from '@/shared/ui/SectionHeader/SectionHeader';
import { Spark } from '@/shared/ui/Spark/Spark';

import type { PickReason } from '../api';
import { useFeaturedMuhaqqiqs, useFeaturedPaths, usePicks } from '../queries';

import styles from './HomeSections.module.css';

/** Spec 5.1 §2: the publisher seal and three promises (only true ones). */
export function PublisherStrip() {
  const { freeShippingThreshold, countries } = useShippingSummary();
  const perks: { icon: IconName; title: string; sub: string }[] = [
    freeShippingThreshold !== undefined
      ? {
          icon: 'truck',
          title: 'شحن مجاني داخل تركيا',
          sub: `للطلبات فوق ${formatMoney(freeShippingThreshold)}`,
        }
      : { icon: 'truck', title: 'شحن داخل تركيا وخارجها', sub: 'تُحسب التكلفة في السلة' },
    { icon: 'shield', title: 'طبعات أصلية ١٠٠٪', sub: 'من الناشر مباشرة' },
    {
      icon: 'box',
      title: countries ? `نشحن إلى ${countriesPhrase(countries)}` : 'تغليف يحمي الكتب',
      sub: 'تغليف مقوّى يحمي المجلدات',
    },
  ];

  return (
    <section className={styles.strip} aria-label="عن المتجر">
      <div className={cx('wrap', styles.stripInner)}>
        <div className={styles.publisher}>
          <span className={styles.seal} aria-hidden="true">
            الرسالة
            <small>ناشرون</small>
          </span>
          <div>
            <p className={styles.publisherTitle}>الموزّع المعتمد لمؤسسة الرسالة ناشرون</p>
            <p className={styles.publisherSub}>إصدارات أصلية مباشرة من الناشر، بتحقيقات موثوقة</p>
          </div>
        </div>
        <ul className={styles.perks}>
          {perks.map((perk) => (
            <li key={perk.title}>
              <span className={styles.perkIcon} aria-hidden="true">
                <Icon name={perk.icon} size={18} />
              </span>
              <div>
                <b>{perk.title}</b>
                <span>{perk.sub}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function reasonText(reason: PickReason): string {
  switch (reason.type) {
    case 'BecauseYouBought':
      return `لأنك اشتريت ${reason.label ?? 'كتاباً قريباً'}`;
    case 'FollowsMuhaqqiq':
      return `لأنك تتابع ${reason.label ?? 'محقّقاً'}`;
    case 'MatchesInterest':
      return `من اهتماماتك: ${reason.label ?? ''}`;
    case 'Popular':
      return 'الأكثر طلباً';
  }
}

function reasonLink(reason: PickReason): string | null {
  if (!reason.refSlug) return null;
  if (reason.type === 'FollowsMuhaqqiq') return paths.muhaqqiq(reason.refSlug);
  if (reason.type === 'MatchesInterest') return paths.category(reason.refSlug);
  return null;
}

const greetingFor = (now: number | null) => {
  if (now === null) return 'أهلاً';
  const hour = new Date(now).getHours();
  return hour >= 4 && hour < 12 ? 'صباح الخير' : 'مساء الخير';
};

/**
 * Spec 5.1 §3 «اقتراحات اليوم» (API §7d), signed-in customers only. Guests
 * see the best-sellers in «رفوف القرّاء» instead, so nothing repeats.
 */
export function PicksSection() {
  const { customer } = useSession();
  const picks = usePicks();
  const now = useNow(10 * 60_000);
  if (!customer) return null;
  if (picks.isSuccess && picks.data.items.length === 0) return null;

  const matches = new Map(picks.data?.items.map((item) => [item.book.id, item.matchPercent]));
  const reasons = picks.data?.headlineReasons ?? [];

  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="picks-title">
      <SectionHeader
        id="picks-title"
        kicker="مختارة لك"
        title={`${greetingFor(now)} يا ${customer.firstName}، هذه اقتراحات اليوم`}
        description="من مكتبتك والمحققين الذين تتابعهم واهتماماتك."
      />
      {reasons.length > 0 && (
        <ul className={styles.reasons} aria-label="لماذا هذه الاقتراحات">
          {reasons.map((reason) => {
            const to = reasonLink(reason);
            const text = reasonText(reason);
            return (
              <li key={`${reason.type}-${String(reason.refId)}`}>
                {to ? (
                  <Link to={to} className={styles.reason}>
                    {text}
                  </Link>
                ) : (
                  <span className={styles.reason}>{text}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <BookList
        books={picks.data?.items.map((item) => item.book)}
        isLoading={picks.isPending}
        isError={picks.isError}
        onRetry={() => {
          void picks.refetch();
        }}
        matches={matches}
      />
    </section>
  );
}

/** Spec 5.1 §4: the featured reading paths. Hidden when none are featured. */
export function PathsSection() {
  const featured = useFeaturedPaths();
  const items = featured.data?.slice(0, 3) ?? [];
  if (featured.isSuccess && items.length === 0) return null;

  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="paths-home-title">
      <SectionHeader
        id="paths-home-title"
        kicker="مسارات القراءة"
        title="لا تعرف من أين تبدأ؟ اتبع طريقاً مرسوماً"
        description="مسارات متدرّجة يرتّبها طلاب علم متخصصون، بخصم عند شراء المسار كاملاً."
        more={{ to: paths.readingPaths, label: 'كل المسارات' }}
      />
      {featured.isPending ? (
        <div className={styles.pathsRow} aria-busy="true" aria-label="جارٍ التحميل">
          {[0, 1, 2].map((key) => (
            <div key={key} className={styles.pathSkeleton} />
          ))}
        </div>
      ) : (
        <ul className={styles.pathsRow}>
          {items.map((path) => (
            <li key={path.id} className={styles.pathItem}>
              <PathCard path={path} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Spec 5.1 §6: six top-level categories with their Ruqaʿa letter. */
export function CategoryTiles() {
  const categories = useCategories();
  const items = categories.data?.slice(0, 6) ?? [];
  if (categories.isSuccess && items.length === 0) return null;

  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="categories-title">
      <SectionHeader
        id="categories-title"
        kicker="أقسام المكتبة"
        title="تصفّح بحسب العلم"
        more={{ to: paths.search, label: 'كل الأقسام' }}
      />
      <ul className={styles.tiles} aria-busy={categories.isPending}>
        {categories.isPending
          ? [0, 1, 2, 3, 4, 5].map((key) => <li key={key} className={styles.tileSkeleton} />)
          : items.map((category, index) => (
              <li key={category.id}>
                <Link
                  to={paths.category(category.slug)}
                  className={cx(styles.tile, index === 0 && styles.tileRed)}
                >
                  {category.letter && (
                    <span className={styles.letter} aria-hidden="true">
                      {category.letter}
                    </span>
                  )}
                  <b className={styles.tileName}>{category.name}</b>
                  <span className={styles.tileCount}>{editionsPhrase(category.bookCount)}</span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

const EFENDI_FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'search',
    title: 'بحث بالمعنى',
    text: '«كتاب عن آداب طالب العلم» بدل كتابة العنوان حرفياً',
  },
  {
    icon: 'book',
    title: 'مقارنة الطبعات',
    text: 'الفروق بين التحقيقات والتجليد والسعر في جدول واحد',
  },
  { icon: 'cam', title: 'البحث بالصورة', text: 'صوّر غلاف كتاب أو صفحة منه ونجده لك' },
  { icon: 'check', title: 'ملخّص ذكي', text: 'نبذة وفهرس ومستوى كل كتاب قبل أن تشتريه' },
];

/**
 * Spec 5.1 §7 «بائع كتب عالِم». The assistant isn't live yet, so this shows
 * what's coming (marked «قريباً») instead of a staged sample conversation.
 */
export function EfendiTeaser() {
  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="efendi-teaser-title">
      <div className={styles.teaser}>
        <div className={styles.teaserCopy}>
          <p className={styles.teaserKicker}>
            <Spark size={14} /> أفندي · يعتمد على Claude · قريباً
          </p>
          <h2 id="efendi-teaser-title" className={styles.teaserTitle}>
            بائع كتب عالِم، متاح لك ٢٤ ساعة
          </h2>
          <p className={styles.teaserText}>
            اسأله كما تسأل صاحب مكتبة خبيراً عن الطبعات والمحققين ومستوى الكتاب، وسيقترح لك ويقارن
            ويضيف إلى سلتك. نُعدّه الآن بعناية، ولن يقترح إلا ما في مكتبتنا فعلاً.
          </p>
          <ButtonLink to={paths.askEfendi} variant="ink">
            تعرّف على أفندي
          </ButtonLink>
        </div>
        <ul className={styles.features}>
          {EFENDI_FEATURES.map((feature) => (
            <li key={feature.title}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Icon name={feature.icon} size={18} />
              </span>
              <b>
                {feature.title} <small>قريباً</small>
              </b>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Spec 5.1 §8 «رفوف القرّاء هذا الشهر»: best-sellers with category tabs. */
export function ReaderShelves() {
  const categories = useCategories();
  const tabs = categories.data?.slice(0, 5) ?? [];
  const [category, setCategory] = useState<string | null>(null);
  const query = useCatalogSearch({
    sort: 'Bestselling',
    pageSize: 6,
    ...(category ? { category } : {}),
  });

  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="shelves-title">
      <SectionHeader
        id="shelves-title"
        kicker="الأكثر طلباً"
        title="رفوف القرّاء هذا الشهر"
        aside={
          tabs.length > 0 ? (
            <div className={styles.tabs} role="group" aria-label="القسم">
              <button
                type="button"
                className={cx(styles.tab, category === null && styles.tabOn)}
                aria-pressed={category === null}
                onClick={() => {
                  setCategory(null);
                }}
              >
                الكل
              </button>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={cx(styles.tab, category === tab.slug && styles.tabOn)}
                  aria-pressed={category === tab.slug}
                  onClick={() => {
                    setCategory(tab.slug);
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />
      <div className={cx(query.isPlaceholderData && styles.stale)}>
        <BookList
          books={query.data?.results.items}
          isLoading={query.isPending}
          isError={query.isError}
          onRetry={() => {
            void query.refetch();
          }}
          emptyText="لا كتب في هذا القسم بعد."
        />
      </div>
      <div className={styles.moreRow}>
        <ButtonLink
          to={`${category ? paths.category(category) : paths.search}?sort=Bestselling`}
          variant="ghost"
          size="sm"
        >
          عرض المزيد <span aria-hidden="true">←</span>
        </ButtonLink>
      </div>
    </section>
  );
}

/** Spec 5.1 §9 «أعلام المحققين»: up to five featured muhaqqiqs. */
export function MuhaqqiqsSection() {
  const featured = useFeaturedMuhaqqiqs();
  const items = featured.data?.slice(0, 5) ?? [];
  if (!featured.isSuccess || items.length === 0) return null;

  return (
    <section className={cx('wrap', styles.section)} aria-labelledby="muhaqqiqs-title">
      <SectionHeader
        id="muhaqqiqs-title"
        kicker="تحقيقات تثق بها"
        title="أعلام المحققين"
        description="تابع محقّقك المفضّل ليصلك إشعار بكل تحقيق جديد له."
      />
      <ul className={styles.people}>
        {items.map((muhaqqiq) => (
          <li key={muhaqqiq.id}>
            <Link to={paths.muhaqqiq(muhaqqiq.slug)} className={styles.person}>
              <span className={styles.avatar} aria-hidden="true">
                {Array.from(muhaqqiq.name.trim())[0] ?? ''}
              </span>
              <b className={styles.personName}>{muhaqqiq.name}</b>
              <span className={styles.personWorks}>{worksPhrase(muhaqqiq.worksCount)}</span>
              {muhaqqiq.specialties.length > 0 && (
                <span className={styles.personTags}>
                  {muhaqqiq.specialties.slice(0, 2).map((specialty) => (
                    <span key={specialty}>{specialty}</span>
                  ))}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
