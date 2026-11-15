using BookStore.Domain.Common;

namespace BookStore.Application.Emails;

/// Every customer-facing email sentence, per language. Plain text: the
/// templates HTML-encode it.
public sealed class EmailCopy
{
    // Shared
    public required Func<string, string> Footer { get; init; }
    public required string Free { get; init; }
    public required string TrackOrder { get; init; }
    public required string ViewOrder { get; init; }
    public required Func<string, string> Reason { get; init; }

    // Verify email
    public required Func<string, string> VerifySubject { get; init; }
    public required string VerifyHeading { get; init; }
    public required Func<string, string, string> VerifyGreeting { get; init; }
    public required string VerifyBody { get; init; }
    public required string VerifyButton { get; init; }
    public required string VerifyNote { get; init; }

    // Password reset
    public required Func<string, string> ResetSubject { get; init; }
    public required string ResetHeading { get; init; }
    public required string ResetBody { get; init; }
    public required string ResetButton { get; init; }
    public required string ResetNote { get; init; }

    // Registration attempt on an existing account
    public required Func<string, string> ExistingSubject { get; init; }
    public required string ExistingHeading { get; init; }
    public required string ExistingBody { get; init; }
    public required string ExistingHint { get; init; }
    public required string SignIn { get; init; }
    public required string ForgotPassword { get; init; }
    public required string ResetHere { get; init; }
    public required string IgnoreIfNotYou { get; init; }

    // Order confirmation
    public required Func<string, string> ConfirmedSubject { get; init; }
    public required string ConfirmedHeading { get; init; }
    public required Func<string, string> ConfirmedIntro { get; init; }
    public required string Subtotal { get; init; }
    public required string PathDiscount { get; init; }
    public required Func<string, string> CouponDiscount { get; init; }
    public required Func<string, string> ShippingWith { get; init; }
    public required string StandardShipping { get; init; }
    public required string Pickup { get; init; }
    public required string GiftWrap { get; init; }
    public required string Total { get; init; }
    public required string LegalAttached { get; init; }
    public required string ShippingTo { get; init; }

    // Shipped
    public required Func<string, string> ShippedSubject { get; init; }
    public required string ShippedHeading { get; init; }
    public required Func<string, string> ShippedIntro { get; init; }
    public required string Carrier { get; init; }
    public required string TrackingNumber { get; init; }
    public required string ShippedNote { get; init; }

    // Delivered
    public required Func<string, string> DeliveredSubject { get; init; }
    public required string DeliveredHeading { get; init; }
    public required Func<string, string> DeliveredIntro { get; init; }
    public required string DeliveredNote { get; init; }

    // Cancelled
    public required Func<string, string> CancelledSubject { get; init; }
    public required string CancelledHeading { get; init; }
    public required Func<string, bool, string> CancelledIntro { get; init; }
    public required string RefundIssued { get; init; }

    // Returns
    public required Func<string, string> ReturnApprovedSubject { get; init; }
    public required string ReturnApprovedHeading { get; init; }
    public required Func<string, string> ReturnApprovedIntro { get; init; }
    public required string HowToSendBack { get; init; }
    public required Func<string, string> RefundOnReceipt { get; init; }
    public required Func<string, string> ReturnRejectedSubject { get; init; }
    public required string ReturnRejectedHeading { get; init; }
    public required Func<string, string> ReturnRejectedIntro { get; init; }
    public required string ReturnRejectedNote { get; init; }
    public required Func<string, string> RefundSubject { get; init; }
    public required string RefundHeading { get; init; }
    public required Func<string, string, string> RefundIntro { get; init; }
    public required string RefundTiming { get; init; }

    // Back in stock
    public required Func<string, string> AlertSubject { get; init; }
    public required string AlertHeading { get; init; }
    public required Func<string, string> AlertBody { get; init; }
    public required string AlertButton { get; init; }
    public required string AlertNote { get; init; }
    public required Func<string, string> BackSubject { get; init; }
    public required string BackHeading { get; init; }
    public required Func<string, string> BackBody { get; init; }
    public required string OrderNow { get; init; }
    public required string BackNote { get; init; }
    public required string WhyYouGotThis { get; init; }
    public required string Unsubscribe { get; init; }

    public static EmailCopy For(Language language) => language switch
    {
        Language.En => English,
        Language.Tr => Turkish,
        _ => Arabic
    };

