import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check both cookie and localStorage (via header if available)
  const token = request.cookies.get('adminToken')?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login') {
    // If already logged in, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to login if no token
  // Note: We can't check localStorage in middleware, so we rely on cookies
  // The client-side AuthContext will handle localStorage checks
  if (!token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
