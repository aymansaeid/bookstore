import { useState } from 'react';

import {
  CLEARED_FILTERS,
  type HiddenFacets,
  VOLUME_OPTIONS,
  activeFilterCount,
} from '@/features/catalog/searchParams';
import type { CatalogFacets, CatalogSearchParams } from '@/features/catalog/types';
import { levelLabel, type ReaderLevel } from '@/shared/api/enums';
import { formatAmount, formatCount } from '@/shared/lib/format';
import { Checkbox } from '@/shared/ui/form/Field';

import styles from './FilterPanel.module.css';

type Patch = Partial<CatalogSearchParams>;

interface FilterPanelProps {
  filters: CatalogSearchParams;
  facets: CatalogFacets | null | undefined;
  onChange: (patch: Patch) => void;
  hide?: HiddenFacets;
}

const ALL_LEVELS: ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];
const MUHAQQIQS_COLLAPSED = 8;

function Count({ value }: { value: number }) {
  return <span className={styles.count}>{formatCount(value)}</span>;
}

/** Dual-handle price range. Applies on release so dragging doesn't spam requests. */
function PriceRange({
  min,
  max,
  value,
  onCommit,
}: {
  min: number;
  max: number;
  value: [number | undefined, number | undefined];
  onCommit: (low: number | undefined, high: number | undefined) => void;
}) {
  const [low, setLow] = useState(Math.max(min, value[0] ?? min));
  const [high, setHigh] = useState(Math.min(max, value[1] ?? max));
  const span = max - min;
  const step = span > 2000 ? 50 : span > 200 ? 10 : 1;
  const startPercent = ((low - min) / span) * 100;
  const endPercent = ((high - min) / span) * 100;

  const commit = () => {
    const nextLow = low <= min ? undefined : low;
    const nextHigh = high >= max ? undefined : high;
    if (nextLow !== value[0] || nextHigh !== value[1]) onCommit(nextLow, nextHigh);
  };
  const commitEvents = { onPointerUp: commit, onKeyUp: commit, onBlur: commit };

  return (
    <div>
      <div className={styles.range}>
        <span className={styles.track} aria-hidden="true">
          <span
            className={styles.fill}
            style={{
              insetInlineStart: `${startPercent}%`,
              inlineSize: `${endPercent - startPercent}%`,
            }}
          />
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label="أقل سعر"
          aria-valuetext={`${formatAmount(low)} ليرة`}
          onChange={(event) => {
            setLow(Math.min(Number(event.target.value), high));
          }}
          {...commitEvents}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label="أعلى سعر"
          aria-valuetext={`${formatAmount(high)} ليرة`}
          onChange={(event) => {
            setHigh(Math.max(Number(event.target.value), low));
          }}
          {...commitEvents}
        />
      </div>
      <p className={styles.prices}>
        <span>{formatAmount(low)} ₺</span>
        <span>{formatAmount(high)} ₺</span>
      </p>
    </div>
  );
}

