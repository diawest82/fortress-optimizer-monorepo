/**
 * Secure Cookie Utilities
 * Manages secure httpOnly cookies for authentication tokens
 */

import { NextRequest, NextResponse } from 'next/server';

export interface CookieOptions {
  name: string;
  value: string;
  maxAge?: number; // in seconds
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  domain?: string;
}

/**
 * Set a secure httpOnly cookie
 */
export function setSecureCookie(response: NextResponse, options: CookieOptions): void {
  const cookieOptions: Partial<CookieOptions> = {
    httpOnly: true, // Prevent access from JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'Strict', // CSRF protection
    path: options.path || '/',
  };

  if (options.maxAge) {
    cookieOptions.maxAge = options.maxAge;
  }

  if (options.domain) {
    cookieOptions.domain = options.domain;
  }

  // Build cookie string
  let cookieString = `${options.name}=${encodeURIComponent(options.value)}`;

  if (cookieOptions.maxAge) {
    cookieString += `; Max-Age=${cookieOptions.maxAge}`;
  }

  if (cookieOptions.httpOnly) {
    cookieString += '; HttpOnly';
  }

  if (cookieOptions.secure) {
    cookieString += '; Secure';
  }

  if (cookieOptions.sameSite) {
    cookieString += `; SameSite=${cookieOptions.sameSite}`;
  }

  if (cookieOptions.path) {
    cookieString += `; Path=${cookieOptions.path}`;
  }

  if (cookieOptions.domain) {
    cookieString += `; Domain=${cookieOptions.domain}`;
  }

  response.headers.append('Set-Cookie', cookieString);
}

/**
 * Get a cookie value from request
 */
export function getCookie(request: NextRequest, name: string): string | undefined {
  const cookieValue = request.cookies.get(name);
  return cookieValue?.value;
}

/**
 * Clear a cookie
 */
export function clearCookie(response: NextResponse, name: string, path: string = '/'): void {
  let cookieString = `${name}=; Max-Age=0; Path=${path};`;

  if (process.env.NODE_ENV === 'production') {
    cookieString += ' Secure;';
  }

  cookieString += ' HttpOnly; SameSite=Strict;';

  response.headers.append('Set-Cookie', cookieString);
}

/**
 * Set authentication token cookie (1 day expiry)
 */
export function setAuthTokenCookie(response: NextResponse, token: string): void {
  setSecureCookie(response, {
    name: 'fortress_auth_token',
    value: token,
    maxAge: 24 * 60 * 60, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  });
}

/**
 * Set refresh token cookie (7 days expiry)
 */
export function setRefreshTokenCookie(response: NextResponse, token: string): void {
  setSecureCookie(response, {
    name: 'fortress_refresh_token',
    value: token,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api',
  });
}

/**
 * Set CSRF token cookie (1 hour expiry)
 */
export function setCsrfTokenCookie(response: NextResponse, token: string): void {
  setSecureCookie(response, {
    name: 'fortress_csrf_token',
    value: token,
    maxAge: 60 * 60, // 1 hour
    httpOnly: false, // CSRF token needs to be accessible to JavaScript for forms
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  });
}

/**
 * Get auth token from cookies
 */
export function getAuthTokenFromCookies(request: NextRequest): string | undefined {
  return getCookie(request, 'fortress_auth_token');
}

/**
 * Get refresh token from cookies
 */
export function getRefreshTokenFromCookies(request: NextRequest): string | undefined {
  return getCookie(request, 'fortress_refresh_token');
}

/**
 * Get CSRF token from cookies
 */
export function getCsrfTokenFromCookies(request: NextRequest): string | undefined {
  return getCookie(request, 'fortress_csrf_token');
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  clearCookie(response, 'fortress_auth_token');
  clearCookie(response, 'fortress_refresh_token');
  clearCookie(response, 'fortress_csrf_token');
}
