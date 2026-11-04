import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const isWorkspace = pathname === '/';
  const isStart = pathname === '/start';

  if (!isWorkspace && !isStart) {
    return;
  }

  const authState = await auth({ treatPendingAsSignedOut: false });

  // Early redirect for signed-out users. This is a convenience, not the
  // protection: the layout and pages run their own auth checks.
  if (!authState.userId) {
    return authState.redirectToSignIn({ returnBackUrl: request.url });
  }

  if (isStart) {
    return;
  }

  // A pending session still has an organization task to finish, and a session
  // without an active org cannot own workspace data yet.
  if (authState.sessionStatus === 'pending' || !authState.orgId) {
    return NextResponse.redirect(new URL('/start', request.url));
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on every page and API route.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
