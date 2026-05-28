'use client';

import AppShell from '@/components/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';
import CancelRequestModal from '@/components/kids/CancelRequestModal';
import { getErrorMessage } from '@/lib/errors';

const KID_COLORS = ['#0ea5e9', '#006686', '#bc0b3b', '#006591'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

interface UpcomingSession {
  starts_at: string;
  course_name?: string;
  cancellation_pending?: boolean;
  enrollment_id?: number;
}

interface KidDetail {
  name: string;
  nickname?: string;
  age?: number;
  branch_name?: string;
  robot_model?: string;
  course_name?: string;
  pre_existing_conditions?: string;
  class_count?: number;
  classes_remaining?: number;
  approval_status?: 'approved' | 'pending' | string;
  package_name?: string;
  upcoming_sessions?: UpcomingSession[];
}

interface AttendanceRow {
  attendance_id: number;
  starts_at: string;
  status: 'present' | 'absent' | 'excused' | string;
  course_name?: string;
  contract_school_name?: string;
  notes?: string;
}

interface CancellationPayload {
  type: 'cancellation';
  kid_name: string;
  reason: string;
  details: { enrollment_id?: number; starts_at?: string; course_name?: string };
}

export default function KidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useT();

  function formatTime(iso: string) {
    const d = new Date(iso);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${t(`schedule.daysShort.${DAY_KEYS[d.getDay()]}`)} ${d.getDate()} ${t(`schedule.monthsShort.${d.getMonth() + 1}`)}  ${h}:${m < 10 ? '0' + m : m} ${ampm}`;
  }

  const { data: kid, isLoading, isError, refetch } = useQuery<KidDetail>({
    queryKey: ['kid-detail', id],
    queryFn: () => client.get(`/my/children/${id}`).then(r => r.data),
  });

  const { data: attendance = [], isLoading: attLoading } = useQuery<AttendanceRow[]>({
    queryKey: ['kid-attendance', id],
    queryFn: () => client.get(`/my/attendance/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });

  // Cancellation request modal
  const [cancelTarget, setCancelTarget] = useState<UpcomingSession | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErr, setCancelErr]       = useState('');

  const cancelMut = useMutation({
    mutationFn: (body: CancellationPayload) => client.post('/my/requests', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kid-detail', id] });
      qc.invalidateQueries({ queryKey: ['parent-alerts'] });
      setCancelTarget(null);
      setCancelReason('');
    },
    onError: (e: unknown) => setCancelErr(getErrorMessage(e, 'Failed to submit request')),
  });

  function submitCancellation() {
    setCancelErr('');
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 5) {
      setCancelErr(t('cancel.giveReason'));
      return;
    }
    cancelMut.mutate({
      type: 'cancellation',
      kid_name: kid?.name || 'Student',
      reason: cancelReason.trim(),
      details: { enrollment_id: cancelTarget.enrollment_id, starts_at: cancelTarget.starts_at, course_name: cancelTarget.course_name },
    });
  }

  const color = KID_COLORS[0];
  const classesUsed = kid?.class_count ? kid.class_count - (kid.classes_remaining || 0) : 0;
  const progress = kid?.class_count ? classesUsed / kid.class_count : 0;
  const isApproved = kid?.approval_status === 'approved';
  const upcomingSessions = kid?.upcoming_sessions ?? [];

  return (
    <AppShell>
      <div>
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError || !kid ? (
          <div className="p-12 text-center">
            <p className="text-on-surface-variant mb-4">{t('kid.couldNotLoad')}</p>
            <button onClick={() => refetch()} className="text-primary font-semibold hover:underline">{t('kid.retry')}</button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-5">
            {/* Back button (outside hero) */}
            <button onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm font-semibold px-2 py-1 -ml-2 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              {t('kid.back')}
            </button>

            {/* Compact hero card */}
            <div className="relative rounded-3xl overflow-hidden shadow-sm" style={{ background: `linear-gradient(135deg, ${color} 0%, #006686 100%)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

              <div className="relative px-6 md:px-8 py-6 md:py-7 flex items-center gap-4 md:gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/95 flex items-center justify-center text-3xl md:text-4xl font-bold shrink-0 shadow-lg"
                  style={{ color }}>
                  {kid.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0 text-white">
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight">{kid.name}</h2>
                  {kid.nickname && <p className="text-white/75 text-sm mt-0.5">{`"${kid.nickname}"`}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isApproved ? 'bg-emerald-400/20 text-emerald-50' : 'bg-amber-400/20 text-amber-50'}`}>
                      <span className="material-symbols-outlined text-[13px]">{isApproved ? 'check_circle' : 'pending'}</span>
                      {isApproved ? t('dashboard.approved') : t('dashboard.pending')}
                    </span>
                    {kid.age && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                        <span className="material-symbols-outlined text-[13px]">cake</span>
                        {kid.age} {t('kid.yrs')}
                      </span>
                    )}
                    {kid.branch_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {kid.branch_name}
                      </span>
                    )}
                    {kid.robot_model && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                        <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                        {kid.robot_model}
                      </span>
                    )}
                    {kid.course_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
                        <span className="material-symbols-outlined text-[13px]">school</span>
                        {kid.course_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Medical note (if any) */}
            {kid.pre_existing_conditions && (
              <div className="bg-error-container/30 border border-error/20 rounded-2xl p-3.5 flex gap-3 items-start">
                <span className="material-symbols-outlined text-error text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>medical_information</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-0.5">{t('kid.medicalNote')}</p>
                  <p className="text-sm text-on-surface">{kid.pre_existing_conditions}</p>
                </div>
              </div>
            )}

            {/* Main grid: Package (left) + Upcoming Sessions (right) on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Package card */}
              {kid.package_name ? (
                <div className="bg-surface-container-low rounded-3xl p-5 md:p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-1">{t('kid.package')}</p>
                      <h3 className="font-bold text-xl text-on-surface truncate">{kid.package_name}</h3>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl text-sm font-bold shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                      {kid.classes_remaining} {t('kid.left')}
                    </div>
                  </div>
                  <div className="h-2.5 bg-surface-container rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3 mt-auto">
                    {[
                      { label: t('kid.completed'), value: classesUsed },
                      { label: t('kid.remaining'), value: kid.classes_remaining },
                      { label: t('kid.total'),     value: kid.class_count },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-surface-container rounded-2xl px-3 py-3 text-center">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">{label}</p>
                        <p className="text-2xl font-extrabold text-on-surface">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-low rounded-3xl p-10 text-center text-on-surface-variant flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span>
                  <p className="font-semibold">{t('kid.noActivePackage')}</p>
                  <p className="text-xs mt-1">{t('kid.contactBranchAdd')}</p>
                </div>
              )}

              {/* Upcoming sessions */}
              <div className="bg-surface-container-low rounded-3xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 md:px-6 border-b border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                  <h3 className="font-bold text-on-surface">{t('kid.upcomingSessions')}</h3>
                  {upcomingSessions.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {upcomingSessions.length}
                    </span>
                  )}
                </div>
                {upcomingSessions.length > 0 ? (
                  <div className="divide-y divide-outline-variant/30 flex-1 overflow-y-auto">
                    {upcomingSessions.map((s, i: number) => {
                      const d = new Date(s.starts_at);
                      const pending = s.cancellation_pending;
                      return (
                        <div key={i} className="flex items-center gap-3 md:gap-4 px-5 md:px-6 py-3.5 hover:bg-surface-container/40 transition-colors">
                          <div className="w-11 h-11 md:w-12 md:h-12 bg-surface-container rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t(`schedule.monthsShort.${d.getMonth() + 1}`)}</span>
                            <span className="text-lg font-bold text-on-surface leading-none">{d.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-on-surface text-sm md:text-base truncate">{s.course_name || 'Session'}</p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              {formatTime(s.starts_at)}
                            </p>
                            {pending && (
                              <p className="text-[11px] font-bold text-orange-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                                {t('kid.cancellationPending')}
                              </p>
                            )}
                          </div>
                          {pending ? (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 shrink-0">
                              {t('kid.pending')}
                            </span>
                          ) : s.enrollment_id ? (
                            <button
                              onClick={() => { setCancelTarget(s); setCancelReason(''); setCancelErr(''); }}
                              className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant transition-colors shrink-0"
                              title={t('cancel.title')}>
                              {t('kid.requestCancel')}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center text-on-surface-variant">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[28px] text-outline">event_busy</span>
                    </div>
                    <p className="font-semibold text-on-surface">{t('kid.noUpcoming')}</p>
                    <p className="text-xs mt-1">{t('kid.upcomingHint')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-surface-container-low rounded-3xl overflow-hidden">
              <div className="px-5 py-4 md:px-6 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
                <h3 className="font-bold text-on-surface">{t('kid.attendanceHistory')}</h3>
                {attendance.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {attendance.length}
                  </span>
                )}
              </div>
              {attLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="py-12 px-6 text-center text-on-surface-variant flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px] text-outline">checklist</span>
                  </div>
                  <p className="font-semibold text-on-surface">{t('kid.noAttendance')}</p>
                  <p className="text-xs mt-1">{t('kid.attendanceHint')}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30">
                  {attendance.map((a) => {
                    const d = new Date(a.starts_at);
                    const present  = a.status === 'present';
                    const absent   = a.status === 'absent';
                    const excused  = a.status === 'excused';
                    const pillCls = present ? 'bg-emerald-100 text-emerald-700'
                                  : absent  ? 'bg-error/10 text-error'
                                  : excused ? 'bg-amber-100 text-amber-700'
                                  : 'bg-surface-container text-on-surface-variant';
                    const label = present ? t('kid.present') : absent ? t('kid.absent') : excused ? t('kid.excused') : a.status;
                    return (
                      <div key={a.attendance_id} className="flex items-start gap-3 md:gap-4 px-5 md:px-6 py-3.5">
                        <div className="w-11 h-11 md:w-12 md:h-12 bg-surface-container rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t(`schedule.monthsShort.${d.getMonth() + 1}`)}</span>
                          <span className="text-lg font-bold text-on-surface leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-on-surface text-sm md:text-base">{a.course_name || a.contract_school_name || 'Session'}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pillCls}`}>{label}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {formatTime(a.starts_at)}
                          </p>
                          {a.notes && (
                            <p className="text-xs text-on-surface mt-1.5 bg-surface-container rounded-xl px-3 py-2 italic">
                              &ldquo;{a.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <CancelRequestModal
          open={!!cancelTarget}
          target={cancelTarget}
          reason={cancelReason}
          error={cancelErr}
          submitting={cancelMut.isPending}
          onClose={() => setCancelTarget(null)}
          onReasonChange={setCancelReason}
          onSubmit={submitCancellation}
          formatTime={formatTime}
          t={t}
        />
      </div>
    </AppShell>
  );
}



