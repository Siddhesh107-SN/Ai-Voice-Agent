import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Determine user role and status from cookies / query in dev
  const roleCookie = request.cookies.get('tk_role')?.value;
  const userCookie = request.cookies.get('tk_session_user')?.value;

  const isDev = process.env.NODE_ENV !== 'production';
  const devSimulate = isDev && process.env.NEXT_PUBLIC_DASH_SIMULATE === '1';

  // In simulate mode strictly during development, URL query ?role=... or cookie can switch role
  const urlRole = isDev ? request.nextUrl.searchParams.get('role') : null;
  let currentRole = urlRole || roleCookie;

  if (!currentRole && devSimulate) {
    // If opening platform directly in simulate mode, allow super_admin
    if (pathname.startsWith('/dashboard/platform')) {
      currentRole = 'super_admin';
    } else {
      currentRole = 'admin';
    }
  }

  // If unauthenticated and not in dev simulation mode, redirect to login
  if (!userCookie && !devSimulate) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user status is suspended or pending approval
  if (userCookie === 'u_pending' || userCookie === 'pending') {
    return NextResponse.redirect(new URL('/onboarding-status', request.url));
  }
  if (userCookie === 'u_suspended' || userCookie === 'suspended') {
    return NextResponse.redirect(new URL('/login?error=account_suspended', request.url));
  }

  // Super Admin: sees ONLY the platform pages.
  // If Super Admin navigates to /dashboard or tenant subpages, send them to /dashboard/platform
  if (currentRole === 'super_admin') {
    if (!pathname.startsWith('/dashboard/platform')) {
      return NextResponse.redirect(new URL('/dashboard/platform', request.url));
    }
    return NextResponse.next();
  }

  // Staff and Admin: CANNOT open /dashboard/platform/*
  if (pathname.startsWith('/dashboard/platform')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
