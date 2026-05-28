'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';
import { readLocalStorageJson, writeLocalStorageJson } from '@/lib/storage';
import { useBellAutoOpen } from '@/hooks/useBellAutoOpen';

interface CancelledBooking {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  schedule_id: number;
  starts_at: string;
  ends_at: string;
  cancelled_at: string;
  session_name: string;
  holiday_name: string | null;
}

interface Alerts {
  low_class_children: Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  out_of_classes: Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  cancelled_bookings: CancelledBooking[];
}

// Dismissed notifications - keys map to expiry timestamp.
// Live alerts (low classes etc) auto-resurface after 24h. Cancellations stay dismissed for a year.
const DISMISS_KEY = 'parent_dismissed_alerts_v1';
const TTL_LIVE = 24 * 60 * 60 * 1000; // 24h
const TTL_PERMANENT = 365 * 24 * 60 * 60 * 1000; // ~1 year

function loadDismissed(): Record<string, number> {
  const data = readLocalStorageJson<Record<string, number>>(DISMISS_KEY, {});
  const now = Date.now();
  const live: Record<string, number> = {};
  for (const k in data) {
    if (data[k] > now) live[k] = data[k];
  }
  return live;
}

function dismissKey(key: string, ttl: number = TTL_LIVE) {
  if (typeof window === 'undefined') return;
  const data = loadDismissed();
  data[key] = Date.now() + ttl;
  writeLocalStorageJson(DISMISS_KEY, data);
}

export default function NotificationBell() {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed());
  const [dropPos, setDropPos] = useState({ top: 0, right: 0, isMobile: false });
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function fmtCancelledDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function cancelKey(c: CancelledBooking) {
    return `cancel-${c.enrollment_id}-${c.schedule_id}-${c.starts_at}`;
  }

  function computeDropPos() {
    if (!btnRef.current || typeof window === 'undefined') return;
    const r = btnRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    setDropPos({
      top: r.bottom + 8,
      right: Math.max(8, window.innerWidth - r.right),
      isMobile,
    });
  }

  const { data } = useQuery<Alerts>({
    queryKey: ['parent-alerts'],
    queryFn: () => client.get('/my/alerts').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const hasAlerts =
    ((data?.low_class_children?.length || 0) +
      (data?.out_of_classes?.length || 0) +
      (data?.cancelled_bookings?.length || 0)) > 0;
  const handleAutoOpen = useCallback(() => {
    computeDropPos();
    setOpen(true);
  }, []);

  useBellAutoOpen({
    hasAlerts,
    onAutoOpen: handleAutoOpen,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const insideBtn = btnRef.current?.contains(target);
      const insideDrop = dropRef.current?.contains(target);
      if (!insideBtn && !insideDrop) setOpen(false);
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

  const isDismissed = (key: string) => key in dismissed;

  function dismiss(key: string, ttl: number = TTL_LIVE, serverType?: string, refId?: number) {
    dismissKey(key, ttl);
    setDismissed(loadDismissed());
    if (serverType) {
      client.post('/my/notifications/seen', { type: serverType, ref_id: refId ?? null }).catch(() => {
        // ignore best-effort tracking failures
      });
    }
  }

  const low = (data?.low_class_children ?? []).filter((c) => !isDismissed(`low-${c.student_id}`));
  const out = (data?.out_of_classes ?? []).filter((c) => !isDismissed(`out-${c.student_id}`));
  const cancelled = (data?.cancelled_bookings ?? []).filter((c) => !isDismissed(cancelKey(c)));
  const totalCount = low.length + out.length + cancelled.length;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          if (!open) computeDropPos();
          setOpen((v) => !v);
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0"
      >
        <span
          className="material-symbols-outlined text-on-surface-variant text-[22px]"
          style={totalCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
          notifications
        </span>
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropRef}
            style={
              dropPos.isMobile
                ? { position: 'fixed', top: dropPos.top, left: 0, right: 0, zIndex: 9999 }
                : { position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }
            }
            className={`${dropPos.isMobile ? 'w-auto max-w-none rounded-xl' : 'w-[340px] max-w-[calc(100vw-1rem)] rounded-2xl'} bg-surface shadow-2xl border border-outline-variant/30 overflow-hidden`}
          >
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-bold text-on-surface text-base">{t('bell.notifications')}</h3>
              {totalCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">{totalCount}</span>
              )}
            </div>

            <div className={`${dropPos.isMobile ? 'max-h-[calc(100dvh-7rem)]' : 'max-h-[420px]'} overflow-y-auto`}>
              {out.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-error/10 border-b border-error/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-error flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        error
                      </span>
                      {t('bell.outOfClasses')}
                    </p>
                  </div>
                  {out.map((c) => (
                    <div key={c.student_id} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                      <button className="flex gap-3 flex-1 min-w-0 text-left" onClick={() => { setOpen(false); router.push(`/kids/${c.student_id}`); }}>
                        <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-error text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            warning
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                          <p className="text-[11px] font-bold text-error mt-0.5">{t('bell.packageNeedsRenewal')}</p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(`out-${c.student_id}`, TTL_LIVE, 'out_of_classes', c.student_id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </>
              )}

              {cancelled.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        event_busy
                      </span>
                      {t('bell.cancelledClasses')}
                    </p>
                    {cancelled.length > 1 && (
                      <button
                        onClick={() => cancelled.forEach((c) => dismiss(cancelKey(c), TTL_PERMANENT, 'cancellation', c.enrollment_id))}
                        className="text-[10px] font-bold text-orange-700 hover:underline"
                      >
                        {t('bell.dismissAll')}
                      </button>
                    )}
                  </div>
                  {cancelled.map((c) => (
                    <div key={`${c.enrollment_id}-${c.schedule_id}-${c.starts_at}`} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-orange-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          event_busy
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                          {c.session_name} | {fmtCancelledDate(c.starts_at)} | {fmtTime(c.starts_at)}
                        </p>
                        <p className="text-[11px] font-bold text-orange-700 mt-0.5">
                          {t('bell.cancelled')}
                          {c.holiday_name ? ` - ${c.holiday_name}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => dismiss(cancelKey(c), TTL_PERMANENT, 'cancellation', c.enrollment_id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-100 text-on-surface-variant hover:text-orange-700 opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </>
              )}

              {low.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-orange-50 border-b border-orange-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        schedule
                      </span>
                      {t('bell.runningLow')}
                    </p>
                  </div>
                  {low.map((c) => (
                    <div key={c.student_id} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                      <button className="flex gap-3 flex-1 min-w-0 text-left" onClick={() => { setOpen(false); router.push(`/kids/${c.student_id}`); }}>
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-orange-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            notifications_active
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                          <p className="text-[11px] font-bold text-orange-700 mt-0.5">
                            {t('bell.onlyLeft')
                              .replace('{n}', String(c.classes_remaining))
                              .replace('{classes}', c.classes_remaining !== 1 ? t('schedule.classes') : t('schedule.class'))}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(`low-${c.student_id}`, TTL_LIVE, 'low_credit', c.student_id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-100 text-on-surface-variant hover:text-orange-700 opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                        title="Dismiss for 24h"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </>
              )}

              {totalCount === 0 && (
                <div className="px-5 py-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline block mb-2">notifications_off</span>
                  <p className="text-sm font-semibold text-on-surface-variant">{t('bell.allCaughtUp')}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{t('bell.noAlerts')}</p>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
