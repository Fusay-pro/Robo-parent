'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import client from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/I18nContext';
import LanguageToggle from '@/components/LanguageToggle';

interface Branch { branch_id: number; name: string; address?: string; phone?: string; }

export default function RegisterPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { t } = useT();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', line_id: '', password: '', branch_id: '' });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Fetch branches on mount
  useEffect(() => {
    client.get('/public/branches')
      .then(r => {
        setBranches(r.data);
        // Auto-select if only one branch
        if (r.data.length === 1) setForm(f => ({ ...f, branch_id: String(r.data[0].branch_id) }));
      })
      .catch(() => { /* ignore — user can still see error on submit */ });
  }, []);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.branch_id) { setError('Please pick a branch'); return; }
    setLoading(true);
    try {
      await client.post('/auth/register', {
        name:      form.name,
        email:     form.email,
        phone:     form.phone,
        line_id:   form.line_id.trim() || undefined,
        password:  form.password,
        branch_id: parseInt(form.branch_id),
        consent:   true,
      });
      setStep(2);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (val.length > 1) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/verify-otp', { email: form.email, otp: otp.join('') });
      signIn(data.access_token, data.refresh_token);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #006686 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <span className="text-white font-bold text-xl">RoboKids</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Join the<br />RoboKids<br />Community
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Create your parent account to start tracking sessions, communicating with staff, and watching your child grow.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: 'check_circle', text: 'Free to join — no credit card needed' },
            { icon: 'check_circle', text: 'Real-time session updates' },
            { icon: 'check_circle', text: 'Direct line to your child\'s teacher' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="material-symbols-outlined text-white/80 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <span className="text-white/80 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </div>
            <span className="text-primary font-bold text-xl">RoboKids</span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 sm:gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0 ${step >= s ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>{s}</div>
                <span className={`text-xs sm:text-sm font-medium ${step >= s ? 'text-primary' : 'text-on-surface-variant'}`}>{s === 1 ? t('register.step1') : t('register.step2')}</span>
                {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-primary' : 'bg-outline-variant'}`} />}
              </div>
            ))}
          </div>

          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>

          {step === 1 ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-on-surface">{t('register.title')}</h2>
                <p className="text-on-surface-variant mt-2">{t('register.subtitle')}</p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                {[
                  { field: 'name', label: t('register.fullName'), icon: 'person', type: 'text', placeholder: 'John Doe', required: true },
                  { field: 'email', label: t('register.email'), icon: 'mail', type: 'email', placeholder: 'parent@example.com', required: true },
                  { field: 'phone', label: t('register.phone'), icon: 'call', type: 'tel', placeholder: '+66 81 234 5678', required: true },
                ].map(({ field, label, icon, type, placeholder, required }) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-sm font-semibold text-on-surface-variant">{label}</label>
                    <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                      <span className="material-symbols-outlined text-outline text-[20px]">{icon}</span>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={(form as any)[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        required={required}
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3.5 text-on-surface placeholder:text-outline outline-none"
                      />
                    </div>
                  </div>
                ))}

                {/* Line ID (optional) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-2">
                    {t('register.lineId')}
                    <span className="text-[11px] font-normal text-outline">({t('register.optional')})</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                    <span className="material-symbols-outlined text-outline text-[20px]">chat</span>
                    <input
                      type="text"
                      placeholder="@yourname"
                      value={form.line_id}
                      onChange={e => setForm(f => ({ ...f, line_id: e.target.value }))}
                      className="flex-1 bg-transparent border-none focus:ring-0 py-3.5 text-on-surface placeholder:text-outline outline-none"
                    />
                  </div>
                </div>

                {/* Branch picker */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant">{t('register.branch')}</label>
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                    <span className="material-symbols-outlined text-outline text-[20px]">storefront</span>
                    <select
                      value={form.branch_id}
                      onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                      required
                      className="flex-1 bg-transparent border-none focus:ring-0 py-3.5 text-on-surface outline-none cursor-pointer"
                    >
                      <option value="">{t('register.selectBranch')}</option>
                      {branches.map(b => (
                        <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {branches.length === 0 && (
                    <p className="text-xs text-on-surface-variant">{t('register.loadingBranches')}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant">{t('register.password')}</label>
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                    <span className="material-symbols-outlined text-outline text-[20px]">lock</span>
                    <input
                      type="password"
                      placeholder={t('register.minChars')}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required
                      minLength={8}
                      className="flex-1 bg-transparent border-none focus:ring-0 py-3.5 text-on-surface placeholder:text-outline outline-none"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-error bg-error-container/40 px-4 py-3 rounded-xl">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-on-primary font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>{t('register.continue')} <span className="material-symbols-outlined">arrow_forward</span></>
                  }
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-16 h-16 bg-secondary-fixed rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-secondary text-4xl">mark_email_read</span>
                </div>
                <h2 className="text-3xl font-bold text-on-surface">{t('register.checkEmail')}</h2>
                <p className="text-on-surface-variant mt-2">
                  {t('register.otpSent')}{' '}
                  <span className="font-semibold text-primary">{form.email}</span>
                </p>
              </div>

              <form onSubmit={handleStep2} className="space-y-6">
                <div className="flex gap-2 sm:gap-3">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={v}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      className="flex-1 h-16 text-center text-2xl font-bold bg-surface-container-low border-2 border-outline-variant rounded-xl focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  ))}
                </div>

                {error && <p className="text-sm text-error bg-error-container/40 px-4 py-3 rounded-xl">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-primary text-on-primary font-semibold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : t('register.verify')
                  }
                </button>

                <button type="button" onClick={() => setStep(1)}
                  className="w-full py-3 text-primary font-semibold hover:underline text-sm">
                  {t('register.backToEdit')}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-on-surface-variant mt-8 text-sm">
            {t('register.hasAccount')}{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">{t('register.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
