import { redirect } from 'next/navigation';

export default function HomePage() {
  // If next.config.mjs rewrites are active, / renders /landing.html directly.
  // As a fallback for client-side router navigation, redirect to /landing.html.
  redirect('/landing.html');
}
