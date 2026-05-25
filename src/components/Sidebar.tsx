'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useT } from '@/context/I18nContext';
import client from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { t } = useT();

  const NAV = [
    { href: '/dashboard', icon: 'dashboard',      label: t('nav.dashboard') },
    { href: '/schedule',  icon: 'calendar_month', label: t('nav.schedule') },
    { href: '/requests',  icon: 'inbox',          label: t('nav.requests') },
    { href: '/settings',  icon: 'settings',       label: t('nav.settings') },
  ];

  const { data: profile } = useQuery<any>({
    queryKey: ['my-profile'],
    queryFn: () => client.get('/my/profile').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-surface-container-low hidden md:flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary">RoboKids</h1>
          <p className="text-xs text-on-surface-variant">{t('nav.parentPortal')}</p>
        </div>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-all text-sm font-semibold tracking-wide ${
                active
                  ? 'bg-primary-container text-on-primary-container border-l-4 border-primary rounded-l-none'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 space-y-1">
        {/* Compact branch pill — click to view full details */}
        {profile?.branch_name && (
          <Link
            href="/branch"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
            <span className="text-sm font-bold text-on-surface truncate flex-1">{profile.branch_name}</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[14px] shrink-0">chevron_right</span>
          </Link>
        )}

        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all text-sm font-semibold tracking-wide"
        >
          <span className="material-symbols-outlined">logout</span>
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
