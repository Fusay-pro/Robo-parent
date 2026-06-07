'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface Props {
  target:  any | null;
  kidName: string;
  kidId:   string;
  onClose: () => void;
}

export default function CancellationModal({ target, kidName, kidId, onClose }: Props) {
  const qc = useQueryClient();
  const { t } = useT();
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErr,    setCancelErr]    = useState('');

  function formatTime(iso: string) {
    const d = new Date(iso);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${t(`schedule.daysShort.${DAY_KEYS[d.getDay()]}`)} ${d.getDate()} ${t(`schedule.monthsShort.${d.getMonth() + 1}`)}  ${h}:${m < 10 ? '0' + m : m} ${ampm}`;
  }

  const cancelMut = useMutation({
    mutationFn: (body: any) => client.post('/my/requests', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kid-detail', kidId] });
      qc.invalidateQueries({ queryKey: ['parent-alerts'] });
      setCancelReason('');
      onClose();
    },
    onError: (e: any) => setCancelErr(e?.response?.data?.error || 'Failed to submit request'),
  });

  function submitCancellation() {
    setCancelErr('');
    if (cancelReason.trim().length < 5) { setCancelErr(t('cancel.giveReason')); return; }
    cancelMut.mutate({
      type:     'cancellation',
      kid_name: kidName,
      reason:   cancelReason.trim(),
      details:  { enrollment_id: target.enrollment_id, starts_at: target.starts_at, course_name: target.course_name },
    });
  }

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-on-surface">{t('cancel.title')}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('cancel.subtitle')}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-3.5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{t('cancel.class')}</p>
          <p className="font-bold text-on-surface text-sm">{target.course_name || 'Session'}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{formatTime(target.starts_at)}</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
            {t('cancel.reason')} <span className="text-error">*</span>
          </label>
          <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
            placeholder={t('cancel.reasonPlace')} rows={3}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <p className="text-[11px] text-on-surface-variant mt-1.5">{t('cancel.warning')}</p>
        </div>

        {cancelErr && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2 mb-3">{cancelErr}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
            {t('cancel.keep')}
          </button>
          <button onClick={submitCancellation} disabled={cancelMut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {cancelMut.isPending ? t('cancel.sending') : t('cancel.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
