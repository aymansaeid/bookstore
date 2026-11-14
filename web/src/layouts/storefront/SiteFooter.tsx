import { Link } from 'react-router';

import { legalSlugs } from '@/app/legal';
import { searchUrl } from '@/app/navigation';
import { paths } from '@/app/paths';
import { storeInfo } from '@/app/storeInfo';
import { cx } from '@/shared/lib/cx';
import { formatYear } from '@/shared/lib/format';
import { Logo } from '@/shared/ui/Logo/Logo';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher/LanguageSwitcher';
import { FooterSection } from './FooterSection';
import { NewsletterCta } from './NewsletterCta';
import styles from './SiteFooter.module.css';
import { useTranslation } from 'react-i18next';
import type arCommon from '@/i18n/locales/ar/common.json';

type FooterStrings = (typeof arCommon)['footer'];
/** A translation key under footer.*: links.ask, categories.hadith… */
type FooterLinkKey =
  `links.${keyof FooterStrings['links']}` | `categories.${keyof FooterStrings['categories']}`;

interface FooterLink {
  key: FooterLinkKey;
  to: string;
}

// Category links search by their Arabic name in every language (the catalog
// data is Arabic); only the label is translated. Step 8 switches to slugs.
const libraryLinks: FooterLink[] = (
  [
    { key: 'categories.hadith', query: 'الحديث وعلومه' },
    { key: 'categories.tafsir', query: 'التفسير وعلوم القرآن' },
    { key: 'categories.aqidah', query: 'العقيدة' },
    { key: 'categories.history', query: 'التراجم والتاريخ' },
    { key: 'categories.arabic', query: 'اللغة العربية' },
  ] as const
).map(({ key, query }) => ({ key, to: searchUrl(query) }));

const smartTools: FooterLink[] = [
  { key: 'links.ask', to: paths.askEfendi },
  { key: 'links.paths', to: paths.readingPaths },
  { key: 'links.photoSearch', to: `${paths.askEfendi}?mode=photo` },
  { key: 'links.compareEditions', to: paths.askEfendi },
  { key: 'links.smartLibrary', to: paths.account.library },
];

const helpLinks: FooterLink[] = [
  { key: 'links.trackOrder', to: paths.trackOrder },
  { key: 'links.returns', to: paths.returns },
  { key: 'links.distanceSales', to: paths.legal(legalSlugs.distanceSales) },
  { key: 'links.privacy', to: paths.legal(legalSlugs.privacy) },
  { key: 'links.terms', to: paths.legal(legalSlugs.terms) },
];

const paymentBadges = ['VISA', 'MASTERCARD', 'TROY', 'iyzico', 'PayPal'];

function LinkList({ links }: { links: FooterLink[] }) {
  const { t } = useTranslation(undefined, { keyPrefix: 'footer' });
  return (
    <ul>
      {links.map((link) => (
        <li key={link.key}>
          <Link to={link.to} className={styles.link}>
            {t(link.key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  const { t } = useTranslation(undefined, { keyPrefix: 'footer' });
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
              <p className={styles.about}>{t('about')}</p>
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

            <FooterSection title={t('library')}>
              <LinkList links={libraryLinks} />
            </FooterSection>
            <FooterSection title={t('smartTools')}>
              <LinkList links={smartTools} />
            </FooterSection>
            <FooterSection title={t('help')}>
              <LinkList links={helpLinks} />
            </FooterSection>
            <FooterSection title={t('visit')}>
              <ul>
                <li className={styles.plain}>{t('address')}</li>
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
                  <small>{t('onYourPhone')}</small>
                  <span dir="ltr">{storeInfo.domain}</span>
                </li>
                <li className={styles.webBadge}>
                  <small>{t('noDownload')}</small>
                  {t('addToHome')}
                </li>
              </ul>
            </FooterSection>
          </div>

     <div className={styles.bottom}>
              <p>{t('copyright', { year: formatYear(new Date().getFullYear()) })}</p>
              <LanguageSwitcher variant="inline" />
              <ul className={styles.pay} aria-label={t('payments')} lang="en" dir="ltr">
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
