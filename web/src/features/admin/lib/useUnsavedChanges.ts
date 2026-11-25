import { useEffect } from 'react';
import { useBlocker } from 'react-router';

const QUESTION = 'لديك تغييرات لم تُحفظ. هل تريد المغادرة وتركها؟';

/**
 * Warns before leaving a page with unsaved edits: another admin page (router
 * blocker) or closing / reloading the tab (beforeunload). By default changing
 * only the query string or hash (a tab, a section link) is allowed; pages whose
 * editor follows ?edit= pass `watchSearch` so picking another record asks too.
 * One per page: React Router supports a single blocker at a time.
 */
export function useUnsavedChanges(dirty: boolean, watchSearch = false) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        (watchSearch && currentLocation.search !== nextLocation.search)),
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(QUESTION)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);
}