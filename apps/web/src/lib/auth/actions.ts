'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { login, logout, register } from '../api/auth';
import { ApiError } from '../api/client';
import {
  clearSessionCookies,
  REFRESH_COOKIE,
  safeNextPath,
  writeSessionCookies,
} from './tokens';

export interface AuthFormState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear the field. */
  email?: string;
}

/** Mirrors the API's registration policy for an early, friendlier message. */
const PASSWORD_MIN_LENGTH = 8;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    next: safeNextPath(formData.get('next')),
  };
}

function describeFailure(error: unknown, mode: 'sign-in' | 'sign-up'): string {
  if (!(error instanceof ApiError) || error.unreachable) {
    return "We couldn't reach NEXUS. Check your connection and try again.";
  }
  if (mode === 'sign-in' && error.status === 401) {
    return 'That email and password combination is incorrect.';
  }
  if (mode === 'sign-up' && error.status === 409) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (error.status === 400)
    return 'Check your email and password and try again.';
  return 'Something went wrong on our side. Please try again.';
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) {
    return { error: 'Enter your email and password.', email };
  }

  try {
    writeSessionCookies(await cookies(), await login({ email, password }));
  } catch (error) {
    return { error: describeFailure(error, 'sign-in'), email };
  }
  redirect(next);
}

export async function signUp(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email) return { error: 'Enter your email address.', email };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: `Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`,
      email,
    };
  }

  try {
    writeSessionCookies(await cookies(), await register({ email, password }));
  } catch (error) {
    return { error: describeFailure(error, 'sign-up'), email };
  }
  redirect('/');
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Best effort: the local session ends even if the API is unreachable.
    await logout(refreshToken).catch(() => undefined);
  }
  clearSessionCookies(store);
  redirect('/sign-in');
}
