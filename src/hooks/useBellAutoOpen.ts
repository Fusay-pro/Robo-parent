import { useEffect } from 'react';

const AUTO_OPEN_KEY = 'parent_bell_auto_opened_v1';

interface UseBellAutoOpenArgs {
  hasAlerts: boolean;
  onAutoOpen: () => void;
}

export function useBellAutoOpen({ hasAlerts, onAutoOpen }: UseBellAutoOpenArgs) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasAlerts) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem(AUTO_OPEN_KEY, '1');
      onAutoOpen();
    }, 500);

    return () => clearTimeout(timer);
  }, [hasAlerts, onAutoOpen]);
}
