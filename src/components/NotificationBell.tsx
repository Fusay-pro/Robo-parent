'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api';
import ParentAlertDropdown from './bell/ParentAlertDropdown';

interface CancelledBooking {
  enrollment_id: number; student_id: number; student_name: string; schedule_id: number;
  starts_at: string; ends_at: string; cancelled_at: string; session_name: string; holiday_name: string | null;
}
interface Alerts {
  low_class_children: Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  out_of_classes:     Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  cancelled_bookings: CancelledBooking[];
}

const DISMISS_KEY   = 'parent_dismissed_alerts_v1';
const TTL_LIVE      = 24 * 60 * 60 * 1000;
const TTL_PERMANENT = 365 * 24 * 60 * 60 * 1000;

function loadDismissed(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, number>;
    const now  = Date.now();
    const live: Record<string, number> = {};
    for (const k in data) if (data[k] > now) live[k] = data[k];
    return live;
  } catch { return {}; }
}
function dismissKey(key: string, ttl: number = TTL_LIVE) {
  if (typeof window === 'undefined') return;
  const data = loadDismissed();
  data[key] = Date.now() + ttl;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [dismissedTick, setDismissedTick] = useState(0);
  const [dropPos,       setDropPos]       = useState({ top: 0, right: 0, isMobile: false });
  const dropRef        = useRef<HTMLDivElement>(null);
  const btnRef         = useRef<HTMLButtonElement>(null);
  const autoOpenedRef  = useRef(false);

  function computeDropPos() {
    if (!btnRef.current || typeof window === 'undefined') return;
    const r = btnRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    setDropPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right), isMobile });
  }

  const { data } = useQuery<Alerts>({
    queryKey: ['parent-alerts'],
    queryFn: () => client.get('/my/alerts').then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !data || autoOpenedRef.current) return;
    const has = (data.low_class_children?.length || 0)
              + (data.out_of_classes?.length || 0)
              + (data.cancelled_bookings?.length || 0);
    if (has > 0) {
      const timer = setTimeout(() => {
        autoOpenedRef.current = true;
        computeDropPos();
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !dropRef.current?.contains(target)) setOpen(false);
    }
    if (open) document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    computeDropPos();
    window.addEventListener('resize', computeDropPos);
    window.addEventListener('scroll', computeDropPos, true);
    return () => {
      window.removeEventListener('resize', computeDropPos);
      window.removeEventListener('scroll', computeDropPos, true);
    };
  }, [open]);

  const dismissed   = useMemo(() => loadDismissed(), [dismissedTick]);
  const isDismissed = (key: string) => key in dismissed;

  function dismiss(key: string, ttl: number = TTL_LIVE, serverType?: string, refId?: number) {
    dismissKey(key, ttl);
    setDismissedTick(n => n + 1);
    if (serverType) {
      client.post('/my/notifications/seen', { type: serverType, ref_id: refId ?? null }).catch(() => {});
    }
  }

  const low       = (data?.low_class_children  ?? []).filter(c => !isDismissed(`low-${c.student_id}`));
  const out       = (data?.out_of_classes       ?? []).filter(c => !isDismissed(`out-${c.student_id}`));
  const cancelled = (data?.cancelled_bookings   ?? []).filter(c => !isDismissed(`cancel-${c.enrollment_id}`));
  const totalCount = low.length + out.length + cancelled.length;

  const markAllAsRead = () => {
    out.forEach(c       => dismiss(`out-${c.student_id}`,       TTL_LIVE,      'out_of_classes', c.student_id));
    low.forEach(c       => dismiss(`low-${c.student_id}`,       TTL_LIVE,      'low_credit',     c.student_id));
    cancelled.forEach(c => dismiss(`cancel-${c.enrollment_id}`, TTL_PERMANENT, 'cancellation',   c.enrollment_id));
  };

  return (
    <div className="relative">
      <button ref={btnRef}
        onClick={() => { if (!open) computeDropPos(); setOpen(v => !v); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant text-[22px]"
          style={totalCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
          notifications
        </span>
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <ParentAlertDropdown
          dropRef={dropRef}
          dropPos={dropPos}
          low={low}
          out={out}
          cancelled={cancelled}
          totalCount={totalCount}
          dismiss={dismiss}
          markAllAsRead={markAllAsRead}
          onClose={() => setOpen(false)}
        />,
        document.body
      )}
    </div>
  );
}
