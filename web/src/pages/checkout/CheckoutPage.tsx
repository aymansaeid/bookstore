import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router';

import { STORE_COUNTRY, UI_LANGUAGE } from '@/app/locale';
import { paths } from '@/app/paths';
import type { SavedAddress } from '@/features/addresses/api';
import { useSavedAddresses } from '@/features/addresses/queries';
import { endSessionLocally, getSession, useSession } from '@/features/auth/session';
import type { Customer } from '@/features/auth/types';
import { useCartStore } from '@/features/cart/cartStore';
import { useCheckoutStore } from '@/features/checkout/checkoutStore';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { LegalDocumentsDialog } from '@/features/checkout/components/LegalDocumentsDialog';
import { QuoteTotals } from '@/features/checkout/components/QuoteTotals';
import { SavedAddressPicker } from '@/features/checkout/components/SavedAddressPicker';
import { CountrySelect, ShippingOptions } from '@/features/checkout/components/ShippingChoice';
import { placeOrder, redirectToPayment } from '@/features/checkout/placeOrder';
import {
  type CheckoutValues,
  checkoutResolver,
  GIFT_MESSAGE_MAX,
} from '@/features/checkout/schema';
import { PICKUP_METHOD } from '@/features/checkout/shipping';
import type {
  CheckoutRequest,
  LegalDocumentType,
  LegalPreviewRequest,
} from '@/features/checkout/types';
import { quoteKeys, useQuote } from '@/features/checkout/useQuote';
import { useQuoteSelfHeal } from '@/features/checkout/useQuoteSelfHeal';
import { storeKeys, useStoreConfig } from '@/features/store/queries';
import { ApiError } from '@/shared/api/ApiError';
import { codeMessage, errorMessage } from '@/shared/api/errorMessages';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Checkbox, FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './CheckoutPage.module.css';

/** Errors that change what the quote shows: fetch it again so the page explains them. */
const REQUOTE = new Set([
  'Checkout.InsufficientStock',
  'Checkout.BookNotFound',
  'Checkout.CouponInvalid',
  'Checkout.ShippingZoneNotSupported',
  'Checkout.ShippingMethodUnavailable',
  'Checkout.GiftWrapUnavailable',
  'Checkout.PathIncomplete',
  'Checkout.PathAlreadyOwned',
  'Checkout.PathUnavailable',
]);

/** Quote problems the self-heal fixes on its own; the rest are listed above the cards. */
const SELF_HEALED = new Set([
  'Checkout.BookNotFound',
  'Checkout.ShippingMethodUnavailable',
  'Checkout.GiftWrapUnavailable',
]);

const FORM_FIELDS = new Set<keyof CheckoutValues>([
  'email',
  'recipientName',
  'phone',
  'line1',
  'line2',
  'city',
  'stateOrProvince',
  'postalCode',
  'giftMessage',
]);

/** Server paths (customerEmail, shippingAddress.phone) → this form's field names. */
function formField(path: string): keyof CheckoutValues | null {
  const name = path === 'customerEmail' ? 'email' : path.replace(/^shippingAddress\./, '');
  return FORM_FIELDS.has(name as keyof CheckoutValues) ? (name as keyof CheckoutValues) : null;
}

const fullName = (customer: Customer | null) =>
  customer ? `${customer.firstName} ${customer.lastName}`.trim() : '';

