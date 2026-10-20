import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { accountApi, MAX_INTERESTS, type ReadingProfileUpdate } from '@/features/account/api';
import { updateSessionCustomer, useSession } from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';
import { useCategories } from '@/features/catalog/queries';
import { levelLabel, type ReaderLevel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './Panels.module.css';

const LEVELS: ReaderLevel[] = ['Beginner', 'Intermediate', 'Specialist'];
const BUDGET_MAX = 20_000;
const BUDGET_STEP = 250;

const sameIds = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

function ProfileForm({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [level, setLevel] = useState<ReaderLevel | null>(customer.readingLevel);
  const [budget, setBudget] = useState<number | null>(customer.monthlyBudget);
  const [interests, setInterests] = useState<number[]>(customer.interestCategoryIds);

  const dirty =
    level !== customer.readingLevel ||
    budget !== customer.monthlyBudget ||
    !sameIds(interests, customer.interestCategoryIds);

  const save = useMutation({
    mutationFn: (body: ReadingProfileUpdate) => accountApi.updateReadingProfile(body),
    onSuccess: (updated) => {
      // The form remounts from the new profile (see the key below).
      updateSessionCustomer(updated);
      // Personalised picks use the profile (API §7d).
      void queryClient.invalidateQueries({ queryKey: ['me', 'recommendations'] });
      toast.success('حُفظ ما يعرفه أفندي عنك.');
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  return (
    <form
      className={styles.profile}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ readingLevel: level, monthlyBudget: budget, interestCategoryIds: interests });
      }}
    >
      <fieldset className={styles.group}>
        <legend className={styles.label}>مستواك العلمي</legend>
        <div className={styles.levels}>
          {LEVELS.map((value) => (
            <label key={value} className={cx(styles.level, level === value && styles.on)}>
              <input
                type="radio"
                name="efendi-level"
                checked={level === value}
                onChange={() => {
                  setLevel(value);
                }}
              />
              {levelLabel(value)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.group}>
        <label htmlFor="efendi-budget" className={styles.label}>
          الميزانية الشهرية
        </label>
        <input
          id="efendi-budget"
          className={styles.range}
          type="range"
          min={0}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={Math.min(budget ?? 0, BUDGET_MAX)}
          aria-valuetext={budget ? formatMoney(budget) : 'غير محددة'}
          onChange={(event) => {
            const value = Number(event.target.value);
            setBudget(value === 0 ? null : value);
          }}
        />
        <p className={styles.budget}>{budget ? `حتى ${formatMoney(budget)}` : 'غير محددة'}</p>
      </div>

      {categories.data && categories.data.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.label}>
            اهتماماتك{' '}
            <span className={styles.hint}>
              ({formatCount(interests.length)} / {formatCount(MAX_INTERESTS)})
            </span>
          </legend>
          <div className={styles.chips}>
            {categories.data.map((category) => {
              const checked = interests.includes(category.id);
              return (
                <label key={category.id} className={cx(styles.chip, checked && styles.chipOn)}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && interests.length >= MAX_INTERESTS}
                    onChange={() => {
                      setInterests(
                        checked
                          ? interests.filter((id) => id !== category.id)
                          : [...interests, category.id],
                      );
                    }}
                  />
                  {category.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {dirty && (
        <Button type="submit" variant="ink" size="sm" disabled={save.isPending}>
          {save.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
        </Button>
      )}
    </form>
  );
}

/** «ما يعرفه أفندي عنك» (spec 5.2, API §7b): the reader profile, editable here. */
export function ReaderProfileCard() {
  const { status, customer } = useSession();
  const location = useLocation();

  return (
    <section className={styles.panel} aria-labelledby="profile-title">
      <h2 id="profile-title" className={styles.title}>
        ما يعرفه أفندي عنك
      </h2>
      {status === 'authenticated' && customer ? (
        // Remount when the profile changes elsewhere (another tab, a save here).
        <ProfileForm
          key={`${customer.id}-${customer.readingLevel ?? ''}-${String(customer.monthlyBudget)}-${customer.interestCategoryIds.join(',')}`}
          customer={customer}
        />
      ) : status === 'guest' ? (
        <div className={styles.card}>
          <p className={styles.text}>
            سجّل الدخول ليعرف أفندي مستواك واهتماماتك وميزانيتك، فتأتي اقتراحاته على مقاسك.
          </p>
          <ButtonLink to={paths.loginWithReturn(location.pathname)} variant="ink" size="sm">
            تسجيل الدخول
          </ButtonLink>
        </div>
      ) : (
        <div className={styles.skeleton} aria-busy="true" />
      )}
    </section>
  );
}
