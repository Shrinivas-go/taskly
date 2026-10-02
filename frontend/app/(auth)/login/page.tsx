'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { getApiBaseUrl } from '../../../lib/api-client';
import { ThemeToggle } from '../../../components/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthNotice, setOauthNotice] = useState(false);

  const { login, isAuthenticated, isLoading, error: authError, clearError } = useAuth();
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      // Error handled by AuthContext state
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'oauth_not_configured') {
        setLocalError(
          'Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_SECRET in your backend environment variables.',
        );
      } else if (err === 'oauth_failed') {
        setLocalError('Google authentication was cancelled or failed. Please try again.');
      }
    }
  }, []);

  const handleGoogleClick = () => {
    const apiUrl = getApiBaseUrl();
    window.location.href = `${apiUrl}/auth/google`;
  };

  const displayError = localError || authError;

  return (
    <div className="relative min-h-screen bg-[#f8f9fb] text-[#1b1d22] transition-colors dark:bg-[#17191d] dark:text-[#f2f3f5]">
      {/* Top right floating theme toggle matching v0 */}
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <main className="flex min-h-screen items-center justify-center px-5 py-20 sm:px-8">
        <section className="w-full max-w-[420px]">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#6957d9] text-white shadow-[0_5px_16px_rgba(105,87,217,.25)]">
              <Check size={23} strokeWidth={2.8} />
            </div>
            <h1 className="text-[25px] font-semibold tracking-[-.03em]">Welcome back</h1>
            <p className="mt-2 text-[14px] text-[#747985] dark:text-[#9da2ad]">
              Sign in to continue to Taskly.
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-black/[.08] bg-white p-7 shadow-[0_12px_40px_rgba(23,28,45,.06)] dark:border-white/10 dark:bg-[#202328] dark:shadow-none sm:p-8">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dfe1e6] bg-white text-[14px] font-medium text-[#31343a] transition hover:bg-[#f7f7f8] dark:border-white/10 dark:bg-[#292c32] dark:text-[#f1f2f4] dark:hover:bg-[#30343b]"
            >
              <span className="text-[15px] font-bold" aria-hidden="true">
                G
              </span>
              Continue with Google
            </button>

            {oauthNotice && (
              <p
                role="status"
                className="mt-2 text-center text-[12px] text-[#6957d9] transition"
              >
                Google OAuth provider integration is configured in backend architecture and will be linked to your email.
              </p>
            )}

            {/* Divider */}
            <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[.12em] text-[#a1a5ae]">
              <span className="h-px flex-1 bg-[#e8e9ec] dark:bg-white/10" />
              or
              <span className="h-px flex-1 bg-[#e8e9ec] dark:bg-white/10" />
            </div>

            {/* Error Banner */}
            {displayError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="leading-snug">{displayError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <label htmlFor="login-email" className="block">
                <span className="mb-1.5 block text-[13px] font-medium">Email</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-[#dfe1e6] bg-white px-3.5 text-[14px] outline-none transition placeholder:text-[#a4a8b1] focus:border-[#6957d9] focus:ring-2 focus:ring-[#6957d9]/15 disabled:opacity-50 dark:border-white/10 dark:bg-[#292c32] dark:placeholder:text-[#777d88]"
                />
              </label>

              <label htmlFor="login-password" className="block">
                <span className="mb-1.5 block text-[13px] font-medium">Password</span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-[#dfe1e6] bg-white px-3.5 text-[14px] outline-none transition placeholder:text-[#a4a8b1] focus:border-[#6957d9] focus:ring-2 focus:ring-[#6957d9]/15 disabled:opacity-50 dark:border-white/10 dark:bg-[#292c32] dark:placeholder:text-[#777d88]"
                />
              </label>

              <button
                id="login-submit"
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#6957d9] text-[14px] font-medium text-white shadow-[0_4px_10px_rgba(105,87,217,.2)] transition hover:bg-[#5d4bcf] disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Log in</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Switch Mode Link */}
          <p className="mt-6 text-center text-[13px] text-[#777c87] dark:text-[#9da2ad]">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-[#6957d9] hover:underline"
            >
              Create one
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
