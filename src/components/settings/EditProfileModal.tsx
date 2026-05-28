'use client';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  form: { name: string; phone: string; line_id: string };
  setForm: (updater: (prev: { name: string; phone: string; line_id: string }) => { name: string; phone: string; line_id: string }) => void;
  t: (key: string) => string;
}

export default function EditProfileModal({
  open,
  onClose,
  onSave,
  saving,
  error,
  form,
  setForm,
  t,
}: EditProfileModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-on-surface">{t('settings.editProfileTitle')}</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.displayName')}</label>
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('settings.yourNamePlace')}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.phone')}</label>
            <input type="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={t('settings.phonePlace')}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.lineId')}</label>
            <input type="text" value={form.line_id}
              onChange={e => setForm(f => ({ ...f, line_id: e.target.value }))}
              placeholder={t('settings.lineIdPlace')}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
            {t('settings.cancel')}
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
