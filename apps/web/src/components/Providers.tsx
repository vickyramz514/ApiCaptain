'use client';

import { AuthProvider } from './AuthProvider';
import { GoogleOAuthProviderWrapper } from './GoogleOAuthProvider';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProviderWrapper>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProviderWrapper>
  );
}
