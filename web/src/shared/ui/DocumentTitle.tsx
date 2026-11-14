import { useTranslation } from 'react-i18next';

interface DocumentTitleProps {
  /** Page name. Omit on the home page to show the site name alone. */
  title?: string;
}

/** Sets document.title. React 19 hoists <title> into <head> automatically. */
export function DocumentTitle({ title }: DocumentTitleProps) {
  const { t, i18n } = useTranslation();
  const site = t('siteName');
  // Arabic adds the Latin name for tabs and bookmarks; elsewhere they're the same.
  const home = i18n.language === 'ar' ? `${site} · Kitap Efendi` : site;
  const text = title ? `${title} · ${site}` : home;
  return <title>{text}</title>;
}