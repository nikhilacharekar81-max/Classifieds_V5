import { NextRequest } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { UserAccount } from '@/lib/types';

import { AdminRole, ROLE_PERMISSIONS } from './roles';

export interface AuthenticatedContext {
  user: UserAccount;
  userId: string;
  sessionId: string;
  adminRole: AdminRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isFinance: boolean;
  ipAddress: string;
  impersonatedBy?: string | null;
}

/**
 * Extracts client IP address safely without trusting arbitrary client-supplied headers.
 */
export function getRequestIp(req?: NextRequest | Request | null): string {
  if (!req) return '127.0.0.1';

  if (process.env.TRUST_PROXY && req.headers) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip) => ip.trim()).filter(Boolean);
      if (ips.length > 0) {
        const clientIp = ips[0];
        if (/^[a-fA-F0-9:.]+$/.test(clientIp)) {
          return clientIp;
        }
      }
    }

    const realIp = req.headers.get('x-real-ip')?.trim();
    if (realIp && /^[a-fA-F0-9:.]+$/.test(realIp)) {
      return realIp;
    }
  }

  const socketIp = (req as any)?.socket?.remoteAddress || (req as any)?.connection?.remoteAddress;
  if (socketIp && typeof socketIp === 'string' && /^[a-fA-F0-9:.]+$/.test(socketIp)) {
    return socketIp;
  }

  return '127.0.0.1';
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedContext | null> {
  const ipAddress = getRequestIp(req);

  // 1. Check Authorization Header (Bearer token) FIRST (Priority over cookie)
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 2. Check HTTP-only cookie (chillyads_session > session_token > session)
  const cookieSession =
    req.cookies.get('chillyads_session')?.value ||
    req.cookies.get('session_token')?.value ||
    req.cookies.get('session')?.value;

  const token = bearerToken || cookieSession;

  if (!token) {
    return null;
  }

  // Verify session against PostgreSQL user_sessions table
  const dbSession = await userRepository.findSession(token);
  if (dbSession && dbSession.user && dbSession.user.status === 'active') {
    const role = dbSession.adminRole as AdminRole | null;
    const perms = role ? ROLE_PERMISSIONS[role] : null;

    return {
      user: dbSession.user,
      userId: dbSession.user.id,
      sessionId: token,
      adminRole: role,
      isAdmin: perms?.canAccessAdmin ?? false,
      isSuperAdmin: role === 'super_admin',
      isModerator: perms?.canModerateListings ?? false,
      isFinance: perms?.canManageFinance ?? false,
      ipAddress,
      impersonatedBy: dbSession.session.impersonatedBy || null,
    };
  }

  return null;
}
