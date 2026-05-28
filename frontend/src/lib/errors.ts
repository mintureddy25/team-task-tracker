import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import type { ApiError } from './types';

export function extractErrorMessage(err: FetchBaseQueryError | SerializedError | undefined): string {
  if (!err) return 'Unknown error';
  if ('status' in err && typeof err.data === 'object' && err.data) {
    const e = err.data as Partial<ApiError>;
    return e.message ?? `HTTP ${err.status}`;
  }
  if ('message' in err) return err.message ?? 'Unknown error';
  return 'Unknown error';
}
