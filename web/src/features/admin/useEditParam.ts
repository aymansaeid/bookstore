import { useSearchParams } from 'react-router';

/** ?edit=new or ?edit=12: which record the side editor shows. Survives reloads and Back. */
export function useEditParam() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('edit');
  const edit: 'new' | number | null =
    raw === 'new' ? 'new' : raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

  const set = (value: 'new' | number | null, replace = false) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete('edit');
    else next.set('edit', String(value));
    setParams(next, { replace });
  };

  return {
    edit,
    open: (value: 'new' | number) => {
      set(value);
    },
    /** After a create: show the saved record without a new history entry. */
    replace: (value: number) => {
      set(value, true);
    },
    close: () => {
      set(null);
    },
  };
}