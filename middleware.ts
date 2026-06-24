import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - /api/dealers GET (public dealer list for Shopify)
     * - _next, static files
     */
    '/((?!login|api/auth|api/dealers|_next/static|_next/image|favicon.ico).*)',
  ],
};