function Card({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const id = `checkout-card-${String(number)}`;
  return (
    <section className={styles.card} aria-labelledby={id}>
      <h2 id={id} className={styles.cardTitle}>
        <span className={styles.number} aria-hidden="true">
          {formatCount(number)}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CheckoutForm({ customer }: { customer: Customer | null }) {
  const guest = customer === null;
  const queryClient = useQueryClient();
  const config = useStoreConfig();
  const addresses = useSavedAddresses();

  const lines = useCartStore((state) => state.lines);
  const countryCode = useCartStore((state) => state.countryCode);
  const setCountry = useCartStore((state) => state.setCountry);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const giftWrap = useCartStore((state) => state.giftWrap);
  const setGiftWrap = useCartStore((state) => state.setGiftWrap);
  const addressChoice = useCheckoutStore((state) => state.addressChoice);
  const setAddressChoice = useCheckoutStore((state) => state.setAddressChoice);

  const savedAddresses: SavedAddress[] = guest ? [] : (addresses.data ?? []);
  const selectedAddress =
    typeof addressChoice === 'number'
      ? (savedAddresses.find((address) => address.id === addressChoice) ?? null)
      : null;
  const pickup = shippingMethod === PICKUP_METHOD;

  const quote = useQuote({ savedAddressId: selectedAddress?.id ?? null });
  const data = quote.data;
  useQuoteSelfHeal(quote);

  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<LegalPreviewRequest | null>(null);
  const [documentTab, setDocumentTab] = useState<LegalDocumentType>('PreInformationForm');
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Rules are read from the stores when validation runs (see checkoutResolver).
  const resolver = useMemo(
    () =>
      checkoutResolver(() => ({
        guest: getSession().status !== 'authenticated',
        savedAddress: typeof useCheckoutStore.getState().addressChoice === 'number',
        pickup: useCartStore.getState().shippingMethod === PICKUP_METHOD,
      })),
    [],
  );

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    subscribe,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver,
    defaultValues: (() => {
      const draft = useCheckoutStore.getState().draft;
      return {
        ...draft,
        recipientName: draft.recipientName === '' ? fullName(customer) : draft.recipientName,
        phone: draft.phone === '' ? (customer?.phone ?? '') : draft.phone,
      };
    })(),
    mode: 'onTouched',
  });

  // Keep what was typed for this tab, so the cancel page can send them back here.
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          useCheckoutStore.getState().saveDraft(values);
        },
      }),
    [subscribe],
  );

  // Pick the default saved address once the list arrives ("new" when there are none).
  useEffect(() => {
    if (guest || !addresses.data) return;
    const store = useCheckoutStore.getState();
    const choice = store.addressChoice;
    const list = addresses.data;
    if (choice === 'new' || list.some((address) => address.id === choice)) return;
    const preferred = list.find((address) => address.isDefault) ?? list[0];
    store.setAddressChoice(preferred ? preferred.id : 'new');
    if (preferred) useCartStore.getState().setCountry(preferred.countryCode);
  }, [guest, addresses.data]);

  // The saved address was deleted meanwhile (another tab): reload the list and choose again.
  const savedMissing =
    quote.isCurrent && data?.problems.some((p) => p.code === 'Checkout.SavedAddressNotFound');
  useEffect(() => {
    if (!savedMissing) return;
    useCheckoutStore.getState().setAddressChoice(null);
    void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
  }, [savedMissing, queryClient]);

  const chooseAddress = (choice: number | 'new') => {
    setAddressChoice(choice);
    const address = savedAddresses.find((item) => item.id === choice);
    if (address) setCountry(address.countryCode);
  };

  const buildRequest = (values: CheckoutValues, termsVersion: string): CheckoutRequest => {
    const cart = useCartStore.getState();
    const optional = (value: string) => (value === '' ? null : value);
    return {
      customerEmail: guest ? values.email : customer.email,
      lines: cart.lines.map(({ bookId, quantity }) => ({ bookId, quantity })),
      shippingAddress: selectedAddress
        ? null
        : {
            recipientName: values.recipientName,
            phone: values.phone,
            // Pickup needs only who collects it and how to reach them (§5b).
            line1: pickup ? '' : values.line1,
            line2: pickup ? null : optional(values.line2),
            city: pickup ? '' : values.city,
            stateOrProvince: pickup ? null : optional(values.stateOrProvince),
            postalCode: pickup ? '' : values.postalCode,
            countryCode: cart.countryCode,
          },
      savedAddressId: selectedAddress?.id ?? null,
      couponCode: cart.couponCode,
      acceptedTermsVersion: termsVersion,
      shippingMethod: cart.shippingMethod,
      giftWrap: cart.giftWrap,
      giftMessage: cart.giftWrap ? optional(values.giftMessage) : null,
      language: UI_LANGUAGE,
      readingPathId: cart.readingPathId,
    };
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (REQUOTE.has(error.code)) void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      switch (error.code) {
        case 'Checkout.TermsOutdated':
          setAccepted(false);
          void queryClient.invalidateQueries({ queryKey: storeKeys.config(UI_LANGUAGE) });
          break;
        case 'Checkout.CouponInvalid':
          useCartStore.getState().setCoupon(null);
          break;
        case 'Checkout.SavedAddressNotFound':
          setAddressChoice(null);
          void queryClient.invalidateQueries({ queryKey: ['me', 'addresses'] });
          break;
        case 'Checkout.CustomerNotFound':
          endSessionLocally();
          break;
        case 'Validation': {
          let mapped = false;
          for (const [path, message] of Object.entries(serverFieldErrors(error))) {
            const name = formField(path);
            if (name) {
              setError(name, { message }, { shouldFocus: !mapped });
              mapped = true;
            }
          }
          if (mapped) return;
          break;
        }
      }
    }
    const message = errorMessage(error);
    setSubmitError(message);
    toast.error(message);
  };

  const onValid = async (values: CheckoutValues) => {
    setSubmitError(null);
    if (!accepted) {
      setTermsError(true);
      toast.error('يجب الموافقة على نموذج المعلومات المسبقة وعقد البيع عن بُعد.');
      return;
    }
    const termsVersion = config.data?.termsVersion;
    if (!termsVersion || !data?.canCheckout || !quote.isCurrent) return;

    try {
      const response = await placeOrder(buildRequest(values, termsVersion));
      setRedirecting(true);
      if (!redirectToPayment(response.checkoutUrl)) {
        setRedirecting(false);
        handleError(new Error('Invalid checkout URL'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const onInvalid = () => {
    if (!accepted) setTermsError(true);
  };

  const openDocument = (type: LegalDocumentType) => {
    const values = getValues();
    const cart = useCartStore.getState();
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());
    const email = guest ? optional(values.email) : customer.email;
    const address = selectedAddress;
    // Missing details show as «—» in the documents until the customer fills them in.
    setPreviewRequest({
      language: UI_LANGUAGE,
      quote: {
        lines: cart.lines,
        countryCode: cart.countryCode,
        savedAddressId: address?.id ?? null,
        couponCode: cart.couponCode,
        shippingMethod: cart.shippingMethod,
        giftWrap: cart.giftWrap,
      },
      buyer: {
        name: address?.recipientName ?? optional(values.recipientName) ?? '—',
        email: email !== null && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
        phone: address?.phone ?? optional(values.phone) ?? '—',
        line1: pickup ? null : (address?.line1 ?? optional(values.line1)),
        line2: pickup ? null : (address?.line2 ?? optional(values.line2)),
        city: pickup ? null : (address?.city ?? optional(values.city)),
        stateOrProvince: pickup
          ? null
          : (address?.stateOrProvince ?? optional(values.stateOrProvince)),
        postalCode: pickup ? null : (address?.postalCode ?? optional(values.postalCode)),
        countryCode: address?.countryCode ?? cart.countryCode,
      },
    });
    setDocumentTab(type);
    dialogRef.current?.showModal();
  };

  const problems = (data?.problems ?? []).filter((problem) => !SELF_HEALED.has(problem.code));
  const quantities = new Map(lines.map((line) => [line.bookId, line.quantity]));
  const busy = isSubmitting || redirecting;
  const canPay =
    data !== undefined && data.canCheckout && quote.isCurrent && config.data !== undefined;
  const payLabel = redirecting
    ? 'جارٍ تحويلك إلى صفحة الدفع…'
    : data
      ? `ادفع ${formatMoney(data.total, data.currency)} بأمان`
      : 'ادفع بأمان';
  const showAddressForm = guest || selectedAddress === null;
  const addressesLoading = !guest && addresses.isPending;

  return (
    <form
      id="checkout-form"
      className={cx('wrap', styles.page)}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onValid, onInvalid)(event);
      }}
    >
      <DocumentTitle title="الشحن والدفع" />

      <header className={styles.header}>
        <h1 className={styles.title}>الشحن والدفع</h1>
        <CheckoutSteps current="checkout" />
      </header>

      {problems.length > 0 && (
        <div className={styles.problems} role="alert">
          {problems.map((problem) => (
            <p key={problem.code}>{codeMessage(problem.code)}</p>
          ))}
          <Link to={paths.cart} className={buttonClass('ghost', 'sm')}>
            تعديل السلة
          </Link>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.cards}>
          <Card number={1} title="العنوان">
            {guest ? (
              <>
                <p className={styles.note}>
                  لديك حساب؟ <Link to={paths.loginWithReturn(paths.checkout)}>سجّل الدخول</Link>{' '}
                  لاستخدام عناوينك المحفوظة ومتابعة طلباتك.
                </p>
                <TextField
                  label="البريد الإلكتروني"
                  type="email"
                  dir="ltr"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  hint="نرسل إليه تأكيد الطلب ورقم التتبّع."
                  error={errors.email?.message}
                  {...register('email')}
                />
              </>
            ) : (
              <p className={styles.note}>
                سيصلك تأكيد الطلب على <b dir="ltr">{customer.email}</b>
              </p>
            )}

            {addressesLoading ? (
              <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل عناوينك" />
            ) : (
              savedAddresses.length > 0 && (
                <SavedAddressPicker
                  addresses={savedAddresses}
                  choice={addressChoice}
                  onChoose={chooseAddress}
                />
              )
            )}

            {showAddressForm && !addressesLoading && (
              <div className={styles.fields}>
                <TextField
                  label={pickup ? 'اسم من سيستلم الطلب' : 'اسم المستلم'}
                  autoComplete="name"
                  error={errors.recipientName?.message}
                  {...register('recipientName')}
                />
                <TextField
                  label="رقم الجوال"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+90 5xx xxx xx xx"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                {pickup ? (
                  <p className={cx(styles.note, styles.full)}>
                    <Icon name="pin" size={16} /> ستستلم طلبك من مكتبتنا، فلا حاجة إلى عنوان.
                  </p>
                ) : (
                  <>
                    <div className={cx(styles.countryField, styles.full)}>
                      <label htmlFor="checkout-country" className={styles.label}>
                        البلد
                      </label>
                      <CountrySelect
                        id="checkout-country"
                        value={countryCode}
                        onChange={setCountry}
                      />
                    </div>
                    <TextField
                      className={styles.full}
                      label="العنوان"
                      autoComplete="address-line1"
                      placeholder="الحي، الشارع، رقم المبنى"
                      error={errors.line1?.message}
                      {...register('line1')}
                    />
                    <TextField
                      className={styles.full}
                      label="تفاصيل إضافية (اختياري)"
                      autoComplete="address-line2"
                      placeholder="الطابق، رقم الشقة"
                      error={errors.line2?.message}
                      {...register('line2')}
                    />
                    <TextField
                      label="المدينة"
                      autoComplete="address-level2"
                      error={errors.city?.message}
                      {...register('city')}
                    />
                    <TextField
                      label="المنطقة أو الولاية (اختياري)"
                      autoComplete="address-level1"
                      error={errors.stateOrProvince?.message}
                      {...register('stateOrProvince')}
                    />
                    <TextField
                      label="الرمز البريدي"
                      dir="ltr"
                      inputMode={countryCode === STORE_COUNTRY ? 'numeric' : 'text'}
                      autoComplete="postal-code"
                      error={errors.postalCode?.message}
                      {...register('postalCode')}
                    />
                  </>
                )}
              </div>
            )}
          </Card>

          <Card number={2} title="الشحن">
            {data && data.shippingOptions.length > 0 ? (
              <ShippingOptions quote={data} />
            ) : data ? (
              <p className={styles.problemText}>
                {codeMessage('Checkout.ShippingZoneNotSupported')}
              </p>
            ) : (
              <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ حساب الشحن" />
            )}

            {data?.giftWrap.available && (
              <div className={styles.gift}>
                <Checkbox
                  checked={giftWrap}
                  onChange={(event) => {
                    setGiftWrap(event.target.checked);
                  }}
                >
                  <Icon name="gift" size={18} /> تغليف هدية فاخر (+
                  {formatMoney(data.giftWrap.fee, data.currency)})
                </Checkbox>
                {giftWrap && (
                  <TextAreaField
                    label="رسالة الإهداء (اختياري)"
                    hint={`تُطبع وتوضع مع الهدية، حتى ${formatCount(GIFT_MESSAGE_MAX)} حرف.`}
                    maxLength={GIFT_MESSAGE_MAX}
                    rows={3}
                    error={errors.giftMessage?.message}
                    {...register('giftMessage')}
                  />
                )}
              </div>
            )}
          </Card>

          <Card number={3} title="الدفع">
            <div className={styles.payment}>
              <span className={styles.paymentIcon} aria-hidden="true">
                <Icon name="lock" size={22} />
              </span>
              <div>
                <p className={styles.paymentTitle}>الدفع بالبطاقة عبر صفحة دفع آمنة</p>
                <p className={styles.note}>
                  بعد الضغط على «ادفع» ننقلك إلى صفحة بوابة الدفع لإدخال بيانات بطاقتك، ثم تعود إلى
                  هنا لتأكيد الطلب. لا نرى بيانات بطاقتك ولا نحفظها.
                </p>
                {config.data && (
                  <p className={styles.note}>
                    نحجز الكتب لك {formatCount(config.data.checkoutSessionMinutes)} دقيقة أثناء
                    الدفع.
                  </p>
                )}
                {config.data?.isTestMode && (
                  <p className={styles.testMode}>وضع تجريبي: لن يُسحب أي مبلغ.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <aside className={styles.summary} aria-labelledby="checkout-summary-title">
          <div className={styles.summaryHead}>
            <h2 id="checkout-summary-title" className={styles.summaryTitle}>
              ملخّص الطلب
            </h2>
            <Link to={paths.cart} className={styles.edit}>
              تعديل
            </Link>
          </div>

          {data ? (
            <>
              <ul className={cx(styles.items, !quote.isCurrent && styles.stale)}>
                {data.lines.map((line) => {
                  const cover = line.coverThumbnailUrl ?? line.coverImageUrl;
                  return (
                    <li key={line.bookId} className={styles.item}>
                      <span className={styles.thumb}>
                        {cover && <img src={cover} alt="" width={44} height={64} loading="lazy" />}
                        <span className={styles.qty}>
                          {formatCount(quantities.get(line.bookId) ?? line.quantity)}
                        </span>
                      </span>
                      <span className={styles.itemTitle}>{line.title}</span>
                      <span className={styles.itemTotal}>
                        {formatMoney(line.lineTotal, data.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <QuoteTotals quote={data} stale={!quote.isCurrent} />
            </>
          ) : quote.isError ? (
            <p className={styles.problemText} role="alert">
              {errorMessage(quote.error)}
            </p>
          ) : (
            <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ حساب الطلب" />
          )}

          <div className={styles.terms}>
            <Checkbox
              checked={accepted}
              aria-invalid={termsError && !accepted ? true : undefined}
              aria-describedby="terms-documents"
              onChange={(event) => {
                setAccepted(event.target.checked);
                if (event.target.checked) setTermsError(false);
              }}
            >
              قرأت نموذج المعلومات المسبقة وعقد البيع عن بُعد وأوافق عليهما.
            </Checkbox>
            <p id="terms-documents" className={styles.documents}>
              <button
                type="button"
                className={styles.docLink}
                onClick={() => {
                  openDocument('PreInformationForm');
                }}
              >
                نموذج المعلومات المسبقة
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                className={styles.docLink}
                onClick={() => {
                  openDocument('DistanceSalesContract');
                }}
              >
                عقد البيع عن بُعد
              </button>
            </p>
            {termsError && !accepted && (
              <p className={styles.termsError} role="alert">
                يجب الموافقة على المستندين قبل الدفع.
              </p>
            )}
          </div>

          {submitError && <FormAlert>{submitError}</FormAlert>}

          <button
            type="submit"
            className={buttonClass('red', 'md', styles.pay)}
            disabled={!canPay || busy}
          >
            <Icon name="lock" /> {payLabel}
          </button>
          <p className={styles.secure}>
            <Icon name="shield" size={16} /> اتصال مشفّر، والدفع عبر بوابة دفع آمنة.
          </p>
        </aside>
      </div>

      {data && (
        <div className={styles.mobileBar}>
          <div>
            <p className={styles.mobileLabel}>الإجمالي</p>
            <p className={styles.mobileTotal}>{formatMoney(data.total, data.currency)}</p>
          </div>
          <button type="submit" className={buttonClass('red', 'sm')} disabled={!canPay || busy}>
            <Icon name="lock" size={16} /> {redirecting ? 'جارٍ التحويل…' : 'ادفع بأمان'}
          </button>
        </div>
      )}

      <LegalDocumentsDialog
        dialogRef={dialogRef}
        request={previewRequest}
        tab={documentTab}
        onTab={setDocumentTab}
      />
    </form>
  );
}

export default function CheckoutPage() {
  const { status, customer } = useSession();
  const hasLines = useCartStore((state) => state.lines.length > 0);

  if (!hasLines) return <Navigate to={paths.cart} replace />;
  if (status === 'unknown') {
    return (
      <div className={cx('wrap', styles.page)} aria-busy="true">
        <DocumentTitle title="الشحن والدفع" />
        <div className={styles.skeletonPage} />
      </div>
    );
  }
  // Remount on sign-in/out (another tab, or an expired session) so defaults follow the session.
  return <CheckoutForm key={customer?.id ?? 'guest'} customer={customer} />;
}
