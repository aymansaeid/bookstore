import type { TFunction } from 'i18next';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { useCatalogFacets, useCatalogSearch } from '@/features/catalog/queries';
import {
  activeFilterCount,
  CLEARED_FILTERS,
  type HiddenFacets,
  PAGE_SIZE,
  readFilters,
  SORTS,
  VOLUME_OPTIONS,
  writeFilters,
} from '@/features/catalog/searchParams';
import type { CatalogFacets, CatalogSearchParams, CatalogSort } from '@/features/catalog/types';
import { badgeLabel, levelLabel } from '@/shared/api/enums';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatMoney, resultsPhrase } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import { BookList } from './BookList';
import styles from './CatalogBrowser.module.css';
import { FilterPanel } from './FilterPanel';

type Patch = Partial<CatalogSearchParams>;

interface Chip {
  key: string;
  label: string;
  patch: Patch;
}

function chipsFor(
  t: TFunction<'catalog'>,
  filters: CatalogSearchParams,
  facets: CatalogFacets | null | undefined,
  hide: HiddenFacets,
): Chip[] {
  const chips: Chip[] = [];
  const categoryName = (slug: string) => {
    for (const category of facets?.categories ?? []) {
      if (category.slug === slug) return category.name;
      const child = category.children.find((item) => item.slug === slug);
      if (child) return child.name;
    }
    return slug;
  };

  if (hide.category !== true && filters.category) {
    chips.push({
      key: 'category',
      label: categoryName(filters.category),
      patch: { category: undefined },
    });
  }
  if (hide.muhaqqiq !== true) {
    for (const slug of filters.muhaqqiq ?? []) {
      const name = facets?.muhaqqiqs.find((item) => item.slug === slug)?.name ?? slug;
      const rest = (filters.muhaqqiq ?? []).filter((item) => item !== slug);
      chips.push({
        key: `m-${slug}`,
        label: name,
        patch: { muhaqqiq: rest.length > 0 ? rest : undefined },
      });
    }
  }
  for (const level of filters.level ?? []) {
    const rest = (filters.level ?? []).filter((item) => item !== level);
    chips.push({
      key: `l-${level}`,
      label: levelLabel(level),
      patch: { level: rest.length > 0 ? rest : undefined },
    });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const low = filters.minPrice !== undefined ? formatMoney(filters.minPrice) : '…';
    const high = filters.maxPrice !== undefined ? formatMoney(filters.maxPrice) : '…';
    chips.push({
      key: 'price',
      label: `${low} – ${high}`,
      patch: { minPrice: undefined, maxPrice: undefined },
    });
  }
  if (filters.minVolumes !== undefined || filters.maxVolumes !== undefined) {
    const option = VOLUME_OPTIONS.find(
      (item) => item.min === filters.minVolumes && item.max === filters.maxVolumes,
    );
    chips.push({
      key: 'volumes',
      label: option ? t(`volumes.${option.key}`) : t('browser.volumes'),
      patch: { minVolumes: undefined, maxVolumes: undefined },
    });
  }
  if (filters.inStock === true)
    chips.push({ key: 'stock', label: t('browser.inStock'), patch: { inStock: undefined } });
  if (filters.installments === true) {
    chips.push({
      key: 'inst',
      label: t('browser.installments'),
      patch: { installments: undefined },
    });
  }
  if (filters.badge)
    chips.push({ key: 'badge', label: badgeLabel(filters.badge), patch: { badge: undefined } });
  return chips;
}

interface CatalogBrowserProps {
  /** Filters fixed by the page (category or muhaqqiq pages); never written to the URL. */
  fixed?: Pick<CatalogSearchParams, 'category' | 'muhaqqiq'>;
  hide?: HiddenFacets;
}

export function CatalogBrowser({ fixed = {}, hide = {} }: CatalogBrowserProps) {
  const { t } = useTranslation('catalog');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const params: CatalogSearchParams = { ...filters, ...fixed };

  const results = useCatalogSearch({ ...params, pageSize: PAGE_SIZE });
  const facets = useCatalogFacets(params);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Bring the top of the results into view when the page number changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [filters.page]);

  const update = (patch: Patch) => {
    setSearchParams(writeFilters({ ...filters, ...patch, page: undefined }));
  };
  const hrefFor = (page: number) => `?${writeFilters({ ...filters, page }).toString()}`;

  const data = results.data;
  const total = data?.results.totalCount ?? 0;
  const activeCount = activeFilterCount(filters, hide);
  const chips = chipsFor(t, filters, facets.data, hide);
  const sort: CatalogSort = filters.sort ?? data?.sort ?? (filters.q ? 'Relevance' : 'Bestselling');
  const sortOptions = SORTS.filter((option) => option !== 'Relevance' || filters.q !== undefined);

  const panel = <FilterPanel filters={params} facets={facets.data} onChange={update} hide={hide} />;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label={t('browser.filters')}>
        {panel}
      </aside>

      <div className={styles.results} ref={resultsRef}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.filtersButton}
            aria-haspopup="dialog"
            onClick={() => {
              sheetRef.current?.showModal();
            }}
          >
            <Icon name="sliders" size={18} />
            {activeCount > 0
              ? t('browser.filtersCount', { n: formatCount(activeCount) })
              : t('browser.filters')}
          </button>

          <p className={styles.count} role="status">
            {data ? resultsPhrase(total) : ' '}
          </p>

          <label className={styles.sort}>
            <span>{t('browser.sortBy')}</span>
            <select
              value={sort}
              onChange={(event) => {
                setSearchParams(
                  writeFilters({
                    ...filters,
                    sort: event.target.value as CatalogSort,
                    page: undefined,
                  }),
                );
              }}
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`sort.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {chips.length > 0 && (
          <ul className={styles.chips} aria-label={t('browser.applied')}>
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-label={t('browser.remove', { label: chip.label })}
                  onClick={() => {
                    update(chip.patch);
                  }}
                >
                  {chip.label}
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
            {chips.length > 1 && (
              <li>
                <button
                  type="button"
                  className={styles.clearAll}
                  onClick={() => {
                    update(CLEARED_FILTERS);
                  }}
                >
                  {t('browser.clearAll')}
                </button>
              </li>
            )}
          </ul>
        )}

        <div className={cx(results.isPlaceholderData && styles.stale)}>
          <BookList
            layout="gridNarrow"
            books={data?.results.items}
            isLoading={results.isPending}
            isError={results.isError}
            onRetry={() => {
              void results.refetch();
            }}
            skeletonCount={8}
            emptyText={activeCount > 0 ? t('browser.noMatch') : t('browser.noResults')}
          />
        </div>

        {data && (
          <Pagination
            page={data.results.page}
            totalPages={data.results.totalPages}
            hrefFor={hrefFor}
          />
        )}
      </div>

      <dialog ref={sheetRef} className={styles.sheet} aria-labelledby="filters-sheet-title">
        <div className={styles.sheetHead}>
          <h2 id="filters-sheet-title">{t('browser.filters')}</h2>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label={t('browser.closeFilters')}
            onClick={() => {
              sheetRef.current?.close();
            }}
          >
            <Icon name="x" size={22} />
          </button>
        </div>
        <div className={styles.sheetBody}>{panel}</div>
        <div className={styles.sheetFoot}>
          <Button
            variant="ink"
            className={styles.sheetApply}
            onClick={() => {
              sheetRef.current?.close();
            }}
          >
            {data ? t('browser.show', { results: resultsPhrase(total) }) : t('browser.showResults')}
          </Button>
        </div>
      </dialog>
    </div>
  );
}