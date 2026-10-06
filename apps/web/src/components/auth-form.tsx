'use client';

import { Alert, Button, Card, Spinner, TextField } from '@nexus/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { AlertIcon } from '@/components/icons';
import { signIn, signUp, type AuthFormState } from '@/lib/auth/actions';

const COPY = {
  'sign-in': {
    title: 'Sign in',
    description: 'Welcome back. Pick up where you left off.',
    submit: 'Sign in',
    pending: 'Signing in…',
    passwordAutoComplete: 'current-password',
    switchPrompt: 'New to NEXUS?',
    switchLabel: 'Create an account',
    switchHref: '/sign-up',
  },
  'sign-up': {
    title: 'Create your account',
    description:
      'One private workspace for your projects, tasks and knowledge.',
    submit: 'Create account',
    pending: 'Creating account…',
    passwordAutoComplete: 'new-password',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/sign-in',
  },
} as const;

export function AuthForm({
  mode,
  next,
}: {
  mode: 'sign-in' | 'sign-up';
  /** Where to go after signing in (validated again on the server). */
  next?: string;
}) {
  const copy = COPY[mode];
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    mode === 'sign-in' ? signIn : signUp,
    {},
  );

  return (
    <>
      <Card className="p-6 sm:p-7">
        <h1 className="text-lg font-semibold text-fg">{copy.title}</h1>
        <p className="mt-1 text-[13px] text-fg-muted">{copy.description}</p>

        <form action={action} className="mt-6 grid gap-4" noValidate>
          {next && <input type="hidden" name="next" value={next} />}
          {state.error && <Alert icon={<AlertIcon />}>{state.error}</Alert>}
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            required
            defaultValue={state.email}
            // Remount on each result so `defaultValue` reflects the echo.
            key={state.email ?? ''}
          />
          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete={copy.passwordAutoComplete}
            required
            hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
          />
          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending && <Spinner />}
            {pending ? copy.pending : copy.submit}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-[13px] text-fg-muted">
        {copy.switchPrompt}{' '}
        <Link
          href={copy.switchHref}
          className="font-medium text-accent-text underline-offset-4 hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </>
  );
}
