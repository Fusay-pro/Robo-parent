'use client';

import AppShell from '@/components/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import client from '@/lib/api';
import Link from 'next/link';
import { useT } from '@/context/I18nContext';
import { getErrorMessage } from '@/lib/errors';

const KID_COLORS = ['#0ea5e9', '#006686', '#bc0b3b', '#006591'];

interface UpcomingSession {
  starts_at: string;
  course_name?: string;
}

interface KidSummary {
  student_id: number;
  name: string;
  nickname?: string;
  approval_status?: 'approved' | 'pending' | string;
  class_count?: number;
  classes_remaining?: number;
  upcoming_sessions?: UpcomingSession[];
}

interface ParentProfile {
  branch_id?: number;
  branch_name?: string;
}

interface AddKidPayload {
  name: string;
  nickname?: string;
  date_of_birth?: string;
  pre_existing_conditions?: string;
  branch_id: number;
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { t, locale } = useT();
  const { data: kids = [], isLoading } = useQuery<KidSummary[]>({
    queryKey: ['my-children'],
    queryFn: () => client.get('/my/children').then(r => r.data),
  });

  const { data: profile } = useQuery<ParentProfile>({
    queryKey: ['my-profile'],
    queryFn: () => client.get('/my/profile').then(r => r.data),
  });