export function FilterPanel({ filters, facets, onChange, hide = {} }: FilterPanelProps) {
  const [showAllMuhaqqiqs, setShowAllMuhaqqiqs] = useState(false);
  const selectedMuhaqqiqs = new Set(filters.muhaqqiq ?? []);
  const selectedLevels = new Set(filters.level ?? []);
  const levelCounts = new Map(facets?.levels.map((item) => [item.level, item.count]));
  const muhaqqiqs = facets?.muhaqqiqs ?? [];
  const visibleMuhaqqiqs = showAllMuhaqqiqs ? muhaqqiqs : muhaqqiqs.slice(0, MUHAQQIQS_COLLAPSED);

  const priceMin =
    facets?.minPrice !== null && facets?.minPrice !== undefined
      ? Math.floor(facets.minPrice)
      : null;
  const priceMax =
    facets?.maxPrice !== null && facets?.maxPrice !== undefined ? Math.ceil(facets.maxPrice) : null;

  const toggleIn = <T,>(set: ReadonlySet<T>, item: T): T[] | undefined => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next.size > 0 ? [...next] : undefined;
  };

  return (
    <div className={styles.panel}>
      {activeFilterCount(filters, hide) > 0 && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            onChange(CLEARED_FILTERS);
          }}
        >
          مسح كل الفلاتر
        </button>
      )}

      {hide.category !== true && facets && facets.categories.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>العلم</legend>
          <ul className={styles.list}>
            {facets.categories.map((category) => {
              const open =
                filters.category === category.slug ||
                category.children.some((child) => child.slug === filters.category);
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={styles.facet}
                    aria-pressed={filters.category === category.slug}
                    onClick={() => {
                      onChange({
                        category: filters.category === category.slug ? undefined : category.slug,
                      });
                    }}
                  >
                    {category.name}
                    <Count value={category.count} />
                  </button>
                  {open && category.children.length > 0 && (
                    <ul className={styles.sub}>
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <button
                            type="button"
                            className={styles.facet}
                            aria-pressed={filters.category === child.slug}
                            onClick={() => {
                              onChange({
                                category:
                                  filters.category === child.slug ? category.slug : child.slug,
                              });
                            }}
                          >
                            {child.name}
                            <Count value={child.count} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>مستوى القارئ</legend>
        {ALL_LEVELS.map((level) => (
          <div key={level} className={styles.checkRow}>
            <Checkbox
              checked={selectedLevels.has(level)}
              onChange={() => {
                onChange({ level: toggleIn(selectedLevels, level) });
              }}
            >
              {levelLabel(level)}
            </Checkbox>
            {levelCounts.has(level) && <Count value={levelCounts.get(level) ?? 0} />}
          </div>
        ))}
      </fieldset>

      {hide.muhaqqiq !== true && muhaqqiqs.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>المحقّق</legend>
          {visibleMuhaqqiqs.map((muhaqqiq) => (
            <div key={muhaqqiq.id} className={styles.checkRow}>
              <Checkbox
                checked={selectedMuhaqqiqs.has(muhaqqiq.slug)}
                onChange={() => {
                  onChange({ muhaqqiq: toggleIn(selectedMuhaqqiqs, muhaqqiq.slug) });
                }}
              >
                {muhaqqiq.name}
              </Checkbox>
              <Count value={muhaqqiq.count} />
            </div>
          ))}
          {muhaqqiqs.length > MUHAQQIQS_COLLAPSED && (
            <button
              type="button"
              className={styles.more}
              aria-expanded={showAllMuhaqqiqs}
              onClick={() => {
                setShowAllMuhaqqiqs((value) => !value);
              }}
            >
              {showAllMuhaqqiqs ? 'عرض أقل' : `عرض الكل (${formatCount(muhaqqiqs.length)})`}
            </button>
          )}
        </fieldset>
      )}

      {priceMin !== null && priceMax !== null && priceMax > priceMin && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>السعر</legend>
          <PriceRange
            key={`${filters.minPrice ?? ''}-${filters.maxPrice ?? ''}-${priceMin}-${priceMax}`}
            min={priceMin}
            max={priceMax}
            value={[filters.minPrice, filters.maxPrice]}
            onCommit={(low, high) => {
              onChange({ minPrice: low, maxPrice: high });
            }}
          />
        </fieldset>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>عدد المجلدات</legend>
        <div className={styles.pills}>
          {VOLUME_OPTIONS.map((option) => {
            const active = filters.minVolumes === option.min && filters.maxVolumes === option.max;
            return (
              <button
                key={option.label}
                type="button"
                className={styles.pill}
                aria-pressed={active}
                onClick={() => {
                  onChange(
                    active
                      ? { minVolumes: undefined, maxVolumes: undefined }
                      : { minVolumes: option.min, maxVolumes: option.max },
                  );
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>التوفّر والدفع</legend>
        <div className={styles.checkRow}>
          <Checkbox
            checked={filters.inStock === true}
            onChange={(event) => {
              onChange({ inStock: event.target.checked ? true : undefined });
            }}
          >
            متوفر الآن
          </Checkbox>
          {facets && <Count value={facets.inStockCount} />}
        </div>
        <Checkbox
          checked={filters.installments === true}
          onChange={(event) => {
            onChange({ installments: event.target.checked ? true : undefined });
          }}
        >
          متاح التقسيط
        </Checkbox>
        <Checkbox
          checked={filters.badge === 'Deluxe'}
          onChange={(event) => {
            onChange({ badge: event.target.checked ? 'Deluxe' : undefined });
          }}
        >
          طبعات فاخرة
        </Checkbox>
      </fieldset>
    </div>
  );
}
