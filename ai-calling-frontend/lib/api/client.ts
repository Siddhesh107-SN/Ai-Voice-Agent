import { MockStorage } from '@/lib/mock/storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

export function isMockMode(): boolean {
  return FORCE_MOCK;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retryOnExpire?: boolean;
}

export class ApiError extends Error {
  success: boolean;
  message: string;
  errorCode: string;
  status: number;

  constructor(message: string, errorCode: string = 'UNKNOWN_ERROR', status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.status = status;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let refreshFailureSubscribers: ((err: any) => void)[] = [];

function subscribeTokenRefresh(onSuccess: (token: string) => void, onFailure: (err: any) => void) {
  refreshSubscribers.push(onSuccess);
  refreshFailureSubscribers.push(onFailure);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
  refreshFailureSubscribers = [];
}

function onRefreshFailed(err: any) {
  refreshFailureSubscribers.forEach((cb) => cb(err));
  refreshSubscribers = [];
  refreshFailureSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, retryOnExpire = true, signal: userSignal, ...fetchOptions } = options;

  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = MockStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Timeout controller to prevent connection & resource leaks
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const signal = userSignal || controller.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr?.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Please check server responsiveness.',
        'TIMEOUT_ERROR',
        408
      );
    }
    throw new ApiError(
      'Unable to connect to the backend server. Please verify backend is running on http://localhost:8000.',
      'NETWORK_ERROR',
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle Token Expiry & Automatic Refresh
  if (response.status === 401 && retryOnExpire) {
    let errorData: any = {};
    try {
      errorData = await response.clone().json();
    } catch {}

    const isExpired =
      errorData?.error_code === 'TOKEN_EXPIRED' ||
      errorData?.detail === 'TOKEN_EXPIRED' ||
      errorData?.message?.includes('expired');

    if (isExpired) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = MockStorage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshUrl = baseUrl ? `${baseUrl}/api/v1/auth/refresh` : '/api/v1/auth/refresh';
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!refreshRes.ok) {
            MockStorage.setAccessToken(null);
            MockStorage.setRefreshToken(null);
            MockStorage.setCurrentUser(null);
            MockStorage.setAdminUnlocked(false);
            if (typeof window !== 'undefined') {
              window.location.href = '/login?expired=1';
            }
            const err = new ApiError('Session expired. Please log in again.', 'TOKEN_EXPIRED', 401);
            onRefreshFailed(err);
            throw err;
          }

          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.access_token || refreshData.data?.access_token;
          if (newAccessToken) {
            MockStorage.setAccessToken(newAccessToken);
          }
          isRefreshing = false;
          onRefreshed(newAccessToken);

          // Retry initial request
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          return apiClient<T>(endpoint, { ...options, retryOnExpire: false });
        } catch (err) {
          isRefreshing = false;
          onRefreshFailed(err);
          throw err;
        }
      } else {
        // Wait for current refresh to complete
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(
            (newToken: string) => {
              headers.set('Authorization', `Bearer ${newToken}`);
              apiClient<T>(endpoint, { ...options, retryOnExpire: false })
                .then(resolve)
                .catch(reject);
            },
            (err: any) => reject(err)
          );
        });
      }
    }
  }

  let responseBody: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      responseBody?.message ||
      responseBody?.detail ||
      responseBody?.error ||
      `Request failed with status ${response.status}`;
    const errorCode =
      responseBody?.error_code ||
      responseBody?.errorCode ||
      (response.status === 409 ? 'CUSTOMER_HAS_RECORDS' : 'API_ERROR');

    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return responseBody as T;
}
