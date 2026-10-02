'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      if (error === 'oauth_not_configured') {
        setErrorMessage('Google OAuth is not configured on the backend yet.');
      } else {
        setErrorMessage('Authentication with Google was cancelled or failed.');
      }
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    if (token) {
      try {
        apiClient.setToken(token);
        setStatus('success');
        // Small delay to allow localStorage sync then navigate to dashboard
        setTimeout(() => {
          // Hard navigation ensures AuthProvider re-mounts and loads user session
          window.location.href = '/';
        }, 600);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage('Failed to store authentication session.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } else {
      setStatus('error');
      setErrorMessage('No authentication token received.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fb] px-4 text-[#1b1d22] dark:bg-[#17191d] dark:text-[#f2f3f5]">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-[#202328]">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#6957d9]" />
            <h2 className="text-lg font-semibold">Authenticating with Google...</h2>
            <p className="text-sm text-[#747985] dark:text-[#9da2ad]">
              Please wait while we verify your account.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <h2 className="text-lg font-semibold">Login Successful!</h2>
            <p className="text-sm text-[#747985] dark:text-[#9da2ad]">
              Redirecting you to Taskly...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold">Authentication Failed</h2>
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            <p className="text-xs text-[#747985] dark:text-[#9da2ad]">
              Redirecting back to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] dark:bg-[#17191d]">
          <Loader2 className="h-8 w-8 animate-spin text-[#6957d9]" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
