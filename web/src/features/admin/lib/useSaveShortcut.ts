import { type RefObject, useEffect } from 'react';

/**
 * Ctrl+S (⌘S on Mac) submits the form instead of saving the web page.
 * Only while `enabled`, so of several forms on a page just the edited one saves.
 */
export function useSaveShortcut(formRef: RefObject<HTMLFormElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [formRef, enabled]);
}