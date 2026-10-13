import { useCallback, useEffect, useState } from 'react';

/**
 * Countdown for "send again" buttons (API guide §7: 60 s between emails).
 * Pass `startedAt` (a Date.now() taken in an event handler) to begin cooling
 * down immediately, e.g. right after registration sent the first email.
 */
export function useCooldown(seconds: number, startedAt = 0) {
  const [until, setUntil] = useState(startedAt ? startedAt + seconds * 1000 : 0);
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    if (until === 0) return;
    const id = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= until) window.clearInterval(id);
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [until]);

  const start = useCallback(() => {
    const time = Date.now();
    setNow(time);
    setUntil(time + seconds * 1000);
  }, [seconds]);

  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
