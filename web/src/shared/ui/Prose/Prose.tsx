import { useMemo } from 'react';

import { cx } from '@/shared/lib/cx';

import styles from './Prose.module.css';

/**
 * A full HTML document (or a fragment with <style>) must never be injected
 * as-is: its styles would apply to the whole store. Keep only the body
 * content, without style, link, script, meta or title elements.
 */
function toFragment(html: string): string {
  if (!/<(html|head|body|style|link|script)\b/i.test(html)) return html;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('style, link, script, meta, title').forEach((node) => {
    node.remove();
  });
  return parsed.body.innerHTML;
}

/**
 * Renders a server-made HTML fragment (legal documents, API §5c). The API
 * guarantees these are safe fragments with no script; never pass user input.
 */
export function Prose({ html, className }: { html: string; className?: string }) {
  const fragment = useMemo(() => toFragment(html), [html]);
  return (
    <div className={cx(styles.prose, className)} dangerouslySetInnerHTML={{ __html: fragment }} />
  );
}
