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

  public async updateUser(id: string, updatedData: Partial<UserAccount>): Promise<UserAccount | null> {
    const fields: any = {};
    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.phone !== undefined) fields.phone = updatedData.phone;
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

    return await userRepository.update(id, fields);
  }

  public async banUser(
    userId: string,
    reason: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    await userRepository.update(userId, { status: 'banned' });

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'Administrator',
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
      adminName: actor?.name || 'Administrator',
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
      adminName: actor?.name || 'Administrator',
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
