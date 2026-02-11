import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/i18n/config';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show prefix for non-default locales
});

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Handle admin routes - check auth first
  if (pathname.startsWith('/admin') || pathname.match(/^\/(en|sv)\/admin/)) {
    const response = await updateSession(request);
    if (response.status === 307 || response.status === 308) {
      // Redirect to login
      return response;
    }
  }

  // Handle internationalization
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - _next (Next.js internals)
    // - Static files
    '/((?!api|_next|.*\\..*).*)',
  ],
};
