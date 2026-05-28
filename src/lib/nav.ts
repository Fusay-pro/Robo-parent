export interface NavItemDef {
  href: '/dashboard' | '/schedule' | '/requests' | '/settings';
  icon: string;
  labelKey: 'nav.dashboard' | 'nav.schedule' | 'nav.requests' | 'nav.settings';
}

export const NAV_ITEMS: NavItemDef[] = [
  { href: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
  { href: '/schedule', icon: 'calendar_month', labelKey: 'nav.schedule' },
  { href: '/requests', icon: 'inbox', labelKey: 'nav.requests' },
  { href: '/settings', icon: 'settings', labelKey: 'nav.settings' },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
