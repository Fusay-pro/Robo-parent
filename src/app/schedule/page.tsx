'use client';

import AppShell from '@/components/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import client from '@/lib/api';
import Link from 'next/link';
import { useT } from '@/context/I18nContext';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

interface AvailableSession {
  schedule_id:     number;
  starts_at:       string;
  ends_at:         string;
  max_capacity:    number;
  course_name?:    string;
  robot_type_name?: string;
  enrolled_count:  number;
  my_kids_booked:  number[] | null;
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const { t } = useT();
  const today = new Date();
  const [tab, setTab] = useState<'mine' | 'available'>('mine');
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // My kids (for showing both upcoming AND for the booking modal)
  const { data: kids = [] } = useQuery<any[]>({
    queryKey: ['my-children'],
    queryFn: () => client.get('/my/children').then(r => r.data),
  });
  const approvedKids = kids.filter(k => k.approval_status === 'approved');

  // Available sessions
  const { data: available = [] } = useQuery<AvailableSession[]>({
    queryKey: ['available-sessions'],
    queryFn: () => client.get('/my/available-sessions').then(r => r.data),
    enabled: tab === 'available' && approvedKids.length > 0,
    staleTime: 60_000,
  });

  // My already-booked sessions (flatten upcoming_sessions across kids)
  const allMine = approvedKids.flatMap(k =>
    (k.upcoming_sessions || []).map((s: any) => ({ ...s, kidName: k.name, student_id: k.student_id }))
  );

  // Calendar setup
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a set of date strings that have sessions, depending on the tab
  const dateSet = useMemo(() => {
    const set = new Set<string>();
    if (tab === 'mine') {
      allMine.forEach(s => set.add(toDateStr(new Date(s.starts_at))));
    } else {
      available.forEach(s => set.add(toDateStr(new Date(s.starts_at))));
    }
    return set;
  }, [tab, allMine, available]);

  // Filter sessions for the selected date (or all if none picked)
  const sessionsToday = useMemo(() => {
    const arr = tab === 'mine' ? allMine : available;
    const sorted = [...arr].sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    if (!selectedDate) return sorted;
    return sorted.filter((s: any) => toDateStr(new Date(s.starts_at)) === selectedDate);
  }, [tab, allMine, available, selectedDate]);

  // Booking modal state
  const [bookTarget, setBookTarget] = useState<AvailableSession | null>(null);
  const [pickedKids, setPickedKids] = useState<Set<number>>(new Set());
  const [bookNote, setBookNote]   = useState('');
  const [bookErrs, setBookErrs]   = useState<Record<number, string>>({});
  const [bookProgress, setBookProgress] = useState<{ done: number; total: number } | null>(null);

