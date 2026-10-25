import { cookies } from 'next/headers';
import type { Role } from '@/features/dashboard/types';

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  business_id?: string;
}

export async function getCurrentUser(): Promise<ServerUser> {
  const cookieStore = cookies();
  const roleCookie = cookieStore.get('tk_role')?.value;
  const role: Role =
    roleCookie === 'super_admin' ? 'super_admin' : roleCookie === 'staff' ? 'staff' : 'admin';

  return {
    id: role === 'super_admin' ? 'super_admin' : role === 'staff' ? 'staff_user' : 'admin_user',
    name: role === 'super_admin' ? 'Platform Super Admin' : role === 'staff' ? 'Staff Member' : 'Admin User',
    email: role === 'super_admin' ? 'admin@talkaor.com' : 'user@talkaor.com',
    role,
    business_id: 'client_active',
  };
}