    public static readonly EmailCopy Arabic = new()
    {
        Footer = support => $"لديك سؤال؟ ردّ على هذه الرسالة أو راسلنا على {support}.",
        Free = "مجاني",
        TrackOrder = "تتبّع طلبك",
        ViewOrder = "عرض الطلب",
        Reason = reason => $"السبب: {reason}",

        VerifySubject = store => $"أكّد بريدك الإلكتروني في {store}",
        VerifyHeading = "تأكيد البريد الإلكتروني",
        VerifyGreeting = (name, store) => $"مرحباً {name}، أهلاً بك في {store}.",
        VerifyBody = "اضغط الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.",
        VerifyButton = "تأكيد البريد",
        VerifyNote = "صلاحية هذا الرابط ٢٤ ساعة. إن لم تُنشئ حساباً لدينا فتجاهل هذه الرسالة.",

        ResetSubject = store => $"إعادة تعيين كلمة المرور في {store}",
        ResetHeading = "إعادة تعيين كلمة المرور",
        ResetBody = "وصلنا طلب لإعادة تعيين كلمة مرور حسابك.",
        ResetButton = "تعيين كلمة مرور جديدة",
        ResetNote = "صلاحية الرابط ٣٠ دقيقة ولمرة واحدة. إن لم تطلب ذلك فلا داعي لأي إجراء، فكلمة مرورك لم تتغيّر.",

        ExistingSubject = store => $"لديك حساب بالفعل في {store}",
        ExistingHeading = "لديك حساب بالفعل",
        ExistingBody = "حاول أحدهم للتو إنشاء حساب بهذا البريد الإلكتروني، لكن لديك حساب لدينا بالفعل.",
        ExistingHint = "إن كنت أنت، فسجّل الدخول بدلاً من ذلك، أو أعد تعيين كلمة المرور إن نسيتها.",
        SignIn = "تسجيل الدخول",
        ForgotPassword = "نسيت كلمة المرور؟",
        ResetHere = "أعد تعيينها من هنا",
        IgnoreIfNotYou = "إن لم تكن أنت فيمكنك تجاهل هذه الرسالة.",

        ConfirmedSubject = n => $"تأكيد الطلب {n}",
        ConfirmedHeading = "شكراً لطلبك",
        ConfirmedIntro = n => $"تم تأكيد الطلب {n} ونحن نجهّزه للشحن.",
        Subtotal = "المجموع الفرعي",
        PathDiscount = "خصم مسار القراءة",
        CouponDiscount = code => $"الخصم ({code})",
        ShippingWith = name => $"الشحن ({name})",
        StandardShipping = "عادي",
        Pickup = "الاستلام من المكتبة",
        GiftWrap = "تغليف هدية",
        Total = "الإجمالي",
        LegalAttached = "أرفقنا بهذه الرسالة عقد البيع عن بُعد ونموذج المعلومات المسبقة، فاحتفظ بهما للرجوع إليهما.",
        ShippingTo = "عنوان الشحن",

        ShippedSubject = n => $"شُحن طلبك {n}",
        ShippedHeading = "طلبك في الطريق إليك",
        ShippedIntro = n => $"تم شحن الطلب {n}.",
        Carrier = "شركة الشحن",
        TrackingNumber = "رقم التتبع",
        ShippedNote = "قد يستغرق ظهور التتبع على موقع شركة الشحن حتى ٢٤ ساعة.",

        DeliveredSubject = n => $"وصل طلبك {n}",
        DeliveredHeading = "وصل طلبك",
        DeliveredIntro = n => $"تم تسليم الطلب {n}. نتمنى لك قراءة نافعة.",
        DeliveredNote = "إن لم يصلك شيء كما ينبغي فردّ على هذه الرسالة وسنساعدك.",

        CancelledSubject = n => $"أُلغي الطلب {n}",
        CancelledHeading = "تم إلغاء الطلب",
        CancelledIntro = (n, byCustomer) => byCustomer ? $"بناءً على طلبك، تم إلغاء الطلب {n}." : $"تم إلغاء الطلب {n}.",
        RefundIssued = "أعدنا إليك المبلغ، وسيظهر في وسيلة الدفع الأصلية خلال ٥ إلى ١٠ أيام عمل.",

        ReturnApprovedSubject = n => $"تمت الموافقة على إرجاع الطلب {n}",
        ReturnApprovedHeading = "تمت الموافقة على الإرجاع",
        ReturnApprovedIntro = n => $"وافقنا على طلب إرجاع الطلب {n}.",
        HowToSendBack = "طريقة إرسال الكتاب إلينا",
        RefundOnReceipt = amount => $"عند وصوله إلينا سنعيد {amount} إلى وسيلة الدفع الأصلية.",
        ReturnRejectedSubject = n => $"بخصوص طلب إرجاع الطلب {n}",
        ReturnRejectedHeading = "بخصوص طلب الإرجاع",
        ReturnRejectedIntro = n => $"تعذّر علينا قبول إرجاع الطلب {n}.",
        ReturnRejectedNote = "إن رأيت أن في الأمر خطأً فردّ على هذه الرسالة.",
        RefundSubject = n => $"تم استرداد مبلغ الطلب {n}",
        RefundHeading = "المبلغ في طريقه إليك",
        RefundIntro = (n, amount) => $"استلمنا المرتجع من الطلب {n} وأعدنا {amount}.",
        RefundTiming = "سيظهر المبلغ في وسيلة الدفع الأصلية خلال ٥ إلى ١٠ أيام عمل.",

        AlertSubject = title => $"أكّد تنبيه توفّر «{title}»",
        AlertHeading = "تأكيد التنبيه",
        AlertBody = title => $"أكّد رغبتك في أن نراسلك عند توفّر «{title}» من جديد.",
        AlertButton = "تأكيد التنبيه",
        AlertNote = "سنراسلك مرة واحدة فقط عند توفّر الكتاب. إن لم تطلب ذلك فتجاهل هذه الرسالة ولن يحدث شيء.",
        BackSubject = title => $"«{title}» متوفّر من جديد",
        BackHeading = "عاد الكتاب إلى المخزون",
        BackBody = title => $"«{title}» متوفّر الآن من جديد.",
        OrderNow = "اطلبه الآن",
        BackNote = "الكمية محدودة ولا يمكننا حجز نسخة لك، فاطلبه قريباً إن رغبت.",
        WhyYouGotThis = "وصلتك هذه الرسالة لأنك طلبت التنبيه —",
        Unsubscribe = "إلغاء الاشتراك"
    };

