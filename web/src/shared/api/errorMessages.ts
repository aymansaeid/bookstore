import { i18n } from '@/i18n';

import { ApiError } from './ApiError';

/*
 * API guide: ProblemDetails `title` codes become a sentence in the page's
 * language. Never show `detail` (it's English and meant for developers).
 */

/**
 * Admin-only codes. The admin panel is Arabic only (/en/admin… redirects to
 * /admin…), so these stay here; every code a shopper can see is in
 * common.json → errors, in all three languages.
 */
const ADMIN_MESSAGES: Readonly<Record<string, string>> = {
  'Order.NoPaymentReference':
    'لا يوجد مرجع دفع لهذا الطلب، فلا يمكن استرداده تلقائياً. استرده يدوياً من مزوّد الدفع.',
  'Customer.NotFound': 'لم نعثر على هذا العميل.',
  'Customer.Anonymized': 'حذف صاحب هذا الحساب حسابه، فلا يمكن تعديله.',
  'Customer.AlreadyVerified': 'فعّل العميل بريده بالفعل.',
  'Loyalty.InsufficientBalance': 'رصيد العميل من النقاط لا يكفي لهذا الخصم.',
  'Return.IncompleteInspection': 'حدّد حالة كل كتاب مرتجع قبل إكمال الإرجاع.',
  'Translation.NotFound': 'لا توجد ترجمة بهذه اللغة بعد.',
  'Translation.Invalid': 'بعض نصوص الترجمة غير مقبولة. راجع الأطوال.',
  'Translation.UnsupportedLanguage': 'لغة الترجمة غير مدعومة. الترجمة للإنجليزية والتركية فقط.',
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
  'ReadingPath.DuplicateSlug': 'يوجد مسار آخر بهذا الرابط.',
  'ReadingPath.InvalidSlug': 'لا يصلح هذا الرابط. استخدم حروفاً أو أرقاماً.',
  'ReadingPath.UnknownBooks': 'أحد كتب المسار لم يعد موجوداً. حدّث الصفحة.',
  'ReadingPath.HasEnrollments': 'يتبع هذا المسارَ قرّاء. أخفِه بدلاً من حذفه.',
  'ReadingPath.Invalid': 'تحقّق من المراحل: من ٢ إلى ١٠ كتب، بلا تكرار، ولكل مرحلة سبب.',
  'Coupon.NotFound': 'لم نعثر على هذا الكوبون. حدّث الصفحة.',
  'Coupon.DuplicateCode': 'يوجد كوبون آخر بهذا الكود.',
  'Coupon.MaxBelowRedeemed': 'حد الاستخدام أقل من عدد مرات استخدام الكوبون حتى الآن.',
  'Coupon.CannotDeleteUsed': 'استُخدم هذا الكوبون ويبقى للتقارير. أوقفه بدلاً من حذفه.',
  'Legal.NotFound': 'لم نعثر على هذه النسخة. حدّث الصفحة.',
  'Legal.DuplicateVersion': 'رقم النسخة هذا مستخدم لهذا النص بهذه اللغة. اختر رقماً آخر.',
  'Legal.NotADraft': 'النسخ المنشورة والمؤرشفة لا تُعدَّل. أنشئ نسخة جديدة لتغيير النص.',
  'Legal.UnknownPlaceholders': 'في النص حقول تلقائية غير معروفة. صحّحها قبل النشر.',
  'Legal.Invalid': 'تحقّق من رقم النسخة والعنوان والنص.',
  'ShippingZone.NotFound': 'لم نعثر على منطقة الشحن هذه. حدّث الصفحة.',
  'ShippingZone.DuplicateName': 'توجد منطقة شحن أخرى بهذا الاسم.',
  'ShippingZone.CountriesAlreadyAssigned': 'بعض الدول تابعة لمنطقة أخرى. أزلها من هناك أولاً.',
  'ShippingZone.InvalidDelivery':
    'تحقّق من بيانات التوصيل: رموز الخيارات، وأيام التوصيل من الأقل إلى الأكثر حتى ٦٠ يوماً.',
};

/** A code's sentence from common.json → errors, or '' when it has none. */
const shopperMessage = (code: string): string => i18n.t(`errors.${code}`, { defaultValue: '' });

const STATUSES = new Set([401, 403, 404, 409]);
const fallback = (): string => i18n.t('errorStatus.fallback');

function messageFor(code: string, status: number | null): string {
  const text = shopperMessage(code) || ADMIN_MESSAGES[code];
  if (text) return text;
  if (status !== null && STATUSES.has(status)) {
    return i18n.t(`errorStatus.${String(status) as '401' | '403' | '404' | '409'}`);
  }
  return fallback();
}

/** The sentence to show for any thrown value. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return fallback();
  return messageFor(error.code, error.status);
}

/** Show «رمز الخطأ» only for failures support must investigate (5xx). */
export function supportRequestId(error: unknown): string | null {
  return error instanceof ApiError && error.status >= 500 ? error.requestId : null;
}

/** The sentence for a bare code (e.g. a quote problem), not a thrown error. */
export function codeMessage(code: string): string {
  return messageFor(code, null);
}