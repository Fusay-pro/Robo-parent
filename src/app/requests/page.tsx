'use client';

import AppShell from '@/components/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';

interface RequestRow {
  request_id: number;
  type: 'cancellation' | 'absence' | 'refund' | 'reinstatement';
  status: 'pending' | 'approved' | 'rejected';
  details: any;
  staff_note?: string;
  created_at: string;
  updated_at: string;
}

const TYPE_STYLE: Record<string, { icon: string; bg: string; text: string }> = {
  cancellation:   { icon: 'event_busy',          bg: 'bg-orange-100', text: 'text-orange-700' },
  absence:        { icon: 'sick',                bg: 'bg-amber-100',  text: 'text-amber-700' },
  refund:         { icon: 'request_quote',       bg: 'bg-rose-100',   text: 'text-rose-700' },
  reinstatement:  { icon: 'restart_alt',         bg: 'bg-blue-100',   text: 'text-blue-700' },
};

const STATUS_STYLE: Record<string, { cls: string; icon: string }> = {
  pending:  { cls: 'bg-amber-100 text-amber-700',     icon: 'hourglass_top' },
  approved: { cls: 'bg-emerald-100 text-emerald-700', icon: 'check_circle' },
  rejected: { cls: 'bg-error/10 text-error',          icon: 'cancel' },
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

type NewType = 'absence' | 'refund' | 'reinstatement';

const NEW_TYPE_STYLE: Record<NewType, { icon: string; bg: string; text: string }> = {
  absence:        { icon: 'sick',          bg: 'bg-amber-100', text: 'text-amber-700' },
  refund:         { icon: 'request_quote', bg: 'bg-rose-100',  text: 'text-rose-700' },
  reinstatement:  { icon: 'restart_alt',   bg: 'bg-blue-100',  text: 'text-blue-700' },
};

export default function RequestsPage() {
  const qc = useQueryClient();
  const { t } = useT();
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  const typeLabel = (k: string) => {
    if (k === 'cancellation') return t('requests.types.cancellation');
    if (k === 'absence')      return t('requests.types.absence');
    if (k === 'refund')       return t('requests.types.refund');
    if (k === 'reinstatement')return t('requests.types.reinstatement');
    return k;
  };
  const statusLabel = (k: string) => {
    if (k === 'pending')  return t('requests.status.pending');
    if (k === 'approved') return t('requests.status.approved');
    if (k === 'rejected') return t('requests.status.rejected');
    return k;
  };
  const typePlaceholder = (k: NewType) => {
    if (k === 'absence')       return t('requests.absencePlace');
    if (k === 'refund')        return t('requests.refundPlace');
    return t('requests.reinstatePlace');
  };
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${t(`schedule.daysShort.${DAY_KEYS[d.getDay()]}`)} ${d.getDate()} ${t(`schedule.monthsShort.${d.getMonth() + 1}`)} ${d.getFullYear()}`;
  };

  const { data: requests = [], isLoading } = useQuery<RequestRow[]>({
    queryKey: ['my-requests', tab],
    queryFn: () => client.get(`/my/requests?filter=${tab}`).then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Kids list for the new-request modal
  const { data: kids = [] } = useQuery<any[]>({
    queryKey: ['my-children'],
    queryFn: () => client.get('/my/children').then(r => r.data),
  });
  const approvedKids = kids.filter(k => k.approval_status === 'approved');

  // New request modal state
  const [newOpen, setNewOpen]     = useState(false);
  const [newType, setNewType]     = useState<NewType>('absence');
  const [newKidId, setNewKidId]   = useState<number | null>(null);
  const [newReason, setNewReason] = useState('');
  const [newErr, setNewErr]       = useState('');

  const createReq = useMutation({
    mutationFn: (d: any) => client.post('/my/requests', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-requests'] });
      setNewOpen(false);
      setNewReason('');
      setNewKidId(null);
      setTab('pending');
    },
    onError: (e: any) => setNewErr(e?.response?.data?.error || t('requests.failedSend')),
  });

  function openNew() {
    setNewOpen(true);
    setNewType('absence');
    setNewKidId(approvedKids[0]?.student_id ?? null);
    setNewReason('');
    setNewErr('');
  }
  function submitNew() {
    setNewErr('');
    if (!newKidId) { setNewErr(t('requests.pickKid')); return; }
    if (newReason.trim().length < 5) { setNewErr(t('requests.giveReason')); return; }
    const kid = approvedKids.find(k => k.student_id === newKidId);
    createReq.mutate({
      type:     newType,
      kid_name: kid?.name || 'Student',
      reason:   newReason.trim(),
      details:  { student_id: newKidId },
    });
  }

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-12 md:py-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-on-surface">{t('requests.title')}</h2>
            <p className="text-on-surface-variant mt-1 text-sm">{t('requests.subtitle')}</p>
          </div>
          <button onClick={openNew}
            disabled={approvedKids.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">{t('requests.newRequest')}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-outline-variant mb-6">
          {(['pending', 'completed'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={`pb-3 text-sm font-bold transition-colors relative ${tab === k ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {k === 'pending' ? t('requests.pending') : t('requests.completed')}
              {tab === k && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-surface-container-low animate-pulse rounded-3xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 px-6 text-center text-on-surface-variant flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-surface-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px] text-outline">inbox</span>
            </div>
            <p className="font-semibold text-on-surface">
              {tab === 'pending' ? t('requests.noPending') : t('requests.noCompleted')}
            </p>
            <p className="text-xs mt-1">
              {tab === 'pending' ? t('requests.noPendingHint') : t('requests.noCompletedHint')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(r => {
              const meta = TYPE_STYLE[r.type] || { icon: 'description', bg: 'bg-surface-container', text: 'text-on-surface-variant' };
              const status = STATUS_STYLE[r.status] || { cls: 'bg-surface-container text-on-surface-variant', icon: 'help' };
              const kidName = r.details?.kid_name;
              const reason  = r.details?.reason;
              const sessionStart = r.details?.starts_at;
              const sessionName  = r.details?.course_name;

              return (
                <div key={r.request_id}
                  className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/30">
                  {/* Header */}
                  <div className={`px-5 py-3 flex items-center gap-3 ${meta.bg}`}>
                    <span className={`material-symbols-outlined ${meta.text} text-[20px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>{typeLabel(r.type)}</p>
                      {kidName && <p className="text-sm font-semibold text-on-surface truncate">{kidName}</p>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.cls}`}>
                      <span className="material-symbols-outlined text-[12px]">{status.icon}</span>
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    {sessionStart && (
                      <div className="bg-surface-container rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-0.5">{t('cancel.class')}</p>
                        <p className="text-sm font-semibold text-on-surface">{sessionName || 'Session'}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {fmtDate(sessionStart)} · {fmtTime(sessionStart)}
                        </p>
                      </div>
                    )}

                    {reason && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{t('requests.yourReason')}</p>
                        <p className="text-sm text-on-surface whitespace-pre-wrap">{reason}</p>
                      </div>
                    )}

                    {r.staff_note && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">{t('requests.replyFromSchool')}</p>
                        <p className="text-sm text-on-surface bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">{r.staff_note}</p>
                      </div>
                    )}

                    <p className="text-[10px] text-on-surface-variant">
                      {t('requests.submittedOn')} {fmtDate(r.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New request modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNewOpen(false)} />
          <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
            <div className="px-6 pt-5 pb-3 border-b border-outline-variant/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-on-surface leading-tight">{t('requests.newRequestTitle')}</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">{t('requests.newRequestSubtitle')}</p>
                </div>
                <button onClick={() => setNewOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Type picker */}
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('requests.type')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(NEW_TYPE_STYLE) as NewType[]).map(k => {
                    const info = NEW_TYPE_STYLE[k];
                    const active = newType === k;
                    return (
                      <button key={k} onClick={() => setNewType(k)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all ${
                          active
                            ? `${info.bg} ${info.text} border-current shadow-sm`
                            : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
                        }`}>
                        <span className="material-symbols-outlined text-[20px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          {info.icon}
                        </span>
                        <span className="text-[11px] font-bold leading-tight text-center">{typeLabel(k)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kid picker */}
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('requests.forWhich')}</p>
                {approvedKids.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic">{t('requests.noApprovedKids')}</p>
                ) : approvedKids.length === 1 ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <div className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {approvedKids[0].name?.[0]?.toUpperCase()}
                    </div>
                    <p className="font-semibold text-on-surface text-sm">{approvedKids[0].name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvedKids.map((k: any) => {
                      const picked = newKidId === k.student_id;
                      return (
                        <button key={k.student_id} onClick={() => setNewKidId(k.student_id)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                            picked ? 'bg-primary/10 border-primary' : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                          }`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            picked ? 'border-primary bg-primary' : 'border-outline-variant'
                          }`}>
                            {picked && <span className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {k.name?.[0]?.toUpperCase()}
                          </div>
                          <p className="font-semibold text-on-surface text-sm">{k.name}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('cancel.reason')} <span className="text-error">*</span></p>
                <textarea
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={typePlaceholder(newType)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {newReason.length} / 500 {t('requests.charsCount')}
                </p>
              </div>

              {newErr && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{newErr}</p>}
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
              <button onClick={() => setNewOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                {t('requests.cancel')}
              </button>
              <button onClick={submitNew} disabled={createReq.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">send</span>
                {createReq.isPending ? t('requests.sending') : t('requests.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
