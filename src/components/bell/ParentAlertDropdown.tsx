'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/context/I18nContext';

const TTL_LIVE      = 24 * 60 * 60 * 1000;
const TTL_PERMANENT = 365 * 24 * 60 * 60 * 1000;

function fmtCancelledDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

interface LowClass { student_id: number; student_name: string; classes_remaining: number; }
interface CancelledBooking {
  enrollment_id: number; student_id: number; student_name: string; schedule_id: number;
  starts_at: string; ends_at: string; cancelled_at: string; session_name: string; holiday_name: string | null;
}

interface Props {
  dropRef:      React.RefObject<HTMLDivElement | null>;
  dropPos:      { top: number; right: number; isMobile: boolean };
  low:          LowClass[];
  out:          LowClass[];
  cancelled:    CancelledBooking[];
  totalCount:   number;
  dismiss:      (key: string, ttl: number, serverType?: string, refId?: number) => void;
  markAllAsRead: () => void;
  onClose:      () => void;
}

export default function ParentAlertDropdown({ dropRef, dropPos, low, out, cancelled, totalCount, dismiss, markAllAsRead, onClose }: Props) {
  const { t } = useT();
  const router = useRouter();

  return (
    <div
      ref={dropRef}
      style={
        dropPos.isMobile
          ? { position: 'fixed', top: dropPos.top, left: 0, right: 0, zIndex: 9999 }
          : { position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 9999 }
      }
      className={`${dropPos.isMobile
        ? 'w-auto max-w-none rounded-3xl mx-3 border-outline-variant/40'
        : 'w-[340px] max-w-[calc(100vw-1rem)] rounded-2xl'
      } bg-surface shadow-2xl border overflow-hidden`}
    >
      <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
        <h3 className="font-bold text-on-surface text-base">{t('bell.notifications')}</h3>
        {dropPos.isMobile ? (
          <button onClick={markAllAsRead} disabled={totalCount === 0}
            className="text-xs font-bold text-primary disabled:text-on-surface-variant disabled:opacity-60">
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
                  onClick={() => { onClose(); router.push(`/kids/${c.student_id}`); }}>
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
                  onClick={() => { onClose(); router.push(`/kids/${c.student_id}`); }}>
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
          <button className="text-sm font-bold text-primary"
            onClick={() => { onClose(); router.push('/requests'); }}>
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
