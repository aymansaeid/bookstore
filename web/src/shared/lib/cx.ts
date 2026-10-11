/** Joins class names, skipping falsy values (CSS module lookups may be undefined). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
