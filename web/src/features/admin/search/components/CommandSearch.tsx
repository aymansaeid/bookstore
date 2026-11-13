import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { orderStatusInfo, returnStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDate, formatMoney, resultsPhrase } from '@/shared/lib/format';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { AiTag } from '@/shared/ui/AiTag/AiTag';
import { Icon } from '@/shared/ui/Icon/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import {
  type AdminSearchResult,
  type QuickViews,
  SEARCH_MAX_LENGTH,
  type SearchOrder,
} from '../api';
import { useAdminSearch } from '../queries';

import styles from './CommandSearch.module.css';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K';
const ITEM = '[data-search-item]';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h3 className={styles.groupTitle}>{title}</h3>
      <ul className={styles.items}>{children}</ul>
    </section>
  );
}

function Item({
  to,
  main,
  sub,
  end,
  thumb,
}: {
  to: string;
  main: ReactNode;
  sub?: ReactNode;
  end?: ReactNode;
  thumb?: ReactNode;
}) {
  return (
    <li>
      <Link to={to} className={styles.item} data-search-item="">
        {thumb}
        <span className={styles.text}>
          <span className={styles.main}>{main}</span>
          {sub && <span className={styles.sub}>{sub}</span>}
        </span>
        {end && <span className={styles.end}>{end}</span>}
      </Link>
    </li>
  );
}

function OrderItem({ order }: { order: SearchOrder }) {
  const info = orderStatusInfo(order.status);
  return (
    <Item
      to={paths.admin.order(order.id)}
      main={<bdi>{order.orderNumber}</bdi>}
      sub={
        <>
          {order.recipientName} · {formatMoney(order.total, order.currency)}
          {order.paidAtUtc && ` · دُفع ${formatDate(order.paidAtUtc)}`}
        </>
      }
      end={
        <StatusBadge
          label={order.status === 'Paid' ? 'بانتظار الشحن' : info.label}
          tone={info.tone}
        />
      }
    />
  );
}

/** Empty box: shortcuts to what needs attention (API §10c quickViews). */
function Attention({ views }: { views: QuickViews }) {
  const rows = [
    {
      label: 'بانتظار الشحن',
      count: views.awaitingShipment,
      to: `${paths.admin.orders}?status=Paid`,
    },
    {
      label: 'متأخرة عن الشحن (أكثر من ٤٨ ساعة)',
      count: views.lateShipments,
      to: `${paths.admin.orders}?status=Paid`,
      urgent: true,
    },
    { label: 'إرجاعات بانتظار الموافقة', count: views.returnsToReview, to: paths.admin.returns },
    {
      label: 'إرجاعات بانتظار وصول الطرد',
      count: views.returnsInTransit,
      to: `${paths.admin.returns}?status=Approved`,
    },
    { label: 'مراجعات بانتظار النشر', count: views.pendingReviews, to: paths.admin.reviews },
    { label: 'مخزون منخفض أو نافد', count: views.lowStock, to: paths.admin.inventory },
  ];

  return (
    <>
      <Group title="يحتاج انتباهك">
        {rows.map((row) => (
          <Item
            key={row.label}
            to={row.to}
            main={row.label}
            end={
              <b
                className={cx(
                  styles.count,
                  row.count === 0 && styles.countZero,
                  row.urgent && row.count > 0 && styles.countUrgent,
                )}
              >
                {formatCount(row.count)}
              </b>
            }
          />
        ))}
      </Group>
      {views.lateOrders.length > 0 && (
        <Group title="الطلبات المتأخرة">
          {views.lateOrders.map((order) => (
            <OrderItem key={order.id} order={order} />
          ))}
        </Group>
      )}
    </>
  );
}

const resultCount = (data: AdminSearchResult | undefined) =>
  data
    ? data.orders.length +
      data.customers.length +
      data.books.length +
      data.returns.length +
      data.coupons.length
    : 0;