    public static readonly EmailCopy English = new()
    {
        Footer = support => $"Questions? Reply to this email or contact us at {support}.",
        Free = "Free",
        TrackOrder = "Track your order",
        ViewOrder = "View your order",
        Reason = reason => $"Reason: {reason}",

        VerifySubject = store => $"Confirm your email for {store}",
        VerifyHeading = "Confirm your email",
        VerifyGreeting = (name, store) => $"Hi {name}, welcome to {store}.",
        VerifyBody = "Click below to confirm your email address and activate your account.",
        VerifyButton = "Confirm email",
        VerifyNote = "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",

        ResetSubject = store => $"Reset your {store} password",
        ResetHeading = "Reset your password",
        ResetBody = "We received a request to reset the password for your account.",
        ResetButton = "Reset password",
        ResetNote = "This link expires in 30 minutes and can be used once. If you didn't request this, no action is needed — your password hasn't changed.",

        ExistingSubject = store => $"You already have a {store} account",
        ExistingHeading = "You already have an account",
        ExistingBody = "Someone just tried to create an account with this email address, but you already have one with us.",
        ExistingHint = "If that was you, sign in instead — or reset your password if you've forgotten it.",
        SignIn = "Sign in",
        ForgotPassword = "Forgot your password?",
        ResetHere = "Reset it here",
        IgnoreIfNotYou = "If this wasn't you, you can safely ignore this email.",

        ConfirmedSubject = n => $"Order {n} confirmed",
        ConfirmedHeading = "Thanks for your order",
        ConfirmedIntro = n => $"Order {n} is confirmed and we're getting it ready to ship.",
        Subtotal = "Subtotal",
        PathDiscount = "Reading path discount",
        CouponDiscount = code => $"Discount ({code})",
        ShippingWith = name => $"Shipping ({name})",
        StandardShipping = "Standard",
        Pickup = "Pickup",
        GiftWrap = "Gift wrap",
        Total = "Total",
        LegalAttached = "Your distance sales contract and pre-information form are attached to this email. Please keep them for your records.",
        ShippingTo = "Shipping to",

        ShippedSubject = n => $"Order {n} has shipped",
        ShippedHeading = "Your order is on its way",
        ShippedIntro = n => $"Order {n} has shipped.",
        Carrier = "Carrier",
        TrackingNumber = "Tracking number",
        ShippedNote = "Tracking can take up to 24 hours to appear on the carrier's website.",

        DeliveredSubject = n => $"Order {n} was delivered",
        DeliveredHeading = "Your order has arrived",
        DeliveredIntro = n => $"Order {n} has been delivered. Happy reading!",
        DeliveredNote = "If anything isn't right, just reply to this email and we'll help.",

        CancelledSubject = n => $"Order {n} cancelled",
        CancelledHeading = "Order cancelled",
        CancelledIntro = (n, byCustomer) => byCustomer ? $"As you requested, order {n} has been cancelled." : $"Order {n} has been cancelled.",
        RefundIssued = "Your refund has been issued and should appear on your original payment method within 5–10 business days.",

        ReturnApprovedSubject = n => $"Return approved for order {n}",
        ReturnApprovedHeading = "Your return is approved",
        ReturnApprovedIntro = n => $"Your return for order {n} has been approved.",
        HowToSendBack = "How to send it back",
        RefundOnReceipt = amount => $"Once we receive it, we'll refund {amount} to your original payment method.",
        ReturnRejectedSubject = n => $"Your return request for order {n}",
        ReturnRejectedHeading = "About your return request",
        ReturnRejectedIntro = n => $"We weren't able to accept the return for order {n}.",
        ReturnRejectedNote = "If you think this is a mistake, just reply to this email.",
        RefundSubject = n => $"Refund issued for order {n}",
        RefundHeading = "Your refund is on its way",
        RefundIntro = (n, amount) => $"We've received your return for order {n} and refunded {amount}.",
        RefundTiming = "It should appear on your original payment method within 5–10 business days.",

        AlertSubject = title => $"Confirm your alert for “{title}”",
        AlertHeading = "Confirm your alert",
        AlertBody = title => $"Confirm that you'd like to be emailed when “{title}” is back in stock.",
        AlertButton = "Confirm alert",
        AlertNote = "We'll email you once, and only when the book is available. If you didn't request this, ignore this email and nothing will happen.",
        BackSubject = title => $"“{title}” is back in stock",
        BackHeading = "It's back in stock",
        BackBody = title => $"“{title}” is available again.",
        OrderNow = "Order now",
        BackNote = "Stock is limited and we can't hold a copy, so order soon if you'd like one.",
        WhyYouGotThis = "You're receiving this because you asked to be notified —",
        Unsubscribe = "unsubscribe"
    };

