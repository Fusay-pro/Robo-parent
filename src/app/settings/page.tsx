'use client';

import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api';
import Link from 'next/link';
import { enablePushNotifications, hasFirebaseConfig } from '@/lib/push';
import LanguageToggle from '@/components/LanguageToggle';
import { useT } from '@/context/I18nContext';
import EditProfileModal from '@/components/settings/EditProfileModal';
import AddChildModal from '@/components/settings/AddChildModal';
import { getErrorMessage } from '@/lib/errors';

interface ParentProfile {
  name?: string;
  phone?: string;
  line_id?: string;
  email?: string;
  branch_id?: number;
  branch_name?: string;
}

interface ParentKid {
  student_id: number;
  name: string;
  nickname?: string;
  approval_status?: 'approved' | 'pending' | string;
}

interface ProfileUpdatePayload {
  name: string;
  phone?: string;
  line_id?: string;
}

interface AddKidPayload {
  name: string;
  nickname?: string;
  date_of_birth?: string;
  pre_existing_conditions?: string;
  branch_id: number;
}

interface PasswordPayload {
  current_password: string;
  new_password: string;
}

export default function SettingsPage() {
  const { signOut } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useT();

  const { data: profile } = useQuery<ParentProfile>({
    queryKey: ['my-profile'],
    queryFn: () => client.get('/my/profile').then(r => r.data),
  });

  const { data: kids = [] } = useQuery<ParentKid[]>({
    queryKey: ['my-children'],
    queryFn: () => client.get('/my/children').then(r => r.data),
  });

  // -- Edit profile modal --
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm]   = useState({ name: '', phone: '', line_id: '' });
  const [profileErr, setProfileErr]     = useState('');

  const profileMut = useMutation({
    mutationFn: (d: ProfileUpdatePayload) => client.patch('/my/profile', d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      setProfileModal(false);
    },
    onError: (e: unknown) => setProfileErr(getErrorMessage(e, t('settings.saveFailed'))),
  });
  function openProfile() {
    setProfileForm({ name: profile?.name || '', phone: profile?.phone || '', line_id: profile?.line_id || '' });
    setProfileErr('');
    setProfileModal(true);
  }
  function saveProfile() {
    setProfileErr('');
    if (!profileForm.name.trim()) { setProfileErr(t('settings.nameEmpty')); return; }
    profileMut.mutate({
      name:    profileForm.name.trim(),
      phone:   profileForm.phone.trim() || undefined,
      line_id: profileForm.line_id.trim() || undefined,
    });
  }

  // -- Add Child modal --
  const [addOpen, setAddOpen] = useState(false);
  const [kidForm, setKidForm] = useState({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' });
  const [kidErr, setKidErr]   = useState('');

  const addKidMut = useMutation({
    mutationFn: (d: AddKidPayload) => client.post('/students', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] });
      setAddOpen(false);
    },
    onError: (e: unknown) => setKidErr(getErrorMessage(e, t('settings.failedAddChild'))),
  });
  function submitAddKid() {
    setKidErr('');
    if (!kidForm.name.trim()) { setKidErr(t('addChild.nameRequired')); return; }
    if (!profile?.branch_id)  { setKidErr(t('settings.branchNotSet')); return; }
    addKidMut.mutate({
      name:                    kidForm.name.trim(),
      nickname:                kidForm.nickname.trim() || undefined,
      date_of_birth:           kidForm.date_of_birth || undefined,
      pre_existing_conditions: kidForm.pre_existing_conditions.trim() || undefined,
      branch_id:               profile.branch_id,
    });
  }

  // -- Push notifications --
  const [pushStatus, setPushStatus] = useState<'idle' | 'enabling' | 'enabled' | 'denied' | 'unsupported' | 'error'>(() => {
    if (typeof window === 'undefined') return 'idle';
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'enabled';
    if (Notification.permission === 'denied') return 'denied';
    return 'idle';
  });
  const [pushErr, setPushErr] = useState('');
  async function enablePush() {
    setPushStatus('enabling');
    setPushErr('');
    const res = await enablePushNotifications();
    if (res.ok) {
      setPushStatus('enabled');
    } else {
      setPushStatus('error');
      setPushErr(res.reason || 'Failed');
    }
  }

  // -- Password --
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr]   = useState('');
  const [pwOk, setPwOk]     = useState(false);
  const [showPw, setShowPw] = useState(false);

  const pwMut = useMutation({
    mutationFn: (d: PasswordPayload) => client.patch('/users/me/password', d),
    onSuccess: () => {
      setPwOk(true);
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwOk(false), 3000);
    },
    onError: (e: unknown) => setPwErr(getErrorMessage(e, t('settings.failedPw'))),
  });
  function submitPassword() {
    setPwErr('');
    if (!pwForm.current) { setPwErr(t('settings.enterCurrentPw')); return; }
    if (pwForm.next.length < 8) { setPwErr(t('settings.pwShort')); return; }
    if (pwForm.next !== pwForm.confirm) { setPwErr(t('settings.pwMismatch')); return; }
    pwMut.mutate({ current_password: pwForm.current, new_password: pwForm.next });
  }

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-on-surface">{t('settings.title')}</h2>
          <p className="text-on-surface-variant mt-1 text-sm">{t('settings.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: Account */}
          <div className="lg:col-span-1">
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20">
                <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.account')}</p>
              </div>
              <div className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined text-[38px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-lg">{profile?.name || t('settings.parent')}</p>
                  {profile?.email && <p className="text-xs text-on-surface-variant mt-0.5">{profile.email}</p>}
                  <span className="inline-block mt-2 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary uppercase">
                    {t('settings.parentAccess')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Parent Details + Kids + Security */}
          <div className="lg:col-span-2 space-y-6">

            {/* Parent Details */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.parentDetails')}</p>
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>contact_page</span>
              </div>
              <div className="divide-y divide-outline-variant/20">
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('settings.name')}</p>
                    <p className="font-semibold text-on-surface text-sm truncate">{profile?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('settings.phone')}</p>
                    <p className="font-semibold text-on-surface text-sm truncate">{profile?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('settings.email')}</p>
                    <p className="font-semibold text-on-surface text-sm truncate">{profile?.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">chat</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('settings.lineId')}</p>
                    <p className="font-semibold text-on-surface text-sm truncate">{profile?.line_id || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-outline-variant/20">
                <button onClick={openProfile}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  {t('settings.editProfile')}
                </button>
              </div>
            </div>

            {/* Your Kids */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.yourKids')}</p>
                  {kids.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{kids.length}</span>
                  )}
                </div>
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>child_care</span>
              </div>
              {kids.length === 0 ? (
                <div className="py-10 px-6 text-center text-on-surface-variant flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px] text-outline">child_care</span>
                  </div>
                  <p className="font-semibold text-on-surface">{t('settings.noKidsYet')}</p>
                  <p className="text-xs mt-1">{t('settings.noKidsHint')}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {kids.map((k) => {
                    const approved = k.approval_status === 'approved';
                    return (
                      <Link key={k.student_id} href={`/kids/${k.student_id}`}
                        className="flex items-center gap-3 px-6 py-3.5 hover:bg-surface-container-low/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                          {k.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-on-surface text-sm truncate">{k.name}</p>
                          {k.nickname && <p className="text-[11px] text-on-surface-variant truncate">{`"${k.nickname}"`}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {approved ? t('dashboard.approved') : t('dashboard.pending')}
                        </span>
                        <span className="material-symbols-outlined text-outline text-[18px] shrink-0">chevron_right</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="px-6 py-4 border-t border-outline-variant/20">
                <button onClick={() => { setKidForm({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' }); setKidErr(''); setAddOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold hover:bg-primary/5 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  {t('settings.addChild')}
                </button>
              </div>
            </div>

            {/* Push Notifications */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.notifications')}</p>
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
              </div>
              <div className="p-6 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-on-surface text-sm">{t('settings.push')}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {pushStatus === 'enabled'
                      ? t('settings.pushEnabled')
                      : pushStatus === 'denied'
                      ? t('settings.pushBlocked')
                      : pushStatus === 'unsupported'
                      ? t('settings.pushUnsupported')
                      : !hasFirebaseConfig()
                      ? t('settings.pushNotConfigured')
                      : t('settings.pushDefault')}
                  </p>
                  {pushErr && <p className="text-[11px] text-error mt-1">{pushErr}</p>}
                </div>
                {pushStatus === 'enabled' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {t('settings.enabled')}
                  </span>
                ) : (
                  <button onClick={enablePush}
                    disabled={pushStatus === 'enabling' || pushStatus === 'denied' || pushStatus === 'unsupported' || !hasFirebaseConfig()}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0">
                    {pushStatus === 'enabling' ? t('settings.enabling') : t('settings.enable')}
                  </button>
                )}
              </div>
            </div>

            {/* Language */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.language')}</p>
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>translate</span>
              </div>
              <div className="p-6 flex items-center justify-between gap-4">
                <p className="text-sm text-on-surface-variant">English / ???????</p>
                <LanguageToggle />
              </div>
            </div>

            {/* Security */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-widest text-primary uppercase">{t('settings.security')}</p>
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.currentPw')}</label>
                  <input type={showPw ? 'text' : 'password'} value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.newPw')}</label>
                    <input type={showPw ? 'text' : 'password'} value={pwForm.next}
                      onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                      placeholder={t('settings.minChars')}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{t('settings.confirmPw')}</label>
                    <input type={showPw ? 'text' : 'password'} value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder={t('settings.repeatNewPw')}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
                  <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary" />
                  {t('settings.showPw')}
                </label>
                {pwErr && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{pwErr}</p>}
                {pwOk  && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {t('settings.pwUpdated')}
                  </p>
                )}
                <button onClick={submitPassword} disabled={pwMut.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  {pwMut.isPending ? t('settings.updating') : t('settings.updatePw')}
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-error/20 overflow-hidden">
              <div className="p-6">
                <button
                  onClick={() => { signOut(); router.replace('/login'); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error text-white text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  {t('nav.logout')}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <EditProfileModal
        open={profileModal}
        onClose={() => setProfileModal(false)}
        onSave={saveProfile}
        saving={profileMut.isPending}
        error={profileErr}
        form={profileForm}
        setForm={setProfileForm}
        t={t}
      />

      <AddChildModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={submitAddKid}
        submitting={addKidMut.isPending}
        error={kidErr}
        profileBranchName={profile?.branch_name}
        form={kidForm}
        setForm={setKidForm}
        t={t}
      />
    </AppShell>
  );
}





