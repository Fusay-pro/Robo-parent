'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/context/I18nContext';
import NotificationBell from './NotificationBell';
import LanguageToggle from './LanguageToggle';

export default function TopBar() {
  const router = useRouter();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-5 md:px-8 py-4 border-b border-outline-variant/40 bg-surface/90 backdrop-blur-xl">
      {/* Logo (mobile only - desktop shows sidebar) */}
      <span className="md:hidden text-primary font-bold text-base tracking-tight shrink-0">RoboKids</span>

      {/* Greeting / spacer */}
      <div className="flex-1 hidden md:flex items-center gap-2 text-on-surface-variant text-sm">
        <span className="material-symbols-outlined text-[18px]">waving_hand</span>
        <span>{t('nav.welcomeBack')}</span>
      </div>
      <div className="flex-1 md:hidden" />

      {/* Language toggle */}
      <LanguageToggle />

      {/* Bell with dropdown */}
      <NotificationBell />

      {/* Profile */}
      <button onClick={() => router.push('/settings')}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant text-[22px]">account_circle</span>
      </button>
    </header>
  );
}

