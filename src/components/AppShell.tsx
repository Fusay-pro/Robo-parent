'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import AnnouncementPopup from './AnnouncementPopup';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [loading, token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-[280px] min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <AnnouncementPopup />
    </div>
  );
}
