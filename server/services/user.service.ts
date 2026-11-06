import { userRepository } from '@/server/repositories/user.repository';
import { favoriteRepository } from '@/server/repositories/favorite.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { UserAccount, KycStatus } from '@/lib/types';

export class UserService {
  public async getUsers(filter: string = 'all'): Promise<UserAccount[]> {
    const all = await userRepository.findAllForAdmin();
    if (filter === 'regular' || filter === 'users') {
      return all.filter((u) => u.type === 'user');
    }
    if (filter === 'businesses') {
      return all.filter((u) => u.type === 'business');
    }
    if (filter === 'verification') {
      return all.filter((u) => u.kycStatus === 'pending');
    }
    if (filter === 'banned') {
      return all.filter((u) => u.status === 'banned');
    }
    return all;
  }

  public async getUserById(id: string): Promise<UserAccount | null> {
    return await userRepository.findById(id);
  }

  public async updateUser(
    id: string, 
    updatedData: Partial<UserAccount & { adminRole?: string | null }>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<UserAccount | null> {
    const fields: any = {};
    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.email !== undefined) fields.email = updatedData.email;
    if (updatedData.phone !== undefined) fields.phone = updatedData.phone;
    if (updatedData.status !== undefined) fields.status = updatedData.status;
    if (updatedData.type !== undefined) fields.type = updatedData.type;
    if (updatedData.adminRole !== undefined) fields.adminRole = updatedData.adminRole;
    if (updatedData.emailSubscribed !== undefined) fields.emailSubscribed = updatedData.emailSubscribed;
    if (updatedData.emailVerified !== undefined) fields.emailVerified = updatedData.emailVerified;
    if (updatedData.emailVerifiedAt !== undefined) fields.emailVerifiedAt = updatedData.emailVerifiedAt;
    
    const anyData = updatedData as any;
    if (updatedData.businessDetails?.companyName !== undefined || anyData.businessName !== undefined) {
      fields.businessName = updatedData.businessDetails?.companyName ?? anyData.businessName;
    }
    if (updatedData.businessDetails?.gstNumber !== undefined || anyData.gstNumber !== undefined) {
      fields.gstNumber = updatedData.businessDetails?.gstNumber ?? anyData.gstNumber;
    }
    if (updatedData.businessDetails?.verifiedBusiness !== undefined || anyData.verifiedBusiness !== undefined) {
      fields.verifiedBusiness = updatedData.businessDetails?.verifiedBusiness ?? anyData.verifiedBusiness;
    }
    if (updatedData.location) {
      if (updatedData.location.city) fields.city = updatedData.location.city;
      if (updatedData.location.state) fields.state = updatedData.location.state;
    }

    const updated = await userRepository.update(id, fields);
    if (updated && actor) {
      await adminRepository.createAuditLog({
        adminId: actor.id,
        adminName: actor.name,
        action: 'USER_UPDATED',
        module: 'Users',
        targetId: id,
        targetSummary: updated.name,
        details: `Updated user fields: ${Object.keys(fields).join(', ')}`,
        ipAddress: actor.ipAddress || 'unknown',
      });
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

    await userRepository.update(userId, { status: 'active' });

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

    await userRepository.updateKycStatus(userId, status, notes);

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
