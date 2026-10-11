const SITE_NAME = 'كتاب أفندي';

interface DocumentTitleProps {
  /** Page name. Omit on the home page to show the site name alone. */
  title?: string;
}

/** Sets document.title. React 19 hoists <title> into <head> automatically. */
export function DocumentTitle({ title }: DocumentTitleProps) {
  const text = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Kitap Efendi`;
  return <title>{text}</title>;
}
