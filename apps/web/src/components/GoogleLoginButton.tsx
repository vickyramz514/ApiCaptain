'use client';

import { GoogleLogin } from '@react-oauth/google';
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

  return (
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
          onError?.('Google sign-in was cancelled or failed');
        }}
        useOneTap={false}
        theme="filled_black"
        size="large"
        text="continue_with"
        shape="rectangular"
        width={320}
      />
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