function Results({ data }: { data: AdminSearchResult }) {
  const { orders, customers, books, returns, coupons } = data;

  if (resultCount(data) === 0) {
    return (
      <p className={styles.empty}>
        لا نتائج لـ«<bdi>{data.query}</bdi>». جرّب رقم الطلب، أو جزءاً من البريد أو الاسم، أو ISBN.
      </p>
    );
  }

  return (
    <>
      {orders.length > 0 && (
        <Group title="الطلبات">
          {orders.map((order) => (
            <OrderItem key={order.id} order={order} />
          ))}
        </Group>
      )}
      {customers.length > 0 && (
        <Group title="العملاء">
          {customers.map((customer) => (
            <Item
              key={customer.id}
              to={paths.admin.customer(customer.id)}
              main={customer.fullName}
              sub={
                <>
                  <bdi>{customer.email}</bdi> · {formatCount(customer.orderCount)} طلب
                </>
              }
              end={!customer.isActive && <StatusBadge label="موقوف" tone="red" />}
            />
          ))}
        </Group>
      )}
      {books.length > 0 && (
        <Group title="الكتب">
          {books.map((book) => (
            <Item
              key={book.id}
              to={paths.admin.book(book.id)}
              thumb={
                book.coverThumbnailUrl ? (
                  <img className={styles.thumb} src={book.coverThumbnailUrl} alt="" />
                ) : (
                  <span className={styles.thumb} aria-hidden="true" />
                )
              }
              main={book.title}
              sub={
                <>
                  {book.author} · {formatMoney(book.price, book.currency)} ·{' '}
                  {book.availableToSell === 0 ? 'نفد' : `${formatCount(book.availableToSell)} متاح`}
                </>
              }
              end={!book.isActive && <StatusBadge label="مخفي" tone="gray" />}
            />
          ))}
        </Group>
      )}
      {returns.length > 0 && (
        <Group title="الإرجاعات">
          {returns.map((item) => {
            const info = returnStatusInfo(item.status);
            return (
              <Item
                key={item.id}
                to={paths.admin.return(item.id)}
                main={
                  <>
                    إرجاع <bdi>{item.orderNumber}</bdi>
                  </>
                }
                sub={
                  <>
                    <bdi>{item.customerEmail}</bdi> · {formatDate(item.requestedAtUtc)}
                  </>
                }
                end={<StatusBadge label={info.label} tone={info.tone} />}
              />
            );
          })}
        </Group>
      )}
      {coupons.length > 0 && (
        <Group title="الكوبونات">
          {coupons.map((coupon) => (
            <Item
              key={coupon.id}
              to={`${paths.admin.coupons}?edit=${String(coupon.id)}`}
              main={<bdi>{coupon.code}</bdi>}
              sub={`خصم ${formatCount(coupon.discountPercentage)}٪ · ينتهي ${formatDate(coupon.expiresAtUtc)}`}
              end={!coupon.isActive && <StatusBadge label="متوقف" tone="gray" />}
            />
          ))}
        </Group>
      )}
    </>
  );
}

/**
 * ⌘K / Ctrl K: one box for the whole admin (API §10c). A native modal
 * <dialog> gives the focus trap and Esc; ↑↓ move between results.
 */
export function CommandSearch() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 250);
  const search = useAdminSearch(debounced, open);
  const location = useLocation();
  const data = search.data;

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setOpen(true);
    inputRef.current?.focus();
  };

  // ⌘K / Ctrl K anywhere in the admin toggles the box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (dialog.open) {
          dialog.close();
          return;
        }
        dialog.showModal();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Opening a result (or back/forward) closes the box.
  useEffect(() => {
    dialogRef.current?.close();
  }, [location.key]);

  // Arrows move through results; a click on the backdrop closes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(ITEM)];
      if (items.length === 0) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      if (next < 0) inputRef.current?.focus();
      else items[Math.min(next, items.length - 1)]?.focus();
    };
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener('keydown', onKey);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('keydown', onKey);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  const typing = term.trim() !== debounced.trim();
  const showingQuery = data?.quickViews === null;

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-label={`بحث في الإدارة (${SHORTCUT})`}
        onClick={show}
      >
        <Icon name="search" size={18} />
        <span className={styles.triggerText} aria-hidden="true">
          ابحث عن طلب، عميل، كتاب…
        </span>
        <kbd className={styles.kbd} dir="ltr" aria-hidden="true">
          {SHORTCUT}
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="بحث في الإدارة"
        onClose={() => {
          setOpen(false);
          setTerm('');
        }}
      >
        <form
          className={styles.box}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            dialogRef.current?.querySelector<HTMLElement>(ITEM)?.click();
          }}
        >
          <Icon name="search" size={20} />
          <label htmlFor="admin-search" className="sr-only">
            ابحث عن طلب أو عميل أو كتاب أو إرجاع أو كوبون
          </label>
          <input
            ref={inputRef}
            id="admin-search"
            // Not type="search": there Esc clears the text instead of closing the box.
            type="text"
            enterKeyHint="search"
            dir="auto"
            autoComplete="off"
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="رقم طلب، بريد، اسم، عنوان كتاب، ISBN، كوبون…"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
          />
          <button
            type="button"
            className={styles.close}
            aria-label="إغلاق البحث"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="x" size={20} />
          </button>
        </form>

        <div
          className={cx(styles.results, (typing || search.isPlaceholderData) && styles.stale)}
          aria-busy={typing || search.isFetching}
        >
          {open &&
            (search.isError && !data ? (
              <p className={styles.empty} role="alert">
                {errorMessage(search.error)}
              </p>
            ) : !data ? (
              <div className={styles.skeleton} aria-label="جارٍ البحث" />
            ) : data.quickViews ? (
              <Attention views={data.quickViews} />
            ) : (
              <Results data={data} />
            ))}
        </div>

        <footer className={styles.footer}>
          <AiTag>أوامر بلغة طبيعية («اسأل أفندي: أظهر الطلبات المتأخرة») تأتي مع أفندي</AiTag>
          <span className={styles.hints}>
            <kbd dir="ltr">↑↓</kbd> للتنقل · <kbd dir="ltr">Enter</kbd> للفتح ·{' '}
            <kbd dir="ltr">Esc</kbd> للإغلاق
          </span>
        </footer>
        <p className="sr-only" aria-live="polite">
          {open && showingQuery && !typing ? resultsPhrase(resultCount(data)) : ''}
        </p>
      </dialog>
    </>
  );
}