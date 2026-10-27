/**
 * Global authentication error handler and token cleanup utility.
 * Intercepts stale or corrupted Supabase session refresh tokens (e.g., "Invalid Refresh Token: Refresh Token Not Found")
 * to prevent uncaught runtime rejections, unhandled console errors, and app disruption.
 */

export function isRefreshTokenError(err: any): boolean {
  if (!err) return false;
  const str = (
    typeof err === 'string'
      ? err
      : `${err.message || ''} ${err.error_description || ''} ${err.msg || ''} ${err.name || ''} ${err.code || ''} ${err.status || ''}`
  ).toLowerCase();

  return (
    str.includes('refresh token') ||
    str.includes('refresh_token') ||
    str.includes('invalid refresh') ||
    str.includes('token not found') ||
    str.includes('invalid_grant')
  );
}

export function purgeInvalidAuthTokens(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('sb-') ||
          key.includes('-auth-token') ||
          key.includes('supabase.auth.token'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });
  } catch (_) {}

  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.startsWith('sb-') ||
          key.includes('-auth-token') ||
          key.includes('supabase.auth.token'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch (_) {}
    });
  } catch (_) {}
}

// Initial hygiene check on storage tokens
function sanitizeStoredTokens(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
        keysToCheck.push(key);
      }
    }

    keysToCheck.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        // If parsed is empty or not an object with access_token / refresh_token
        if (!parsed || typeof parsed !== 'object') {
          localStorage.removeItem(k);
        }
      } catch (_) {
        // Corrupted JSON
        localStorage.removeItem(k);
      }
    });
  } catch (_) {}
}

// Global console.error interception to suppress Supabase gotrue internal error logs
function setupConsoleInterceptor(): void {
  if (typeof window === 'undefined' || typeof console === 'undefined') return;
  
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const isTokenErr = args.some((arg) => isRefreshTokenError(arg));
    if (isTokenErr) {
      console.warn('[Auth Recovery] Stale/invalid refresh token detected and cleaned up gracefully.');
      purgeInvalidAuthTokens();
      return;
    }
    originalError.apply(console, args);
  };
}

// Global window event listeners
function setupWindowListeners(): void {
  if (typeof window === 'undefined') return;

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isRefreshTokenError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      console.warn('[Auth Recovery] Suppressed unhandled refresh token rejection.');
      purgeInvalidAuthTokens();
    }
  };

  const handleError = (event: ErrorEvent) => {
    if (isRefreshTokenError(event.error) || isRefreshTokenError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      console.warn('[Auth Recovery] Suppressed unhandled refresh token error.');
      purgeInvalidAuthTokens();
    }
  };

  window.addEventListener('unhandledrejection', handleRejection);
  window.addEventListener('error', handleError);
}

// Execute immediately when imported
sanitizeStoredTokens();
setupConsoleInterceptor();
setupWindowListeners();
