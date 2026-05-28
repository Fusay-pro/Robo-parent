'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';

interface CancelledBooking {
  enrollment_id: number;
  student_id:    number;
  student_name:  string;
  schedule_id:   number;
  starts_at:     string;
  ends_at:       string;
  cancelled_at:  string;
  session_name:  string;
  holiday_name:  string | null;
}

interface Alerts {
  low_class_children: Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  out_of_classes:     Array<{ student_id: number; student_name: string; classes_remaining: number }>;
  cancelled_bookings: CancelledBooking[];
}

// Dismissed notifications — keys map to expiry timestamp.
// Live alerts (low classes etc) auto-resurface after 24h. Cancellations stay dismissed for a year.
const DISMISS_KEY = 'parent_dismissed_alerts_v1';
const TTL_LIVE      = 24 * 60 * 60 * 1000;          // 24h
const TTL_PERMANENT = 365 * 24 * 60 * 60 * 1000;    // ~1 year

function loadDismissed(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
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

function fmtCancelledDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

const AUTO_OPEN_KEY = 'parent_bell_auto_opened_v1';

export default function NotificationBell() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [dismissedTick, setDismissedTick] = useState(0);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0, isMobile: false });
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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
    queryFn: () => client.get('/my/alerts').then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Auto-open the bell once per session when alerts arrive (e.g. first login)
  useEffect(() => {
    if (typeof window === 'undefined' || !data) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;
    const has = (data.low_class_children?.length || 0)
              + (data.out_of_classes?.length || 0)
              + (data.cancelled_bookings?.length || 0);
    if (has > 0) {
      const t = setTimeout(() => {
        sessionStorage.setItem(AUTO_OPEN_KEY, '1');
        computeDropPos();
        setOpen(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [data]);

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

  const dismissed = useMemo(() => loadDismissed(), [dismissedTick]);
  const isDismissed = (key: string) => key in dismissed;
  function dismiss(key: string, ttl: number = TTL_LIVE, serverType?: string, refId?: number) {
    dismissKey(key, ttl);
    setDismissedTick(t => t + 1);
    // Best-effort server-side tracking
    if (serverType) {
      client.post('/my/notifications/seen', { type: serverType, ref_id: refId ?? null })
        .catch(() => { /* ignore */ });
    }
  }

  const low = (data?.low_class_children ?? []).filter(c => !isDismissed(`low-${c.student_id}`));
  const out = (data?.out_of_classes ?? []).filter(c => !isDismissed(`out-${c.student_id}`));
  const cancelled = (data?.cancelled_bookings ?? []).filter(c => !isDismissed(`cancel-${c.enrollment_id}`));
  const totalCount = low.length + out.length + cancelled.length;
  const markAllAsRead = () => {
    out.forEach((c) => dismiss(`out-${c.student_id}`, TTL_LIVE, 'out_of_classes', c.student_id));
    low.forEach((c) => dismiss(`low-${c.student_id}`, TTL_LIVE, 'low_credit', c.student_id));
    cancelled.forEach((c) => dismiss(`cancel-${c.enrollment_id}`, TTL_PERMANENT, 'cancellation', c.enrollment_id));
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          if (!open) computeDropPos();
          setOpen(v => !v);
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-[22px]" style={totalCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
          notifications
        </span>
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          style={
            dropPos.isMobile
              ? { position: 'fixed', top: dropPos.top, left: 0, right: 0, zIndex: 9999 }
              : { position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }
          }
          className={`${dropPos.isMobile ? 'w-auto max-w-none rounded-3xl mx-3 border-outline-variant/40' : 'w-[340px] max-w-[calc(100vw-1rem)] rounded-2xl'} bg-surface shadow-2xl border overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
            <h3 className="font-bold text-on-surface text-base">{t('bell.notifications')}</h3>
            {dropPos.isMobile ? (
              <button
                onClick={markAllAsRead}
                disabled={totalCount === 0}
                className="text-xs font-bold text-primary disabled:text-on-surface-variant disabled:opacity-60"
              >
                Mark all as read
              </button>
            ) : totalCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">{totalCount}</span>
            ) : null}
          </div>

          <div className={`${dropPos.isMobile ? 'max-h-[calc(100dvh-11rem)] bg-slate-50' : 'max-h-[420px]'} overflow-y-auto`}>

            {/* Out of classes */}
            {out.length > 0 && (
              <>
                <div className={`${dropPos.isMobile ? 'hidden' : 'px-5 py-2 bg-error/10 border-b border-error/20'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-error flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    {t('bell.outOfClasses')}
                  </p>
                </div>
                {out.map(c => (
                  <div key={c.student_id} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                    <button className="flex gap-3 flex-1 min-w-0 text-left"
                      onClick={() => { setOpen(false); router.push(`/kids/${c.student_id}`); }}>
                      <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-error text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                        <p className="text-[11px] font-bold text-error mt-0.5">{t('bell.packageNeedsRenewal')}</p>
                      </div>
                    </button>
                    <button onClick={e => { e.stopPropagation(); dismiss(`out-${c.student_id}`, TTL_LIVE, 'out_of_classes', c.student_id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                      title="Dismiss">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Cancelled bookings */}
            {cancelled.length > 0 && (
              <>
                <div className={`${dropPos.isMobile ? 'hidden' : 'px-5 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                    {t('bell.cancelledClasses')}
                  </p>
                  {cancelled.length > 1 && (
                    <button onClick={() => cancelled.forEach(c => dismiss(`cancel-${c.enrollment_id}`, TTL_PERMANENT, 'cancellation', c.enrollment_id))}
                      className="text-[10px] font-bold text-orange-700 hover:underline">
                      {t('bell.dismissAll')}
                    </button>
                  )}
                </div>
                {cancelled.map(c => (
                  <div key={c.enrollment_id} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-orange-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
                        {c.session_name} · {fmtCancelledDate(c.starts_at)} · {fmtTime(c.starts_at)}
                      </p>
                      <p className="text-[11px] font-bold text-orange-700 mt-0.5">
                        {t('bell.cancelled')}{c.holiday_name ? ` — ${c.holiday_name}` : ''}
                      </p>
                    </div>
                    <button onClick={() => dismiss(`cancel-${c.enrollment_id}`, TTL_PERMANENT, 'cancellation', c.enrollment_id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-100 text-on-surface-variant hover:text-orange-700 opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                      title="Dismiss">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Running low */}
            {low.length > 0 && (
              <>
                <div className={`${dropPos.isMobile ? 'hidden' : 'px-5 py-2 bg-orange-50 border-b border-orange-100'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                    {t('bell.runningLow')}
                  </p>
                </div>
                {low.map(c => (
                  <div key={c.student_id} className="group flex gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/15">
                    <button className="flex gap-3 flex-1 min-w-0 text-left"
                      onClick={() => { setOpen(false); router.push(`/kids/${c.student_id}`); }}>
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-orange-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-sm truncate">{c.student_name}</p>
                        <p className="text-[11px] font-bold text-orange-700 mt-0.5">
                          {t('bell.onlyLeft').replace('{n}', String(c.classes_remaining)).replace('{classes}', c.classes_remaining !== 1 ? t('schedule.classes') : t('schedule.class'))}
                        </p>
                      </div>
                    </button>
                    <button onClick={e => { e.stopPropagation(); dismiss(`low-${c.student_id}`, TTL_LIVE, 'low_credit', c.student_id); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-100 text-on-surface-variant hover:text-orange-700 opacity-50 group-hover:opacity-100 transition-all shrink-0 self-start"
                      title="Dismiss for 24h">
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
          {dropPos.isMobile && totalCount > 0 && (
            <div className="px-5 py-3 border-t border-outline-variant/20 text-center bg-white">
              <button
                className="text-sm font-bold text-primary"
                onClick={() => {
                  setOpen(false);
                  router.push('/requests');
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
