import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { userRepository } from '@/server/repositories/user.repository';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    await userRepository.deleteUserSessions(authContext.userId);

    const response = NextResponse.json({
      success: true,
      message: 'All active sessions have been logged out successfully.',
    });

    response.cookies.delete('chillyads_session');
    response.cookies.delete('session_token');
    response.cookies.delete('session');

    return addSecurityHeaders(response);
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to log out sessions. Please try again.');
  }
}
