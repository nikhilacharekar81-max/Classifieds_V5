import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';

export async function POST(req: NextRequest) {
  const sessionId =
    req.cookies.get('chillyads_session')?.value ||
    req.cookies.get('session_token')?.value ||
    req.cookies.get('session')?.value;

  if (sessionId) {
    await userRepository.deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete('chillyads_session');
  response.cookies.delete('session_token');
  response.cookies.delete('session');

  return response;
}
