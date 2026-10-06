import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { safeNextPath } from '@/lib/auth/tokens';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  return <AuthForm mode="sign-in" next={target === '/' ? undefined : target} />;
}
