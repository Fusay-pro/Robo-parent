'use client';

import AppShell from '@/components/AppShell';
import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';

export default function BranchPage() {
  const { t } = useT();
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['my-profile'],
    queryFn: () => client.get('/my/profile').then(r => r.data),
  });

  const mapsHref = profile?.branch_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.branch_address)}`
    : null;
  const mapEmbed = profile?.branch_address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(profile.branch_address)}&output=embed`
    : null;

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-10 md:py-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="h-72 bg-surface-container-low animate-pulse rounded-3xl" />
        ) : !profile?.branch_name ? (
          <div className="bg-surface-container-low rounded-3xl py-16 px-6 text-center text-on-surface-variant">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-container flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px] text-outline">storefront</span>
            </div>
            <p className="font-semibold text-on-surface">{t('branch.noBranch')}</p>
            <p className="text-xs mt-1">{t('branch.noBranchHint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left column: hero + details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Hero */}
              <div className="relative rounded-3xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #006686 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative px-6 py-7 text-white">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-white text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">{t('nav.branch')}</p>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight">{profile.branch_name}</h3>
                </div>
              </div>

              {/* Detail rows */}
              <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/20">
                {profile.branch_address && (
                  <div className="flex items-start gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('branch.address')}</p>
                      <p className="font-semibold text-on-surface mt-0.5 break-words">{profile.branch_address}</p>
                      {mapsHref && (
                        <a href={mapsHref} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-2">
                          <span className="material-symbols-outlined text-[14px]">directions</span>
                          {t('branch.openMaps')}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {profile.branch_phone && (
                  <div className="flex items-start gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('branch.phone')}</p>
                      <a href={`tel:${profile.branch_phone}`}
                        className="font-semibold text-primary hover:underline mt-0.5 inline-block">
                        {profile.branch_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: embedded map */}
            <div className="lg:col-span-3">
              {mapEmbed ? (
                <div className="rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 bg-surface-container-low h-full min-h-[280px] md:min-h-[400px]">
                  <iframe
                    src={mapEmbed}
                    width="100%" height="100%"
                    style={{ border: 0, minHeight: '400px' }}
                    loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    title={`Map: ${profile.branch_name}`} />
                </div>
              ) : (
                <div className="rounded-3xl bg-surface-container-low border border-outline-variant/30 h-full min-h-[280px] md:min-h-[400px] flex flex-col items-center justify-center text-center text-on-surface-variant p-8">
                  <div className="w-16 h-16 rounded-3xl bg-surface-container flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[32px] text-outline">map</span>
                  </div>
                  <p className="font-semibold text-on-surface">{t('branch.noAddress')}</p>
                  <p className="text-xs mt-1">{t('branch.mapWillAppear')}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
