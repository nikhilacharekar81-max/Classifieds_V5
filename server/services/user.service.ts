import { userRepository } from '@/server/repositories/user.repository';
import { favoriteRepository } from '@/server/repositories/favorite.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { UserAccount } from '@/lib/types';

export class UserService {
  public async getUsers(
    filter: string = 'all',
    options?: {
      includeKycDocuments?: boolean;
      limit?: number;
      offset?: number;
      search?: string;
      role?: string;
      status?: string;
      kycStatus?: string;
    }
  ): Promise<UserAccount[]> {
    const res = await userRepository.findPaginatedForAdmin({
      filter,
      ...options,
      limit: options?.limit ?? 500,
      offset: options?.offset ?? 0,
    });
    return res.users;
  }

  public async getPaginatedUsers(options?: {
    filter?: string;
    search?: string;
    role?: string;
    status?: string;
    kycStatus?: string;
    includeKycDocuments?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return await userRepository.findPaginatedForAdmin(options);
  }

  public async getUserById(id: string): Promise<UserAccount | null> {
    return await userRepository.findById(id);
  }

  public async getUserForAdmin(id: string, includeKycDocument: boolean = false): Promise<UserAccount | null> {
    return await userRepository.findByIdForAdmin(id, includeKycDocument);
  }

  public async updateUser(
    id: string, 
    updatedData: Partial<UserAccount & { adminRole?: string | null; avatarUrl?: string; city?: string; state?: string }>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<UserAccount | null> {
    const fields: any = {};
    const anyData = updatedData as any;

    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.email !== undefined) fields.email = updatedData.email;
    if (updatedData.phone !== undefined) fields.phone = updatedData.phone;
    if (updatedData.status !== undefined) fields.status = updatedData.status;
    if (updatedData.type !== undefined) fields.type = updatedData.type;
    if (updatedData.kycStatus !== undefined) fields.kycStatus = updatedData.kycStatus;
    if (updatedData.adminRole !== undefined) fields.adminRole = updatedData.adminRole;
    if (updatedData.emailSubscribed !== undefined) {
      fields.emailSubscribed = updatedData.emailSubscribed;
      if (!updatedData.emailSubscribed) {
        fields.emailUnsubscribedAt = new Date();
      } else {
        fields.emailUnsubscribedAt = null;
      }
    }
    if (updatedData.emailVerified !== undefined) fields.emailVerified = updatedData.emailVerified;
    if (updatedData.emailVerifiedAt !== undefined) fields.emailVerifiedAt = updatedData.emailVerifiedAt;
    if (anyData.avatarUrl !== undefined) fields.avatarUrl = anyData.avatarUrl;
    else if (updatedData.avatar !== undefined) fields.avatarUrl = updatedData.avatar;

    if (updatedData.businessDetails?.companyName !== undefined || anyData.businessName !== undefined) {
      fields.businessName = updatedData.businessDetails?.companyName ?? anyData.businessName;
    }
    if (updatedData.businessDetails?.gstNumber !== undefined || anyData.gstNumber !== undefined) {
      fields.gstNumber = updatedData.businessDetails?.gstNumber ?? anyData.gstNumber;
    }
    if (updatedData.businessDetails?.verifiedBusiness !== undefined || anyData.verifiedBusiness !== undefined) {
      fields.verifiedBusiness = updatedData.businessDetails?.verifiedBusiness ?? anyData.verifiedBusiness;
    }

    if (anyData.city !== undefined) {
      fields.city = anyData.city;
    } else if (updatedData.location?.city !== undefined) {
      fields.city = updatedData.location.city;
    }

    if (anyData.state !== undefined) {
      fields.state = anyData.state;
    } else if (updatedData.location?.state !== undefined) {
      fields.state = updatedData.location.state;
    }

    const updated = await userRepository.update(id, fields);
    if (updated) {
      if (fields.email !== undefined) {
        // Rule 4: Invalidate sessions & emailVerified=false
        await userRepository.update(id, { emailVerified: false, emailVerifiedAt: null });
        await userRepository.invalidateUserSessions(id);
      }
      
      if (fields.name !== undefined || fields.phone !== undefined) {
        const { db } = await import('@/src/db/index');
        const schema = await import('@/src/db/schema');
        const { eq } = await import('@/src/db/pg-orm');
        const listingUpdates: any = {};
        if (fields.name !== undefined) listingUpdates.sellerName = fields.name;
        if (fields.phone !== undefined) listingUpdates.sellerPhone = fields.phone;
        await db.update(schema.listings).set(listingUpdates).where(eq(schema.listings.sellerId, id));
      }

      if (actor) {
        await adminRepository.createAuditLog({
          adminId: actor.id,
          adminName: actor.name,
          action: 'USER_UPDATED',
          module: 'Users',
          targetId: id,
          targetSummary: updated.name,
          details: `Updated user fields: ${Object.keys(fields).join(', ')}${fields.email ? ' (Email changed)' : ''}`,
          ipAddress: actor.ipAddress || 'unknown',
        });
      }
    }
    return updated;
  }

  public async banUser(
    userId: string,
    reason: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    await userRepository.update(userId, { status: 'banned', banReason: reason });

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: 'USER_BANNED',
      module: 'Users',
      targetId: userId,
      targetSummary: user.name,
      details: `Banned user with reason: ${reason}`,
      ipAddress: actor?.ipAddress || 'unknown',
    });

    return true;
  }

  public async unbanUser(
    userId: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    await userRepository.update(userId, { status: 'active', banReason: null });

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: 'USER_UNBANNED',
      module: 'Users',
      targetId: userId,
      targetSummary: user.name,
      details: 'Unbanned user',
      ipAddress: actor?.ipAddress || 'unknown',
    });

    return true;
  }

  public async verifyKyc(
    userId: string,
    status: 'verified' | 'rejected',
    notes?: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    await userRepository.updateKycStatus(userId, status, notes, actor?.id);

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: status === 'verified' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      module: 'Users',
      targetId: userId,
      targetSummary: user.name,
      details: notes || `KYC status changed to ${status}`,
      ipAddress: actor?.ipAddress || 'unknown',
    });

    return true;
  }

  // Favorites
  public async getFavorites(userId: string): Promise<string[]> {
    return await favoriteRepository.getUserFavorites(userId);
  }

  public async toggleFavorite(userId: string, listingId: string): Promise<boolean> {
    const res = await favoriteRepository.toggleFavorite(userId, listingId);
    return res.isFavorited;
  }
}

export const userService = new UserService();
