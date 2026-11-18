'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/context/I18nContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function Home() {
  const { token, loading } = useAuth();
  const { t } = useT();

  // Signed-in parents go straight into the portal; everyone else signs in first.
  const portalHref = token ? '/dashboard' : '/login';

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #006686 100%)' }}
    >
      {/* Decorative layers — same treatment as the login panel */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
          </div>
          <span className="text-white font-bold text-xl">RoboKids</span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            href={portalHref}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-[#006686] shadow-md transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            {t('home.toPortal')}
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center px-6 pb-16 sm:px-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            {t('home.headline1')}
            <br />
            {t('home.headline2')}
            <br />
            {t('home.headline3')}
          </h1>

          <p className="text-white/70 text-lg leading-relaxed max-w-xl mb-10">
            {t('home.tagline')}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link
              href={portalHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#006686] shadow-lg transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              {t('home.toPortal')}
              <span className="material-symbols-outlined text-[22px]">arrow_forward</span>
            </Link>

            {!loading && !token && (
              <p className="text-white/70 text-sm">
                {t('home.newHere')}{' '}
                <Link href="/register" className="font-bold text-white hover:underline">
                  {t('home.createAccount')}
                </Link>
              </p>
            )}

            {!loading && token && (
              <p className="inline-flex items-center gap-2 text-white/70 text-sm">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {t('home.signedInAs')}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
