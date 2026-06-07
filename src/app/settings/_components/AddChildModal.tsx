'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';

interface Props {
  open: boolean;
  branchId: number | undefined;
  branchName: string | undefined;
  onClose: () => void;
}

export default function AddChildModal({ open, branchId, branchName, onClose }: Props) {
  const qc = useQueryClient();
  const { t } = useT();
  const [form, setForm] = useState({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' });
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: any) => client.post('/students', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] });
      setForm({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' });
      onClose();
    },
    onError: (e: any) => setErr(e?.response?.data?.error || t('settings.failedAddChild')),
  });

  function submit() {
    setErr('');
    if (!form.name.trim()) { setErr(t('addChild.nameRequired')); return; }
    if (!branchId)         { setErr(t('settings.branchNotSet')); return; }
    mut.mutate({
      name:                    form.name.trim(),
      nickname:                form.nickname.trim() || undefined,
      date_of_birth:           form.date_of_birth || undefined,
      pre_existing_conditions: form.pre_existing_conditions.trim() || undefined,
      branch_id:               branchId,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="px-6 pt-5 pb-3 border-b border-outline-variant/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>child_care</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">{t('addChild.title')}</h3>
                <p className="text-xs text-on-surface-variant">{t('addChild.reviewHint')}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.fullName')} <span className="text-error">*</span></label>
            <input value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nong Maxx"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.nickname')}</label>
              <input value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="e.g. Maxx"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.dob')}</label>
              <input type="date" value={form.date_of_birth}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              {t('addChild.medicalNotes')} <span className="normal-case font-normal tracking-normal">({t('addChild.medicalHint')})</span>
            </label>
            <textarea value={form.pre_existing_conditions}
              onChange={e => setForm(f => ({ ...f, pre_existing_conditions: e.target.value }))}
              rows={3}
              placeholder={t('addChild.medicalPlace')}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          {branchName && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]">storefront</span>
              <span className="text-xs text-on-surface">
                {t('addChild.willBeReg')} <span className="font-bold text-primary">{branchName}</span>
              </span>
            </div>
          )}
          {err && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
            {t('addChild.cancel')}
          </button>
          <button onClick={submit} disabled={mut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">send</span>
            {mut.isPending ? t('addChild.submitting') : t('addChild.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
