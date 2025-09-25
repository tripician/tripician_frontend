import { NavigateFunction } from 'react-router-dom';

// Basic logger – could be replaced with remote logging (Sentry, etc.)
export function logError(context: string, error: unknown, extra?: Record<string, any>) {
  // eslint-disable-next-line no-console
  console.error(`[Error] ${context}:`, error, extra);
}

// Decide which error page to redirect to based on error shape / status
export function mapErrorToRoute(err: any): string {
  if(!err) return '/error';
  const status = err.status || err.code || err.statusCode;
  if(status === 401 || status === 403) return '/error/unauthorized';
  if(status === 404) return '/error/404';
  if(status >= 500) return '/error/500';
  return '/error';
}

export function redirectToError(navigate: NavigateFunction, err: any) {
  const route = mapErrorToRoute(err);
  navigate(route, { replace: true, state: { reason: String(err?.message || err) } });
}

// Wrap async functions with try/catch, logging & optional rethrow
export function safeAsync<TArgs extends any[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, options?: { context?: string; swallow?: boolean; onError?: (err: any) => void; }): (...a: TArgs) => Promise<TReturn | undefined> {
  return async (...a: TArgs) => {
    try { return await fn(...a); }
    catch(err){
      logError(options?.context || fn.name || 'asyncFn', err);
      if(options?.onError) options.onError(err);
      if(!options?.swallow) throw err;
      return undefined;
    }
  };
}

// Higher-order helper for components (non-hook safe usage)
export function withAsyncHandler<T extends any[], R>(fn: (...args:T)=>Promise<R>, context: string){
  return async (...args:T): Promise<R|undefined> => {
    try { return await fn(...args); } catch(err){ logError(context, err); return undefined; }
  };
}
