'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import client from '@/lib/api';
import { useT } from '@/context/I18nContext';
import { readLocalStorageJson, writeLocalStorageJson } from '@/lib/storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const STORAGE_KEY = 'seen_announcements_v1';

function resolveImg(u: string) {
  if (!u) return '';
  return u.startsWith('http') ? u : `${API_URL}${u}`;
}

function getSeen(): Set<number> {
  return new Set(readLocalStorageJson<number[]>(STORAGE_KEY, []));
}
function markSeen(id: number) {
  if (typeof window === 'undefined') return;
  const seen = getSeen();
  seen.add(id);
  writeLocalStorageJson(STORAGE_KEY, [...seen].slice(-50)); // keep last 50
}

interface Announcement {
  announcement_id: number;
  title:           string;
  body?:           string;
  image_url?:      string;
  created_at:      string;
}

export default function AnnouncementPopup() {
  const { t, locale } = useT();

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['parent-announcements'],
    queryFn: () => client.get('/my/announcements').then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const [nowMs] = useState(() => Date.now());
  // Find the most recent unseen announcement (created within the last 14 days)
  const unseen = useMemo(() => {
    const seen = getSeen();
    const cutoff = nowMs - 14 * 24 * 60 * 60 * 1000;
    return announcements.find(a =>
      !seen.has(a.announcement_id) && new Date(a.created_at).getTime() >= cutoff
    );
  }, [announcements, nowMs]);

  useEffect(() => {
    if (!unseen) return;
    client.post('/my/notifications/seen', {
      type: 'announcement',
      ref_id: unseen.announcement_id,
    }).catch(() => { /* ignore */ });
  }, [unseen]);

  function close() {
    if (unseen) markSeen(unseen.announcement_id);
  }

  if (!unseen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-surface rounded-3xl shadow-2xl z-10 w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Optional image */}
        {unseen.image_url && (
          <div className="relative w-full h-48 bg-surface-container-low">
            <Image
              src={resolveImg(unseen.image_url)}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{t('announce.title')}</p>
            <h3 className="text-lg font-bold text-on-surface mt-0.5 leading-tight">{unseen.title}</h3>
            <p className="text-[11px] text-on-surface-variant mt-1">
              {new Date(unseen.created_at).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={close}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        {unseen.body && (
          <div className="px-6 pb-5 overflow-y-auto">
            <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{unseen.body}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low/50">
          <button onClick={close}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
            {t('announce.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}
