'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { ApiClientError } from '../lib/apiClient';

interface GoogleLoginButtonProps {
  onCredential: (credential: string) => Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
}

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleLoginButton({
  onCredential,
  onError,
  disabled = false,
}: GoogleLoginButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [originHint, setOriginHint] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    if (/^https?:\/\/(\d{1,3}\.){3}\d{1,3}(?::\d+)?$/.test(origin)) {
      setOriginHint(`Google Sign-In is not allowed from ${origin}. Use http://localhost:3000.`);
    }
  }, []);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-500"
      >
        Google (configure NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </button>
    );
  }

  if (!mounted) {
    return <div className="h-10" />;
  }

  return (
    <div className="space-y-2">
      {originHint ? <p className="text-center text-xs text-amber-400">{originHint}</p> : null}
      <div className={`flex justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            const credential = credentialResponse.credential;
            if (!credential) {
              onError?.('No credential received from Google');
              return;
            }
            void onCredential(credential).catch((error: unknown) => {
              onError?.(
                error instanceof ApiClientError ? error.message : 'Google sign-in failed',
              );
            });
          }}
          onError={() => {
            onError?.(
              originHint ??
                'Google sign-in was cancelled or this origin is not authorized for the client ID.',
            );
          }}
          useOneTap={false}
          theme="filled_black"
          size="large"
          text="continue_with"
          shape="rectangular"
          width={320}
        />
      </div>
    </div>
  );
}

export function GoogleAuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-800" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-[var(--background)] px-3 text-slate-500">or continue with</span>
      </div>
    </div>
  );
}
