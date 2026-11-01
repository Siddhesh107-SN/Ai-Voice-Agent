import { NextRequest, NextResponse } from 'next/server';
import {
  SERVER_SESSION_COOKIE,
  signServerSession,
} from '@/lib/server/session-cookie';
import type { VerifiedRole } from '@/lib/server/session-cookie';

const roleMap: Record<string, VerifiedRole> = {
  super_admin: 'super_admin',
  client_admin: 'admin',
  client_staff: 'staff',
};
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // Matches the backend's default refresh-token lifetime.

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function sessionError(detail: string, code: string, status: number) {
  return NextResponse.json({ detail, code }, { status });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const accessToken =
    body && typeof body === 'object' && 'access_token' in body
      ? body.access_token
      : null;
  if (typeof accessToken !== 'string' || !accessToken) {
    return sessionError('A valid access token is required', 'SESSION_TOKEN_REQUIRED', 401);
  }

  const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    return sessionError('Backend URL is not configured', 'BACKEND_URL_MISSING', 503);
  }

  let response: Response;
  try {
    response = await fetch(new URL('/api/v1/auth/me', backendUrl), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 502);
  }
  if (!response.ok) {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 401);
  }

  const result: unknown = await response.json().catch(() => null);
  const user =
    result && typeof result === 'object' && 'data' in result
      ? result.data
      : null;
  if (!user || typeof user !== 'object') {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 502);
  }

  const userData = user as {
    id?: number | string;
    role?: string;
    access_status?: string | null;
  };
  const role = userData.role ? roleMap[userData.role] : undefined;
  if (!role || userData.id === undefined) {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 502);
  }

  const tokenPayload = accessToken.split('.')[1];
  if (!tokenPayload) {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 401);
  }
  let expiresAt: number;
  try {
    const claims = JSON.parse(Buffer.from(tokenPayload, 'base64url').toString('utf8'));
    expiresAt = claims.exp;
  } catch {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 401);
  }
  if (typeof expiresAt !== 'number' || expiresAt <= Date.now() / 1000) {
    return sessionError('Unable to verify the user session', 'SESSION_VERIFICATION_FAILED', 401);
  }
  const maxAge = SESSION_MAX_AGE_SECONDS;
  const sessionExpiresAt = Math.floor(Date.now() / 1000) + maxAge;

  let session: string;
  try {
    session = await signServerSession({
      id: String(userData.id),
      role,
      accessStatus: userData.access_status ?? null,
      expiresAt: sessionExpiresAt,
    });
  } catch {
    return sessionError('Server session signing is not configured', 'SESSION_SIGNING_UNAVAILABLE', 503);
  }

  const resultResponse = NextResponse.json({ role, access_status: userData.access_status ?? null });
  resultResponse.cookies.set(
    SERVER_SESSION_COOKIE,
    session,
    sessionCookieOptions(maxAge),
  );
  return resultResponse;
}

export function DELETE() {
  const response = NextResponse.json({ status: 'cleared' });
  response.cookies.set(SERVER_SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
