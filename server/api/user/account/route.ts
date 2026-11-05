import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { userRepository } from '@/server/repositories/user.repository';

export async function DELETE(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const success = await userRepository.anonymizeAndDeleteUser(authContext.userId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true, message: 'Account successfully deleted' });
    res.cookies.delete('chillyads_session');
    return res;
  } catch (error: any) {
    console.error('API /api/user/account DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Error deleting account' }, { status: 500 });
  }
}
