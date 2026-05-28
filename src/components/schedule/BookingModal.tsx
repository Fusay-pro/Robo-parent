'use client';

interface AvailableSession {
  schedule_id: number;
  starts_at: string;
  ends_at: string;
  course_name?: string;
  my_kids_booked: number[] | null;
}

interface ApprovedKid {
  student_id: number;
  name: string;
  classes_remaining?: number;
}

interface BookingModalProps {
  open: boolean;
  target: AvailableSession | null;
  approvedKids: ApprovedKid[];
  pickedKids: Set<number>;
  note: string;
  errs: Record<number, string>;
  progress: { done: number; total: number } | null;
  onClose: () => void;
  onToggleKid: (studentId: number) => void;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  fmtTime: (iso: string) => string;
  dayLabel: (iso: string) => string;
  t: (key: string) => string;
}

export default function BookingModal(props: BookingModalProps) {
  const {
    open, target, approvedKids, pickedKids, note, errs, progress,
    onClose, onToggleKid, onNoteChange, onConfirm, fmtTime, dayLabel, t,
  } = props;
  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="px-6 pt-5 pb-3 border-b border-outline-variant/20">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-lg font-bold text-on-surface leading-tight">{t('schedule.bookClass')}</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
          <p className="text-sm font-semibold text-primary">{target.course_name || 'Session'}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {dayLabel(target.starts_at)} {' Â· '}{fmtTime(target.starts_at)} - {fmtTime(target.ends_at)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('schedule.selectKids')}</p>
            {approvedKids.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">No approved kids yet.</p>
            ) : (
              <div className="space-y-2">
                {approvedKids.map((k) => {
                  const alreadyBooked = target.my_kids_booked?.includes(k.student_id);
                  const noClasses = (k.classes_remaining ?? 0) === 0;
                  const disabled = alreadyBooked || noClasses;
                  const picked = pickedKids.has(k.student_id);
                  const err = errs[k.student_id];
                  return (
                    <button key={k.student_id} onClick={() => !disabled && onToggleKid(k.student_id)} disabled={disabled}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors ${
                        disabled ? 'bg-surface-container/40 border-outline-variant/30 cursor-not-allowed opacity-70'
                        : picked ? 'bg-primary/10 border-primary'
                        : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${picked ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                        {picked && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {k.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface text-sm truncate">{k.name}</p>
                        <p className={`text-[11px] ${noClasses ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                          {alreadyBooked ? t('schedule.alreadyBooked') : noClasses ? t('schedule.noClassesLeft') : `${k.classes_remaining ?? 0} ${t('schedule.classesLeft')}`}
                        </p>
                        {err && <p className="text-[11px] text-error font-bold mt-0.5">{err}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              {t('schedule.noteToStaff')} <span className="normal-case font-normal tracking-normal">({t('register.optional')})</span>
            </label>
            <textarea value={note} onChange={e => onNoteChange(e.target.value)} rows={3} maxLength={500}
              placeholder={t('schedule.notePlace')}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {pickedKids.size > 0 && (
            <p className="text-xs text-on-surface-variant text-center bg-primary/5 rounded-xl py-2">
              {t('schedule.willUse')} <span className="font-bold text-primary">{pickedKids.size}</span> {pickedKids.size > 1 ? t('schedule.classes') : t('schedule.class')} {t('schedule.onePerKid')}
            </p>
          )}
          {progress && <p className="text-xs text-primary text-center font-semibold">{t('schedule.booking')} {progress.done} / {progress.total}...</p>}
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
            {t('schedule.cancel')}
          </button>
          <button onClick={onConfirm} disabled={pickedKids.size === 0 || progress !== null}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {progress ? `${t('schedule.booking')}...` : `${t('schedule.confirmBooking')}${pickedKids.size > 1 ? ` (${pickedKids.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}


