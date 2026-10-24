import type { Tone } from '@/shared/api/enums';

import type { HealthStatus } from './api';

/** Audit entity types (IAuditableCommand.AuditEntityType). */
export const AUDIT_ENTITIES: Readonly<Record<string, string>> = {
  Order: 'الطلبات',
  Return: 'الإرجاعات',
  Book: 'الكتب',
  Category: 'الأقسام',
  Muhaqqiq: 'المحققون',
  ReadingPath: 'مسارات القراءة',
  Coupon: 'الكوبونات',
  ShippingZone: 'الشحن',
  Review: 'المراجعات',
  LegalDocument: 'الصفحات القانونية',
  Catalog: 'الفهرس',
  AdminUser: 'حسابات الإدارة',
};

/** Audit actions: the command names without «Command». Unknown ones show as sent. */
const AUDIT_ACTIONS: Readonly<Record<string, string>> = {
  ShipOrder: 'شحن طلب',
  CorrectTrackingInfo: 'تصحيح رقم التتبع',
  MarkOrderDelivered: 'تأكيد التسليم',
  CancelOrder: 'إلغاء طلب واسترداد',
  ApproveReturn: 'الموافقة على إرجاع',
  RejectReturn: 'رفض إرجاع',
  CompleteReturn: 'إكمال إرجاع واسترداد',
  CreateBook: 'إضافة كتاب',
  UpdateBook: 'تعديل كتاب',
  AdjustBookStock: 'تعديل المخزون',
  SetLowStockThreshold: 'تغيير حد التنبيه',
  SetBookActivity: 'إظهار أو إخفاء كتاب',
  UploadBookImage: 'رفع صورة',
  DeleteBookImage: 'حذف صورة',
  SetBookCoverImage: 'تغيير الغلاف',
  ReorderBookImages: 'ترتيب الصور',
  SetBookTaxonomy: 'تغيير القسم والمحققين',
  SetBookMerchandising: 'تعديل بيانات العرض',
  SetBookEditions: 'ربط الطبعات',
  SetRelatedBooks: 'تعديل الكتب المرتبطة',
  CreateCategory: 'إضافة قسم',
  UpdateCategory: 'تعديل قسم',
  SetCategoryActive: 'إظهار أو إخفاء قسم',
  DeleteCategory: 'حذف قسم',
  CreateMuhaqqiq: 'إضافة محقق',
  UpdateMuhaqqiq: 'تعديل محقق',
  SetMuhaqqiqActive: 'إظهار أو إخفاء محقق',
  DeleteMuhaqqiq: 'حذف محقق',
  SaveReadingPath: 'حفظ مسار قراءة',
  SetReadingPathActive: 'إظهار أو إخفاء مسار',
  DeleteReadingPath: 'حذف مسار',
  CreateCoupon: 'إنشاء كوبون',
  UpdateCoupon: 'تعديل كوبون',
  SetCouponActive: 'تفعيل أو إيقاف كوبون',
  DeleteCoupon: 'حذف كوبون',
  CreateShippingZone: 'إضافة منطقة شحن',
  UpdateShippingZone: 'تعديل منطقة شحن',
  SetShippingZoneDelivery: 'تعديل تفاصيل التوصيل',
  SetShippingZoneActive: 'تفعيل أو إيقاف منطقة',
  DeleteShippingZone: 'حذف منطقة شحن',
  ApproveReview: 'نشر مراجعة',
  RejectReview: 'رفض مراجعة',
  CreateLegalDraft: 'مسودة نص قانوني',
  UpdateLegalDraft: 'تعديل مسودة',
  PublishLegalDocument: 'نشر نص قانوني',
  ExportOrdersCsv: 'تصدير الطلبات CSV',
  RebuildSearchIndex: 'إعادة بناء فهرس البحث',
  RegenerateImageVariants: 'إعادة توليد الصور',
  ChangePassword: 'تغيير كلمة المرور',
};

export const auditActionLabel = (action: string): string => AUDIT_ACTIONS[action] ?? action;
export const auditEntityLabel = (type: string): string => AUDIT_ENTITIES[type] ?? type;

/** The details JSON, indented for reading; raw text if it isn't valid JSON. */
export function prettyJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export const HEALTH_STATUS: Readonly<Record<HealthStatus, { label: string; tone: Tone }>> = {
  Healthy: { label: 'سليم', tone: 'green' },
  Degraded: { label: 'يعمل مع مشكلة', tone: 'gold' },
  Unhealthy: { label: 'متوقف', tone: 'red' },
};

/** Health check names (Infrastructure/DependencyInjection.cs). */
export const HEALTH_CHECKS: Readonly<Record<string, { label: string; about: string }>> = {
  database: {
    label: 'قاعدة البيانات',
    about: 'الاتصال بـ SQL Server. إن توقف فلا يمكن للمتجر خدمة أحد.',
  },
  outbox: {
    label: 'صندوق الرسائل الصادرة',
    about: 'رسائل البريد والمهام المؤجلة. العالقة لم تُرسل بعد، والميتة استُسلم في إرسالها.',
  },
  'background-jobs': {
    label: 'المهام الخلفية',
    about: 'إلغاء الدفعات غير المكتملة وتحرير حجزها، ومعالجة الرسائل. تعطّلها لا يوقف البيع.',
  },
};

export const HEALTH_DATA: Readonly<Record<string, string>> = {
  stuckOver15Min: 'عالقة منذ أكثر من ١٥ دقيقة',
  deadLetteredLast7Days: 'فشل إرسالها نهائياً (آخر ٧ أيام)',
  'checkout-sweep': 'تنظيف الدفعات غير المكتملة',
  outbox: 'معالج الرسائل',
};