  // Add child modal
  const [addOpen, setAddOpen] = useState(false);
  const [kidForm, setKidForm] = useState({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' });
  const [kidErr, setKidErr] = useState('');

  const addKidMut = useMutation({
    mutationFn: (d: AddKidPayload) => client.post('/students', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-children'] });
      setAddOpen(false);
      setKidForm({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' });
    },
    onError: (e: unknown) => setKidErr(getErrorMessage(e, 'Failed to add child')),
  });

  function submitAddKid() {
    setKidErr('');
    if (!kidForm.name.trim()) { setKidErr('Name is required'); return; }
    if (!profile?.branch_id)  { setKidErr('Your branch is not set - please contact support'); return; }
    addKidMut.mutate({
      name: kidForm.name.trim(),
      nickname: kidForm.nickname.trim() || undefined,
      date_of_birth: kidForm.date_of_birth || undefined,
      pre_existing_conditions: kidForm.pre_existing_conditions.trim() || undefined,
      branch_id: profile.branch_id,
    });
  }

  const approvedKids = kids.filter(k => k.approval_status === 'approved');
  const allUpcoming = approvedKids.flatMap(k =>
    (k.upcoming_sessions || []).map((s) => ({
      ...s,
      kidName: k.name,
      color: KID_COLORS[approvedKids.indexOf(k) % KID_COLORS.length],
    }))
  ).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const totalSessions = approvedKids.reduce((sum, k) => sum + (k.class_count || 0), 0);
  const totalRemaining = approvedKids.reduce((sum, k) => sum + (k.classes_remaining || 0), 0);

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-12 md:py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-on-surface">{t('dashboard.title')}</h2>
            <p className="text-on-surface-variant mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <button onClick={() => { setKidForm({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' }); setKidErr(''); setAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-primary/20 shrink-0">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span className="hidden sm:inline">{t('dashboard.addChild')}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-surface-container animate-pulse rounded-3xl" />)}
          </div>
        ) : kids.length === 0 ? (
          <div className="bg-surface-container-low rounded-3xl p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>child_care</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">{t('dashboard.firstChild')}</h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
              {t('dashboard.firstChildHint')}
            </p>
            <button onClick={() => { setKidForm({ name: '', nickname: '', date_of_birth: '', pre_existing_conditions: '' }); setKidErr(''); setAddOpen(true); }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              {t('dashboard.addChild')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats row */}
            {approvedKids.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('dashboard.kidsEnrolled'), value: approvedKids.length, icon: 'group' },
                  { label: t('dashboard.totalClasses'), value: totalSessions, icon: 'school' },
                  { label: t('dashboard.classesLeft'), value: totalRemaining, icon: 'event_available' },
                  { label: t('dashboard.upcoming'), value: allUpcoming.length, icon: 'calendar_month' },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface-container-low rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">{stat.icon}</span>
                      <span className="text-xs text-on-surface-variant font-medium">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main grid: Upcoming Sessions (left) + Your Kids (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-10">
              {/* Upcoming sessions list */}
              <div className="lg:col-span-3 bg-surface-container-low rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="font-bold text-on-surface">{t('dashboard.upcomingSessions')}</h3>
                  <Link href="/schedule" className="text-xs text-primary font-semibold hover:underline">{t('dashboard.viewAll')}</Link>
                </div>
                {allUpcoming.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-on-surface-variant">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[28px] text-outline">event_busy</span>
                    </div>
                    <p className="font-semibold text-on-surface">{t('dashboard.noUpcoming')}</p>
                    <p className="text-xs mt-1">{t('dashboard.bookedShowHere')}</p>
                  </div>
                ) : (
                  allUpcoming.slice(0, 8).map((s, i: number) => {
                    const d = new Date(s.starts_at);
                    return (
                      <div key={i} className="flex items-center gap-4 px-6 py-3.5 border-b border-outline-variant last:border-none hover:bg-surface-container-low transition-colors">
                        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-surface-container shrink-0">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t(`schedule.monthsShort.${d.getMonth() + 1}`)}</span>
                          <span className="text-lg font-bold text-on-surface leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm truncate">{s.course_name || 'Session'}</p>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} &bull; {s.kidName}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Your Kids (right column, stacked) */}
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-3">{t('dashboard.yourKids')}</h3>
                <div className="space-y-3">
                  {kids.map((kid, i) => {
                    const color = KID_COLORS[i % KID_COLORS.length];
                    const classesUsed = kid.class_count ? kid.class_count - (kid.classes_remaining || 0) : 0;
                    const progress = kid.class_count ? classesUsed / kid.class_count : 0;
                    return (
                      <Link key={kid.student_id} href={`/kids/${kid.student_id}`}
                        className="block bg-surface-container-lowest rounded-3xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                        <div className="h-12 relative" style={{ backgroundColor: `${color}1a` }}>
                          <div className="absolute -bottom-4 left-4 w-9 h-9 rounded-2xl border-2 border-white flex items-center justify-center text-sm font-bold text-white shadow-md" style={{ backgroundColor: color }}>
                            {kid.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        </div>
                        <div className="pt-6 px-4 pb-4">
                          <div className="mb-2">
                            <h4 className="font-bold text-on-surface leading-tight text-sm truncate">{kid.name}</h4>
                          </div>
                          {kid.class_count ? (
                            <div>
                              <div className="flex justify-between items-baseline text-[11px] text-on-surface-variant mb-1">
                                <span className="truncate">{t('dashboard.classesLeft')}</span>
                                <span className="font-semibold shrink-0 ml-2">{kid.classes_remaining}</span>
                              </div>
                              <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-on-surface-variant">{t('dashboard.noPackage')}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add child modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
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
                <button onClick={() => setAddOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.fullName')} <span className="text-error">*</span></label>
                <input value={kidForm.name}
                  onChange={e => setKidForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nong Maxx"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.nickname')}</label>
                  <input value={kidForm.nickname}
                    onChange={e => setKidForm(f => ({ ...f, nickname: e.target.value }))}
                    placeholder="e.g. Maxx"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{t('addChild.dob')}</label>
                  <input type="date" value={kidForm.date_of_birth}
                    onChange={e => setKidForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  {t('addChild.medicalNotes')} <span className="normal-case font-normal tracking-normal">({t('addChild.medicalHint')})</span>
                </label>
                <textarea value={kidForm.pre_existing_conditions}
                  onChange={e => setKidForm(f => ({ ...f, pre_existing_conditions: e.target.value }))}
                  rows={3}
                  placeholder={t('addChild.medicalPlace')}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {profile?.branch_name && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">storefront</span>
                  <span className="text-xs text-on-surface">
                    {t('addChild.willBeReg')} <span className="font-bold text-primary">{profile.branch_name}</span>
                  </span>
                </div>
              )}

              {kidErr && <p className="text-xs text-error bg-error-container/30 rounded-xl px-3 py-2">{kidErr}</p>}
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
              <button onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                {t('addChild.cancel')}
              </button>
              <button onClick={submitAddKid} disabled={addKidMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">send</span>
                {addKidMut.isPending ? t('addChild.submitting') : t('addChild.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}



