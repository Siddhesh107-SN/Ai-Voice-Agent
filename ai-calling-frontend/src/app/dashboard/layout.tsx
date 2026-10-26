import type { ReactNode } from 'react';
import '@/features/dashboard/dashboard.css';
import { DashboardProvider } from '@/features/dashboard/store';
import { DashboardShell } from '@/features/dashboard/shell';
import { getCurrentUser } from '@/lib/server/session';

export const metadata = { title: 'Dashboard | TalkAor' };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const simulate =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_DASH_SIMULATE === '1';

  return (
    <DashboardProvider
      initialRole={user.role}
      initialUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.business_id === 'b1' ? 'Sunrise Dental Care' : 'Your Business',
      }}
      simulate={simulate}
    >
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
