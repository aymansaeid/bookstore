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
  'Order.NotFound': 'لم نعثر على هذا الطلب.',
  'Order.NoPaymentReference':
    'لا يوجد مرجع دفع لهذا الطلب، فلا يمكن استرداده تلقائياً. استرده يدوياً من مزوّد الدفع.',

  'Customer.InvalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'Customer.EmailNotVerified': 'فعّل حسابك من الرابط المرسل إلى بريدك أولاً.',
  'Customer.AccountUnavailable': 'هذا الحساب غير متاح.',
  'Customer.InvalidToken': 'الرابط غير صالح أو انتهت صلاحيته.',
  'Customer.CurrentPasswordIncorrect': 'كلمة المرور الحالية غير صحيحة.',
  'Customer.AddressLimitReached': 'وصلت إلى الحد الأقصى: ١٠ عناوين. احذف عنواناً لإضافة آخر.',
  'Customer.AddressNotFound': 'لم يعد هذا العنوان موجوداً.',
  'Customer.UnknownInterests': 'أحد الاهتمامات لم يعد متاحاً. حدّث الصفحة واختر من جديد.',
  'Auth.InvalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',

  'Review.NotEligible': 'يمكن فقط لمن اشترى الكتاب كتابة مراجعة.',
  'Review.AlreadyReviewed': 'كتبتَ مراجعة لهذا الكتاب من قبل.',
  'Return.WindowClosed': 'انتهت مهلة الإرجاع (١٤ يوماً من الاستلام).',
  'Return.AlreadyRequested': 'قُدّم طلب إرجاع لهذا الطلب من قبل.',
  'Return.OrderNotReturnable': 'لا يمكن إرجاع هذا الطلب.',
  'Return.InvalidItems': 'الكميات المختارة أكبر من الكميات المشتراة.',
  'Return.InvalidStatus': 'تغيّرت حالة طلب الإرجاع. أعد تحميل الصفحة.',
  'Return.NoReturnForOrder': 'لا يوجد طلب إرجاع لهذا الطلب.',
  'Return.NotFound': 'لم نعثر على طلب الإرجاع.',
  'Return.IncompleteInspection': 'حدّد حالة كل كتاب مرتجع قبل إكمال الإرجاع.',
  'StockNotification.AlreadyInStock': 'الكتاب متوفر الآن، يمكنك إضافته إلى السلة.',
  'Library.NotInLibrary': 'هذا الكتاب ليس في مكتبتك.',

    'Book.NotFound': 'لم نعثر على هذا الكتاب.',
  'Book.DuplicateIsbn': 'يوجد كتاب آخر بهذا الرقم ISBN.',
  'Book.DuplicateSlug': 'يوجد كتاب آخر بهذا الرابط. غيّر الرابط أو العنوان.',
  'Book.InvalidSlug': 'لا يصلح هذا الرابط. استخدم حروفاً أو أرقاماً.',
  'Book.InvalidImage': 'تعذّرت قراءة الصورة. استخدم JPEG أو PNG أو WebP حتى ٥ ميغابايت.',
  'Book.ImageNotFound': 'لم تعد هذه الصورة موجودة. حدّث الصفحة.',
  'Book.TooManyImages': 'وصلت إلى الحد الأقصى: ٨ صور. احذف صورة لرفع أخرى.',
  'Book.InvalidReorderList': 'تغيّرت صور الكتاب. حدّث الصفحة وأعد الترتيب.',
  'Book.OldPriceNotHigher': 'السعر القديم يجب أن يكون أعلى من السعر الحالي.',
  'Book.StockBelowReserved': 'لا يمكن أن يقل المخزون عن الكمية المحجوزة لطلبات قيد الدفع.',
  'Book.UnknownMuhaqqiqs': 'أحد المحققين لم يعد موجوداً. حدّث الصفحة.',
  'Book.UnknownBooks': 'أحد الكتب المختارة لم يعد موجوداً. حدّث الصفحة.',
  'Book.AlreadyInAnotherEditionGroup':
    'أحد الكتب المختارة طبعةٌ لعمل آخر. افتح ذلك الكتاب وأزله من طبعاته أولاً.',
  'Book.CannotRelateToItself': 'لا يمكن ربط الكتاب بنفسه.',
  'Catalog.InvalidSlug': 'لا يصلح هذا الرابط. استخدم حروفاً أو أرقاماً.',
  'Category.NotFound': 'لم نعثر على هذا القسم. حدّث الصفحة.',
  'Category.DuplicateSlug': 'يوجد قسم آخر بهذا الرابط.',
  'Category.ParentMustBeTopLevel': 'القسم الأب يجب أن يكون قسماً رئيسياً.',
  'Category.CannotBeOwnParent': 'لا يكون القسم أباً لنفسه.',
  'Category.HasSubcategories': 'لهذا القسم أقسام فرعية. انقلها أو احذفها أولاً.',
  'Category.InUse': 'في هذا القسم كتب. انقلها إلى قسم آخر، أو أخفِ القسم بدلاً من حذفه.',
  'Muhaqqiq.NotFound': 'لم نعثر على هذا المحقق. حدّث الصفحة.',
  'Muhaqqiq.DuplicateSlug': 'يوجد محقق آخر بهذا الرابط.',
  'Muhaqqiq.InUse': 'لهذا المحقق أعمال في المتجر. أزله من كتبه أولاً، أو أخفِه بدلاً من حذفه.',
  'Inventory.BookNotFound': 'لم نعثر على هذا الكتاب.',

    'ReadingPath.NotFound': 'لم نعثر على هذا المسار. حدّث الصفحة.',
  'ReadingPath.DuplicateSlug': 'يوجد مسار آخر بهذا الرابط.',
  'ReadingPath.InvalidSlug': 'لا يصلح هذا الرابط. استخدم حروفاً أو أرقاماً.',
  'ReadingPath.UnknownBooks': 'أحد كتب المسار لم يعد موجوداً. حدّث الصفحة.',
  'ReadingPath.HasEnrollments': 'يتبع هذا المسارَ قرّاء. أخفِه بدلاً من حذفه.',
  'ReadingPath.Invalid': 'تحقّق من المراحل: من ٢ إلى ١٠ كتب، بلا تكرار، ولكل مرحلة سبب.',
  'Coupon.NotFound': 'لم نعثر على هذا الكوبون. حدّث الصفحة.',
  'Coupon.DuplicateCode': 'يوجد كوبون آخر بهذا الكود.',
  'Coupon.MaxBelowRedeemed': 'حد الاستخدام أقل من عدد مرات استخدام الكوبون حتى الآن.',
  'Coupon.CannotDeleteUsed': 'استُخدم هذا الكوبون ويبقى للتقارير. أوقفه بدلاً من حذفه.',
    'Review.NotFound': 'لم نعثر على هذه المراجعة. حدّث الصفحة.',
    'ShippingZone.NotFound': 'لم نعثر على منطقة الشحن هذه. حدّث الصفحة.',
  'ShippingZone.DuplicateName': 'توجد منطقة شحن أخرى بهذا الاسم.',
  'ShippingZone.CountriesAlreadyAssigned': 'بعض الدول تابعة لمنطقة أخرى. أزلها من هناك أولاً.',
  'ShippingZone.InvalidDelivery':
    'تحقّق من بيانات التوصيل: رموز الخيارات، وأيام التوصيل من الأقل إلى الأكثر حتى ٦٠ يوماً.',
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
