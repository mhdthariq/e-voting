'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        setStatus('error');
        setMessage('Email verification is not configured. Using manual verification instead.');
        return;
      }

      try {
        // Get the token from URL hash (Supabase magic link format)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Also check URL params (alternative format)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (accessToken && refreshToken) {
          // Supabase magic link verification
          const { data: { user }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          // Activate user in our database
          const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.user_metadata?.userId,
              email: user?.email,
              type: type || 'signup',
            }),
          });

          if (response.ok) {
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to login...');
            setTimeout(() => router.push('/auth/login'), 3000);
          } else {
            throw new Error('Failed to verify email in database');
          }
        } else if (token) {
          // Manual token verification (fallback)
          const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (response.ok) {
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to login...');
            setTimeout(() => router.push('/auth/login'), 3000);
          } else {
            throw new Error(data.message || 'Verification failed');
          }
        } else {
          throw new Error('No verification token found in URL');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Email verification failed');
      }
    };

    verifyEmail();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Verifying your email...</h2>
            <p className="mt-2 text-sm text-gray-600">Please wait while we verify your account</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Email Verified!</h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-700">
                <p className="font-medium">Your account is now active!</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-left">
                  <li>You can now log in to your account</li>
                  <li>Access all features of BlockVote</li>
                  <li>Participate in elections</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Verification Failed</h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Register Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
