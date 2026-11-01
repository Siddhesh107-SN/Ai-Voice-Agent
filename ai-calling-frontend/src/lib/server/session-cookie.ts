export type VerifiedRole = 'super_admin' | 'admin' | 'staff';

export interface ServerSession {
  id: string;
  role: VerifiedRole;
  accessStatus: string | null;
  expiresAt: number;
}

const COOKIE_NAME = 'tk_server_session';
const encoder = new TextEncoder();

function sessionSecret(): string {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret || encoder.encode(secret).length < 32) {
    throw new Error('SESSION_COOKIE_SECRET must contain at least 32 bytes');
  }
  return secret;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(encoder.encode(sessionSecret())),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: string): Promise<Uint8Array> {
  const key = await hmacKey();
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new Uint8Array(encoder.encode(payload))),
  );
}

async function verify(payload: string, supplied: Uint8Array): Promise<boolean> {
  const key = await hmacKey();
  return crypto.subtle.verify(
    'HMAC',
    key,
    new Uint8Array(supplied),
    new Uint8Array(encoder.encode(payload)),
  );
}

export async function signServerSession(session: ServerSession): Promise<string> {
  const payload = encodeBase64Url(encoder.encode(JSON.stringify(session)));
  const signed = await sign(payload);
  return `${payload}.${encodeBase64Url(signed)}`;
}

export async function verifyServerSession(value: string | undefined): Promise<ServerSession | null> {
  if (!value) return null;

  const [payload, encodedSignature, ...extra] = value.split('.');
  if (!payload || !encodedSignature || extra.length > 0) return null;

  try {
    const supplied = decodeBase64Url(encodedSignature);
    if (!await verify(payload, supplied)) {
      return null;
    }

    const session = JSON.parse(
      new TextDecoder().decode(new Uint8Array(decodeBase64Url(payload))),
    ) as ServerSession;
    if (
      typeof session.id !== 'string' ||
      !['super_admin', 'admin', 'staff'].includes(session.role) ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as SERVER_SESSION_COOKIE };
