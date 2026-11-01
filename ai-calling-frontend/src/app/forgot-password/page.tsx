import type { Metadata } from 'next';
import ForgotPasswordView from '@/components/ForgotPasswordView';

export const metadata: Metadata = {
  title: 'Reset password | talkaor',
  description: 'Request a one-time email code to reset your TalkAor password.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