    public static readonly EmailCopy Turkish = new()
    {
        Footer = support => $"Sorunuz mu var? Bu e-postayı yanıtlayın veya {support} adresinden bize ulaşın.",
        Free = "Ücretsiz",
        TrackOrder = "Siparişimi takip et",
        ViewOrder = "Siparişi görüntüle",
        Reason = reason => $"Neden: {reason}",

        VerifySubject = store => $"{store} için e-posta adresinizi doğrulayın",
        VerifyHeading = "E-posta adresinizi doğrulayın",
        VerifyGreeting = (name, store) => $"Merhaba {name}, {store} ailesine hoş geldiniz.",
        VerifyBody = "Hesabınızı etkinleştirmek için aşağıdaki düğmeye tıklayarak e-posta adresinizi doğrulayın.",
        VerifyButton = "E-postamı doğrula",
        VerifyNote = "Bu bağlantı 24 saat geçerlidir. Hesap oluşturmadıysanız bu e-postayı dikkate almayabilirsiniz.",

        ResetSubject = store => $"{store} şifrenizi sıfırlayın",
        ResetHeading = "Şifrenizi sıfırlayın",
        ResetBody = "Hesabınızın şifresini sıfırlamak için bir talep aldık.",
        ResetButton = "Şifremi sıfırla",
        ResetNote = "Bu bağlantı 30 dakika geçerlidir ve yalnızca bir kez kullanılabilir. Bu talebi siz yapmadıysanız bir şey yapmanıza gerek yok; şifreniz değişmedi.",

        ExistingSubject = store => $"{store} hesabınız zaten var",
        ExistingHeading = "Zaten bir hesabınız var",
        ExistingBody = "Az önce biri bu e-posta adresiyle hesap oluşturmaya çalıştı, ancak bu adresle zaten bir hesabınız var.",
        ExistingHint = "Bu sizseniz giriş yapın; şifrenizi unuttuysanız sıfırlayabilirsiniz.",
        SignIn = "Giriş yap",
        ForgotPassword = "Şifrenizi mi unuttunuz?",
        ResetHere = "Buradan sıfırlayın",
        IgnoreIfNotYou = "Bu siz değilseniz bu e-postayı dikkate almayabilirsiniz.",

        ConfirmedSubject = n => $"{n} numaralı siparişiniz onaylandı",
        ConfirmedHeading = "Siparişiniz için teşekkürler",
        ConfirmedIntro = n => $"{n} numaralı siparişiniz onaylandı, kargoya hazırlıyoruz.",
        Subtotal = "Ara toplam",
        PathDiscount = "Okuma yolu indirimi",
        CouponDiscount = code => $"İndirim ({code})",
        ShippingWith = name => $"Kargo ({name})",
        StandardShipping = "Standart",
        Pickup = "Mağazadan teslim alma",
        GiftWrap = "Hediye paketi",
        Total = "Toplam",
        LegalAttached = "Mesafeli satış sözleşmeniz ve ön bilgilendirme formunuz bu e-postanın ekindedir. Lütfen saklayın.",
        ShippingTo = "Teslimat adresi",

        ShippedSubject = n => $"{n} numaralı siparişiniz kargoya verildi",
        ShippedHeading = "Siparişiniz yolda",
        ShippedIntro = n => $"{n} numaralı siparişiniz kargoya verildi.",
        Carrier = "Kargo firması",
        TrackingNumber = "Takip numarası",
        ShippedNote = "Takip bilgisinin kargo firmasının sitesinde görünmesi 24 saati bulabilir.",

        DeliveredSubject = n => $"{n} numaralı siparişiniz teslim edildi",
        DeliveredHeading = "Siparişiniz teslim edildi",
        DeliveredIntro = n => $"{n} numaralı siparişiniz teslim edildi. Keyifli okumalar dileriz.",
        DeliveredNote = "Bir sorun varsa bu e-postayı yanıtlamanız yeterli, yardımcı olalım.",

        CancelledSubject = n => $"{n} numaralı siparişiniz iptal edildi",
        CancelledHeading = "Sipariş iptal edildi",
        CancelledIntro = (n, byCustomer) => byCustomer ? $"Talebiniz üzerine {n} numaralı siparişiniz iptal edildi." : $"{n} numaralı siparişiniz iptal edildi.",
        RefundIssued = "Ödemeniz iade edildi; 5-10 iş günü içinde ödeme yönteminize yansıyacaktır.",

        ReturnApprovedSubject = n => $"{n} numaralı sipariş için iade talebiniz onaylandı",
        ReturnApprovedHeading = "İade talebiniz onaylandı",
        ReturnApprovedIntro = n => $"{n} numaralı siparişiniz için iade talebinizi onayladık.",
        HowToSendBack = "Ürünü nasıl geri gönderirsiniz",
        RefundOnReceipt = amount => $"Ürün bize ulaştığında {amount} tutarını ödeme yönteminize iade edeceğiz.",
        ReturnRejectedSubject = n => $"{n} numaralı sipariş için iade talebiniz hakkında",
        ReturnRejectedHeading = "İade talebiniz hakkında",
        ReturnRejectedIntro = n => $"{n} numaralı sipariş için iade talebinizi kabul edemedik.",
        ReturnRejectedNote = "Bir hata olduğunu düşünüyorsanız bu e-postayı yanıtlayın.",
        RefundSubject = n => $"{n} numaralı sipariş için iadeniz yapıldı",
        RefundHeading = "İadeniz yolda",
        RefundIntro = (n, amount) => $"{n} numaralı siparişe ait iade ürününüz bize ulaştı ve {amount} iade edildi.",
        RefundTiming = "Tutar 5-10 iş günü içinde ödeme yönteminize yansıyacaktır.",

        AlertSubject = title => $"“{title}” için stok uyarınızı onaylayın",
        AlertHeading = "Uyarınızı onaylayın",
        AlertBody = title => $"“{title}” yeniden stoğa girdiğinde size e-posta göndermemizi onaylayın.",
        AlertButton = "Uyarıyı onayla",
        AlertNote = "Size yalnızca bir kez, kitap stoğa girdiğinde yazacağız. Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın; hiçbir şey olmayacak.",
        BackSubject = title => $"“{title}” yeniden stokta",
        BackHeading = "Yeniden stokta",
        BackBody = title => $"“{title}” yeniden satışta.",
        OrderNow = "Hemen sipariş ver",
        BackNote = "Stok sınırlı ve sizin için ayıramıyoruz; istiyorsanız erken sipariş verin.",
        WhyYouGotThis = "Haber verilmesini istediğiniz için bu e-postayı aldınız —",
        Unsubscribe = "abonelikten çık"
    };
}