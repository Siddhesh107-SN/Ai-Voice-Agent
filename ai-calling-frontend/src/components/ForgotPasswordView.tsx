'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { http } from '@/lib/http';

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await http('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        requiresAuth: false,
      });
      setCodeRequested(true);
      setMessage('If this email is eligible, password-reset instructions have been sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request a reset code.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await http('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          new_password: password,
        }),
        requiresAuth: false,
      });
      setMessage('Password reset successfully. You can now log in.');
      setCodeRequested(false);
      setCode('');
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Use a one-time code sent to your account email."
      botState={error ? 'error' : 'idle'}
      compact
    >
      <form onSubmit={requestCode} className="space-y-4">
        <label className="flex flex-col text-xs font-medium text-[rgba(232,236,255,0.8)]">
          Business email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            className="mt-1 w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] outline-none"
            style={{ background: 'var(--c-auth-field-bg)', border: '1px solid var(--c-auth-line)' }}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--c-orange)' }}
        >
          {busy ? 'Sending…' : 'Send reset code'}
        </button>
      </form>

      {codeRequested && (
        <form onSubmit={resetPassword} className="mt-5 space-y-4">
          <label className="flex flex-col text-xs font-medium text-[rgba(232,236,255,0.8)]">
            6-digit email code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''));
                setError('');
              }}
              className="mt-1 w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] outline-none"
              style={{ background: 'var(--c-auth-field-bg)', border: '1px solid var(--c-auth-line)' }}
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-[rgba(232,236,255,0.8)]">
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              className="mt-1 w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] outline-none"
              style={{ background: 'var(--c-auth-field-bg)', border: '1px solid var(--c-auth-line)' }}
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-[rgba(232,236,255,0.8)]">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError('');
              }}
              className="mt-1 w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] outline-none"
              style={{ background: 'var(--c-auth-field-bg)', border: '1px solid var(--c-auth-line)' }}
            />
          </label>
          <button
            type="submit"
            disabled={busy || code.length !== 6 || !password || !confirmation}
            className="w-full rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--c-orange)' }}
          >
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      )}

      {message && <p role="status" className="mt-4 text-sm text-[var(--c-auth-ink)]">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-[var(--c-auth-error)]">{error}</p>}
      <p className="mt-5 text-center text-xs text-[var(--c-auth-muted)]">
        <Link href="/login" className="font-semibold text-[#FF9A5C] hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
