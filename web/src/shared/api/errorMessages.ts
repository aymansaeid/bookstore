import { ApiError } from './ApiError';

/** API guide: map ProblemDetails `title` codes to Arabic. Never show `detail`. */
const MESSAGES: Readonly<Record<string, string>> = {
  Network: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت وحاول مجدداً.',
  RateLimited: 'محاولات كثيرة، حاول بعد دقيقة.',
  Validation: 'بعض الحقول تحتاج إلى تصحيح.',

  'Checkout.InsufficientStock': 'الكمية المطلوبة من أحد الكتب غير متوفرة حالياً.',
  'Checkout.BookNotFound': 'أحد الكتب لم يعد متاحاً، وأزلناه من سلتك.',
  'Checkout.ShippingCountryMissing': 'اختر بلد الشحن لحساب التكلفة.',
  'Checkout.ShippingZoneNotSupported': 'لا نشحن إلى هذا البلد حالياً.',
  'Checkout.ShippingMethodUnavailable': 'طريقة الشحن هذه غير متاحة لبلدك، اختر طريقة أخرى.',
  'Checkout.GiftWrapUnavailable': 'تغليف الهدايا غير متاح حالياً.',
  'Checkout.CouponInvalid': 'لا يمكن استخدام كود الخصم هذا.',
  'Checkout.TermsOutdated': 'تم تحديث الشروط. يرجى مراجعتها والموافقة عليها من جديد.',
  'Checkout.SavedAddressNotFound': 'العنوان المحفوظ لم يعد موجوداً، اختر عنواناً آخر.',
  'Checkout.CustomerNotFound': 'انتهت جلستك، يرجى تسجيل الدخول من جديد.',
  'Checkout.IdempotencyKeyReused': 'تغيّر طلبك، حاول الدفع مرة أخرى.',
  'Checkout.PaymentGatewayFailure': 'تعذّر الوصول إلى بوابة الدفع، حاول بعد قليل.',
  'Checkout.PathIncomplete': 'بعض كتب المسار ليست في سلتك.',
  'Checkout.PathAlreadyOwned': 'تملك جميع كتب هذا المسار بالفعل.',
  'Checkout.PathUnavailable': 'هذا المسار غير متاح حالياً.',
  'Coupon.Invalid': 'لا يمكن استخدام كود الخصم هذا.',

  'Order.TrackingNotFound': 'لم نجد طلباً بهذا الرقم وهذا البريد الإلكتروني.',
  'Order.AlreadyShipped': 'شُحن الطلب بالفعل، ويمكنك طلب الإرجاع بعد استلامه.',
  'Order.PaymentJustCompleted': 'اكتمل الدفع للتو. حدّث الصفحة وحاول مجدداً.',
  'Order.InvalidStatus': 'تغيّرت حالة الطلب. أعد تحميل الصفحة.',

  'Customer.InvalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Customer.EmailNotVerified': 'فعّل حسابك من الرابط المرسل إلى بريدك أولاً.',
  'Customer.AccountUnavailable': 'هذا الحساب غير متاح.',
  'Customer.InvalidToken': 'الرابط غير صالح أو انتهت صلاحيته.',
  'Auth.InvalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',

  'Review.NotEligible': 'يمكن فقط لمن اشترى الكتاب كتابة مراجعة.',
  'Review.AlreadyReviewed': 'كتبتَ مراجعة لهذا الكتاب من قبل.',
  'Return.WindowClosed': 'انتهت مهلة الإرجاع (١٤ يوماً من الاستلام).',
  'Return.AlreadyRequested': 'قُدّم طلب إرجاع لهذا الطلب من قبل.',
  'Return.OrderNotReturnable': 'لا يمكن إرجاع هذا الطلب.',
  'Return.InvalidItems': 'الكميات المختارة أكبر من الكميات المشتراة.',
  'StockNotification.AlreadyInStock': 'الكتاب متوفر الآن، يمكنك إضافته إلى السلة.',
  'Library.NotInLibrary': 'هذا الكتاب ليس في مكتبتك.',
};

const BY_STATUS: Readonly<Record<number, string>> = {
  401: 'يرجى تسجيل الدخول للمتابعة.',
  403: 'لا تملك صلاحية لهذا الإجراء.',
  404: 'لم نعثر على ما تبحث عنه.',
  409: 'تغيّرت البيانات أثناء العملية. أعد المحاولة.',
};

const FALLBACK = 'حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.';

/** The Arabic sentence to show for any thrown value. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK;
  return MESSAGES[error.code] ?? BY_STATUS[error.status] ?? FALLBACK;
}

/** Show «رمز الخطأ» only for failures support must investigate (5xx). */
export function supportRequestId(error: unknown): string | null {
  return error instanceof ApiError && error.status >= 500 ? error.requestId : null;
}

/** Arabic text for a bare code (e.g. a quote problem), not a thrown error. */
export function codeMessage(code: string): string {
  return MESSAGES[code] ?? FALLBACK;
}
