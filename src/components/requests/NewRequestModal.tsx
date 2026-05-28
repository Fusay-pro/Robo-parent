'use client';

type NewType = 'absence' | 'refund' | 'reinstatement';
interface KidSummary {
  student_id: number;
  name: string;
}

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  sending: boolean;
  newType: NewType;
  setNewType: (v: NewType) => void;
  newKidId: number | null;
  setNewKidId: (v: number) => void;
  newReason: string;
  setNewReason: (v: string) => void;
  newErr: string;
  approvedKids: KidSummary[];
  typeLabel: (k: string) => string;
  typePlaceholder: (k: NewType) => string;
  t: (key: string) => string;
}

const NEW_TYPE_STYLE: Record<NewType, { icon: string; bg: string; text: string }> = {
  absence: { icon: 'sick', bg: 'bg-amber-100', text: 'text-amber-700' },
  refund: { icon: 'request_quote', bg: 'bg-rose-100', text: 'text-rose-700' },
  reinstatement: { icon: 'restart_alt', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function NewRequestModal(props: NewRequestModalProps) {
  const { open, onClose, onSubmit, sending, newType, setNewType, newKidId, setNewKidId, newReason, setNewReason, newErr, approvedKids, typeLabel, typePlaceholder, t } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="px-6 pt-5 pb-3 border-b border-outline-variant/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-on-surface leading-tight">{t('requests.newRequestTitle')}</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('requests.newRequestSubtitle')}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('requests.type')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(NEW_TYPE_STYLE) as NewType[]).map(k => {
                const info = NEW_TYPE_STYLE[k];
                const active = newType === k;
                return (
                  <button key={k} onClick={() => setNewType(k)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all ${
                      active ? `${info.bg} ${info.text} border-current shadow-sm`
                      : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
                    }`}>
                    <span className="material-symbols-outlined text-[20px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{info.icon}</span>
                    <span className="text-[11px] font-bold leading-tight text-center">{typeLabel(k)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('requests.forWhich')}</p>
            {approvedKids.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">{t('requests.noApprovedKids')}</p>
            ) : approvedKids.length === 1 ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="w-9 h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">{approvedKids[0].name?.[0]?.toUpperCase()}</div>
                <p className="font-semibold text-on-surface text-sm">{approvedKids[0].name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvedKids.map((k) => {
                  const picked = newKidId === k.student_id;
                  return (
                    <button key={k.student_id} onClick={() => setNewKidId(k.student_id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                        picked ? 'bg-primary/10 border-primary' : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${picked ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                        {picked && <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{k.name?.[0]?.toUpperCase()}</div>
                      <p className="font-semibold text-on-surface text-sm">{k.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('cancel.reason')} <span className="text-error">*</span></p>
            <textarea value={newReason} onChange={e => setNewReason(e.target.value)} rows={4} maxLength={500} placeholder={typePlaceholder(newType)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            <p className="text-[11px] text-on-surface-variant mt-1">{newReason.length} / 500 {t('requests.charsCount')}</p>
          </div>
          {newErr && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{newErr}</p>}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">{t('requests.cancel')}</button>
          <button onClick={onSubmit} disabled={sending}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">send</span>
            {sending ? t('requests.sending') : t('requests.send')}
          </button>
        </div>
      </div>
    </div>
  );
}


