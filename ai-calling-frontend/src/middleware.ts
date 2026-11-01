import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SERVER_SESSION_COOKIE, verifyServerSession } from '@/lib/server/session-cookie';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const mockMode =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_API_MODE === 'mock';
  const session = await verifyServerSession(
    request.cookies.get(SERVER_SESSION_COOKIE)?.value,
  );
  const currentRole = session?.role;
  const userStatus = session?.accessStatus;

  if (!session && !mockMode) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (userStatus && userStatus !== 'active') {
    if (userStatus === 'suspended') {
      return NextResponse.redirect(new URL('/login?error=account_suspended', request.url));
    }
    return NextResponse.redirect(new URL('/onboarding-status', request.url));
  }

  if (currentRole === 'super_admin' || (!session && mockMode && request.cookies.get('tk_role')?.value === 'super_admin')) {
    if (!pathname.startsWith('/dashboard/platform')) {
      return NextResponse.redirect(new URL('/dashboard/platform', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard/platform')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
