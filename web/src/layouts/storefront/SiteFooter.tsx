import { Link } from 'react-router';

import { legalSlugs } from '@/app/legal';
import { searchUrl } from '@/app/navigation';
import { paths } from '@/app/paths';
import { storeInfo } from '@/app/storeInfo';
import { cx } from '@/shared/lib/cx';
import { formatYear } from '@/shared/lib/format';
import { Logo } from '@/shared/ui/Logo/Logo';

import { FooterSection } from './FooterSection';
import { NewsletterCta } from './NewsletterCta';
import styles from './SiteFooter.module.css';

interface FooterLink {
  label: string;
  to: string;
}

// Category links search by name for now; step 8 switches to category slugs from the API.
const libraryLinks: FooterLink[] = [
  'الحديث وعلومه',
  'التفسير وعلوم القرآن',
  'العقيدة',
  'التراجم والتاريخ',
  'اللغة العربية',
].map((label) => ({ label, to: searchUrl(label) }));

const smartTools: FooterLink[] = [
  { label: 'اسأل أفندي', to: paths.askEfendi },
  { label: 'مسارات القراءة', to: paths.readingPaths },
  { label: 'البحث بالصورة', to: `${paths.askEfendi}?mode=photo` },
  { label: 'مقارنة الطبعات', to: paths.askEfendi },
  { label: 'مكتبتي الذكية', to: paths.account.library },
];

const helpLinks: FooterLink[] = [
  { label: 'تتبّع الطلب', to: paths.trackOrder },
  { label: 'الإرجاع والاستبدال', to: paths.returns },
  { label: 'عقد البيع عن بُعد', to: paths.legal(legalSlugs.distanceSales) },
  { label: 'سياسة الخصوصية', to: paths.legal(legalSlugs.privacy) },
  { label: 'شروط الاستخدام', to: paths.legal(legalSlugs.terms) },
];

const paymentBadges = ['VISA', 'MASTERCARD', 'TROY', 'iyzico', 'PayPal'];

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.label}>
          <Link to={link.to} className={styles.link}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <>
      <div className={cx('wrap', styles.pre)}>
        <NewsletterCta />
      </div>

      <footer className={styles.foot}>
        <div className="wrap">
          <div className={styles.grid}>
            <div className={styles.brand}>
              <span className={styles.logoCapsule}>
                <Logo className={styles.logoImg} />
              </span>
              <p className={styles.about}>
                كتاب أفندي، بيت الكتاب التراثي في إسطنبول. نوفّر إصدارات مؤسسة الرسالة ناشرون وأمهات
                الكتب المحققة، ونضع الذكاء الاصطناعي في خدمة طالب العلم.
              </p>
              {storeInfo.social.length > 0 && (
                <ul className={styles.social}>
                  {storeInfo.social.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} aria-label={item.label} rel="noopener" target="_blank">
                        {item.short}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <FooterSection title="المكتبة">
              <LinkList links={libraryLinks} />
            </FooterSection>
            <FooterSection title="أدوات ذكية">
              <LinkList links={smartTools} />
            </FooterSection>
            <FooterSection title="المساعدة">
              <LinkList links={helpLinks} />
            </FooterSection>
            <FooterSection title="زورونا">
              <ul>
                <li className={styles.plain}>{storeInfo.address}</li>
                <li>
                  <a
                    href={storeInfo.phone.href}
                    className={cx(styles.link, styles.strong)}
                    dir="ltr"
                  >
                    {storeInfo.phone.display}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${storeInfo.email}`} className={cx(styles.link, styles.strong)}>
                    {storeInfo.email}
                  </a>
                </li>
              </ul>
              {/* Spec: web-only product, so no app-store badges. */}
              <ul className={styles.webBadges}>
                <li className={styles.webBadge}>
                  <small>على هاتفك مباشرة</small>
                  <span dir="ltr">{storeInfo.domain}</span>
                </li>
                <li className={styles.webBadge}>
                  <small>بدون تحميل</small>
                  أضفه للشاشة الرئيسية
                </li>
              </ul>
            </FooterSection>
          </div>

          <div className={styles.bottom}>
            <p>© {formatYear(new Date().getFullYear())} كتاب أفندي. جميع الحقوق محفوظة.</p>
            <ul className={styles.pay} aria-label="طرق الدفع المقبولة" lang="en" dir="ltr">
              {paymentBadges.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
