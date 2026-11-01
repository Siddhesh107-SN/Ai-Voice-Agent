import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // The role cookie is set from the authenticated user response.
  const roleCookie = request.cookies.get('tk_role')?.value;
  const userCookie = request.cookies.get('tk_session_user')?.value;
  const mockMode =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_API_MODE === 'mock';
  const currentRole = roleCookie;

  // Mock previews do not require a live login; production always requires the session cookie.
  if (!userCookie && !mockMode) {
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
