import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data?: T }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error; data?: T };

/** Runs `load` on mount and whenever it changes; pass a `useCallback`-memoised loader. */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ status: 'loading', data: previous.data }));
    load().then(
      (data) => !cancelled && setState({ status: 'success', data }),
      (error: unknown) =>
        !cancelled &&
        setState((previous) => ({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          data: previous.data,
        })),
    );
    return () => {
      cancelled = true;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