  function openBook(s: AvailableSession) {
    setBookTarget(s);
    setPickedKids(new Set());
    setBookNote('');
    setBookErrs({});
    setBookProgress(null);
  }
  function toggleKid(studentId: number) {
    setPickedKids(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  }

  async function confirmBooking() {
    if (!bookTarget || pickedKids.size === 0) return;
    setBookErrs({});
    const ids = [...pickedKids];
    setBookProgress({ done: 0, total: ids.length });
    const failures: Record<number, string> = {};

    for (let i = 0; i < ids.length; i++) {
      const sid = ids[i];
      const kid = approvedKids.find(k => k.student_id === sid);
      const pkgId = kid?.customer_package_id;
      try {
        await client.post('/enrollments', {
          student_id:          sid,
          schedule_id:         bookTarget.schedule_id,
          customer_package_id: pkgId,
          booking_note:        bookNote.trim() || undefined,
        });
      } catch (e: any) {
        failures[sid] = e?.response?.data?.error || 'Failed';
      }
      setBookProgress({ done: i + 1, total: ids.length });
    }

    qc.invalidateQueries({ queryKey: ['my-children'] });
    qc.invalidateQueries({ queryKey: ['available-sessions'] });
    qc.invalidateQueries({ queryKey: ['parent-alerts'] });

    if (Object.keys(failures).length === 0) {
      setBookTarget(null);
    } else {
      setBookErrs(failures);
      setBookProgress(null);
    }
  }

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-12 md:py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-on-surface">{t('schedule.title')}</h2>
          <p className="text-on-surface-variant mt-1 text-sm">{t('schedule.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-outline-variant mb-6">
          {([
            { key: 'mine', label: t('schedule.myBookings') },
            { key: 'available', label: t('schedule.available') },
          ] as const).map(tab2 => (
            <button key={tab2.key} onClick={() => { setTab(tab2.key as 'mine' | 'available'); setSelectedDate(null); }}
              className={`pb-3 text-sm font-bold transition-colors relative ${tab === tab2.key ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {tab2.label}
              {tab === tab2.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'available' && approvedKids.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-surface-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px] text-outline">hourglass_top</span>
            </div>
            <p className="font-semibold text-on-surface">{t('schedule.registrationPending')}</p>
            <p className="text-xs mt-1">{t('schedule.registrationPendingHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-surface-container-low rounded-3xl p-5 md:p-6 self-start">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg text-on-surface">{t(`schedule.months.${month + 1}`)} {year}</h3>
                <div className="flex gap-1">
                  <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
                  </button>
                  <button onClick={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(toDateStr(today)); }}
                    className="px-2.5 py-1 text-[11px] font-bold text-on-surface-variant hover:text-primary rounded-lg hover:bg-primary/10 transition-colors">
                    {t('schedule.today')}
                  </button>
                  <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_KEYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-on-surface-variant py-1">{t(`schedule.days.${d}`)}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const dateStr = toDateStr(date);
                  const isToday = dateStr === toDateStr(today);
                  const isSelected = dateStr === selectedDate;
                  const hasSession = dateSet.has(dateStr);
                  return (
                    <button key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative flex flex-col items-center justify-center h-10 rounded-xl text-sm font-medium transition-all cursor-pointer
                        ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/30'
                          : isToday ? 'bg-primary/10 text-primary font-bold'
                          : hasSession ? 'hover:bg-primary/10 text-on-surface'
                          : 'hover:bg-surface-container text-on-surface'
                        }`}>
                      {day}
                      {hasSession && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sessions list */}
            <div className="lg:col-span-3 bg-surface-container-low rounded-3xl overflow-hidden self-start">
              <div className="px-5 py-4 md:px-6 border-b border-outline-variant flex items-center gap-2">
                <h3 className="font-bold text-on-surface">
                  {selectedDate
                    ? (() => {
                        const d = new Date(selectedDate + 'T00:00:00');
                        const wd = DAY_KEYS[d.getDay()];
                        return `${t(`schedule.daysLong.${wd}`)}, ${d.getDate()} ${t(`schedule.months.${d.getMonth() + 1}`)}`;
                      })()
                    : (tab === 'mine' ? t('schedule.upcomingSessions') : t('schedule.allAvailable'))}
                </h3>
              </div>

              {sessionsToday.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant flex flex-col items-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[28px] text-outline">event_busy</span>
                  </div>
                  <p className="font-semibold text-on-surface">
                    {selectedDate ? t('schedule.noOnDay') : tab === 'mine' ? t('dashboard.noUpcoming') : t('schedule.noAvailable')}
                  </p>
                  {tab === 'available' && (
                    <p className="text-xs mt-1">{t('schedule.checkBack')}</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30 max-h-[560px] overflow-y-auto">
                  {sessionsToday.map((s: any, i: number) => {
                    if (tab === 'mine') {
                      const d = new Date(s.starts_at);
                      return (
                        <Link key={i} href={`/kids/${s.student_id}`}
                          className="flex items-center gap-3 md:gap-4 px-5 md:px-6 py-3.5 hover:bg-surface-container/40 transition-colors">
                          <div className="w-12 h-12 bg-surface-container rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t(`schedule.monthsShort.${d.getMonth() + 1}`)}</span>
                            <span className="text-lg font-bold text-on-surface leading-none">{d.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-on-surface text-sm md:text-base truncate">{s.course_name || 'Session'}</p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1 flex-wrap">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              {fmtTime(s.starts_at)}
                              <span>·</span>
                              <span>{s.kidName}</span>
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-outline">chevron_right</span>
                        </Link>
                      );
                    }
                    // available tab
                    const a = s as AvailableSession;
                    const d = new Date(a.starts_at);
                    const filled = a.enrolled_count / Math.max(a.max_capacity, 1);
                    const isFull = a.enrolled_count >= a.max_capacity;
                    const barCls = isFull ? 'bg-error' : filled >= 0.75 ? 'bg-amber-500' : 'bg-primary';
                    return (
                      <div key={a.schedule_id} className="flex items-center gap-3 md:gap-4 px-5 md:px-6 py-3.5">
                        <div className="w-12 h-12 bg-surface-container rounded-xl flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase">{t(`schedule.monthsShort.${d.getMonth() + 1}`)}</span>
                          <span className="text-lg font-bold text-on-surface leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-on-surface text-sm md:text-base">{a.course_name || 'Session'}</p>
                            {a.robot_type_name && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.robot_type_name}</span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            {fmtTime(a.starts_at)} – {fmtTime(a.ends_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] font-bold text-on-surface-variant">
                              {a.enrolled_count} / {a.max_capacity || '∞'} {t('schedule.booked')}
                            </span>
                            {a.max_capacity > 0 && (
                              <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div className={`h-full ${barCls} rounded-full transition-all`}
                                  style={{ width: `${Math.min(filled * 100, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openBook(a)}
                          disabled={isFull}
                          className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-all ${
                            isFull
                              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                              : 'bg-primary text-white hover:opacity-90 active:scale-95'
                          }`}>
                          {isFull ? t('schedule.full') : t('schedule.book')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Booking modal */}
      {bookTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBookTarget(null)} />
          <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-outline-variant/20">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-lg font-bold text-on-surface leading-tight">{t('schedule.bookClass')}</h3>
                <button onClick={() => setBookTarget(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
              <p className="text-sm font-semibold text-primary">{bookTarget.course_name || 'Session'}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {(() => {
                  const d = new Date(bookTarget.starts_at);
                  return `${t(`schedule.daysShort.${DAY_KEYS[d.getDay()]}`)} ${d.getDate()} ${t(`schedule.monthsShort.${d.getMonth() + 1}`)}`;
                })()}
                {' · '}{fmtTime(bookTarget.starts_at)} – {fmtTime(bookTarget.ends_at)}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t('schedule.selectKids')}</p>
                {approvedKids.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic">No approved kids yet.</p>
                ) : (
                  <div className="space-y-2">
                    {approvedKids.map((k: any) => {
                      const alreadyBooked = bookTarget.my_kids_booked?.includes(k.student_id);
                      const noClasses    = (k.classes_remaining ?? 0) === 0;
                      const disabled     = alreadyBooked || noClasses;
                      const picked       = pickedKids.has(k.student_id);
                      const err          = bookErrs[k.student_id];

                      return (
                        <button
                          key={k.student_id}
                          onClick={() => !disabled && toggleKid(k.student_id)}
                          disabled={disabled}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors ${
                            disabled ? 'bg-surface-container/40 border-outline-variant/30 cursor-not-allowed opacity-70'
                            : picked  ? 'bg-primary/10 border-primary'
                            : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/40'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            picked ? 'bg-primary border-primary' : 'border-outline-variant'
                          }`}>
                            {picked && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                          </div>
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm shrink-0">
                            {k.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-on-surface text-sm truncate">{k.name}</p>
                            <p className={`text-[11px] ${noClasses ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                              {alreadyBooked ? t('schedule.alreadyBooked')
                                : noClasses ? t('schedule.noClassesLeft')
                                : `${k.classes_remaining ?? 0} ${t('schedule.classesLeft')}`}
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
                <textarea
                  value={bookNote}
                  onChange={e => setBookNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={t('schedule.notePlace')}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {pickedKids.size > 0 && (
                <p className="text-xs text-on-surface-variant text-center bg-primary/5 rounded-xl py-2">
                  {t('schedule.willUse')} <span className="font-bold text-primary">{pickedKids.size}</span> {pickedKids.size > 1 ? t('schedule.classes') : t('schedule.class')} {t('schedule.onePerKid')}
                </p>
              )}

              {bookProgress && (
                <p className="text-xs text-primary text-center font-semibold">
                  {t('schedule.booking')} {bookProgress.done} / {bookProgress.total}…
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/20 flex gap-3 bg-surface">
              <button onClick={() => setBookTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">
                {t('schedule.cancel')}
              </button>
              <button
                onClick={confirmBooking}
                disabled={pickedKids.size === 0 || bookProgress !== null}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {bookProgress ? `${t('schedule.booking')}…` : `${t('schedule.confirmBooking')}${pickedKids.size > 1 ? ` (${pickedKids.size})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
