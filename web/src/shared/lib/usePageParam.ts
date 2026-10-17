import { useSearchParams } from 'react-router';

/** ?page=N (1-based, anything invalid is 1), plus a builder for Pagination links. */
export function usePageParam() {
  const [params] = useSearchParams();
  const raw = Number(params.get('page'));
  const page = Number.isSafeInteger(raw) && raw > 1 ? raw : 1;
  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete('page');
    else next.set('page', String(target));
    const search = next.toString();
    return search ? `?${search}` : '?';
  };
  return { page, hrefFor };
}
