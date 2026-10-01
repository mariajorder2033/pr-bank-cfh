import { useEffect } from 'react';
import { BRAND_NAME } from './config';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${BRAND_NAME}`;
  }, [title]);
}
