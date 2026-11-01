import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SERVER_SESSION_COOKIE,
  verifyServerSession,
} from '@/lib/server/session-cookie';
import type { ServerSession } from '@/lib/server/session-cookie';

export type ServerUser = Omit<ServerSession, 'expiresAt' | 'accessStatus'> & {
  name: string;
  email: string;
  role: ServerSession['role'];
  business_id?: string;
};

export async function getCurrentUser(): Promise<ServerUser> {
  const session = await verifyServerSession(cookies().get(SERVER_SESSION_COOKIE)?.value);
  if (!session) {
    const mockMode =
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_API_MODE === 'mock';
    if (!mockMode) redirect('/login');

    const roleCookie = cookies().get('tk_role')?.value;
    const role = roleCookie === 'super_admin'
      ? 'super_admin'
      : roleCookie === 'staff'
        ? 'staff'
        : 'admin';
    return {
      id: role === 'super_admin' ? 'super_admin' : role === 'staff' ? 'staff_user' : 'admin_user',
      name: role === 'super_admin' ? 'Platform Super Admin' : role === 'staff' ? 'Staff Member' : 'Admin User',
      email: '',
      role,
      business_id: 'client_active',
    };
  }

  return {
    id: session.id,
    name: session.role === 'super_admin'
      ? 'Platform Super Admin'
      : session.role === 'staff'
        ? 'Staff Member'
        : 'Admin User',
    email: '',
    role: session.role,
  };
}
