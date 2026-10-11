/**
 * Public store details shown in the footer and drawer.
 * TODO(before launch): the phone number is from the design mockup. Confirm it.
 * Social links are hidden until real URLs are added here.
 */
export const storeInfo = {
  address: 'الفاتح، إسطنبول',
  phone: { display: '0212 555 44 33', href: 'tel:+902125554433' },
  email: 'info@kitapefendi.com',
  domain: 'kitapefendi.com',
  social: [] as readonly { label: string; short: string; href: string }[],
} as const;
