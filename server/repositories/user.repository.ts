import { db, withDbRetry } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, desc } from '@/src/db/pg-orm';
import { UserAccount } from '@/lib/types';

export class UserRepository {
  private mapRowToUser(row: typeof schema.users.$inferSelect): UserAccount {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatar: row.avatarUrl || '',
      type: row.type as any,
      status: row.status as any,
      kycStatus: row.kycStatus as any,
      emailSubscribed: row.emailSubscribed,
      location: {
        city: row.city,
        state: row.state,
      },
      totalListings: 0,
      activeListings: 0,
      rating: Number(row.rating),
      reviewCount: row.reviewCount,
      joinedDate: row.createdAt.toISOString().split('T')[0],
      lastLogin: row.updatedAt.toISOString().split('T')[0],
      lastIp: 'unknown',
      businessDetails: row.businessName
        ? {
            companyName: row.businessName,
            gstNumber: row.gstNumber || '',
            verifiedBusiness: row.verifiedBusiness,
          }
        : undefined,
    };
  }

  public async findById(id: string): Promise<UserAccount | null> {
    try {
      const rows = await withDbRetry(() =>
        db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
      );
      if (!rows.length) return null;
      return this.mapRowToUser(rows[0]);
    } catch (error) {
      console.error(`UserRepository.findById error for ${id}:`, error);
      throw new Error(`Failed to find user with id ${id}`, { cause: error });
    }
  }

  public async findByEmail(email: string): Promise<typeof schema.users.$inferSelect | null> {
    try {
      const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
      return rows[0] || null;
    } catch (error) {
      console.error(`UserRepository.findByEmail error:`, error);
      throw new Error(`Failed to find user with email ${email}`, { cause: error });
    }
  }

  public async findByUid(uid: string): Promise<typeof schema.users.$inferSelect | null> {
    try {
      const rows = await db.select().from(schema.users).where(eq(schema.users.uid, uid)).limit(1);
      return rows[0] || null;
    } catch (error) {
      console.error(`UserRepository.findByUid error:`, error);
      throw new Error(`Failed to find user with uid ${uid}`, { cause: error });
    }
  }

  public async findAll(): Promise<UserAccount[]> {
    try {
      const rows = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
      return rows.map((r) => this.mapRowToUser(r));
    } catch (error) {
      console.error('UserRepository.findAll error:', error);
      throw new Error('Failed to find users', { cause: error });
    }
  }

  public async create(data: {
    id: string;
    uid?: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash?: string;
    avatarUrl?: string;
    type?: string;
    city?: string;
    state?: string;
    businessName?: string;
    gstNumber?: string;
    verifiedBusiness?: boolean;
    adminRole?: string;
  }): Promise<UserAccount> {
    try {
      const inserted = await db
        .insert(schema.users)
        .values({
          id: data.id,
          uid: data.uid || null,
          name: data.name,
          email: data.email.toLowerCase().trim(),
          phone: data.phone || '',
          passwordHash: data.passwordHash || null,
          avatarUrl: data.avatarUrl || null,
          type: data.type || 'user',
          city: data.city || 'Mumbai',
          state: data.state || 'Maharashtra',
          businessName: data.businessName || null,
          gstNumber: data.gstNumber || null,
          verifiedBusiness: data.verifiedBusiness ?? false,
          adminRole: data.adminRole || null,
        })
        .returning();

      return this.mapRowToUser(inserted[0]);
    } catch (error) {
      console.error('UserRepository.create error:', error);
      throw new Error('Failed to create user in PostgreSQL', { cause: error });
    }
  }

  public async update(id: string, fields: Partial<typeof schema.users.$inferInsert>): Promise<UserAccount | null> {
    try {
      const updated = await db
        .update(schema.users)
        .set({
          ...fields,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning();

      if (!updated.length) return null;
      return this.mapRowToUser(updated[0]);
    } catch (error) {
      console.error(`UserRepository.update error for ${id}:`, error);
      throw new Error(`Failed to update user ${id}`, { cause: error });
    }
  }

  public async updateKycStatus(userId: string, status: string, rejectionReason?: string): Promise<boolean> {
    try {
      const res = await db
        .update(schema.users)
        .set({
          kycStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning({ id: schema.users.id });

      return res.length > 0;
    } catch (error) {
      console.error('UserRepository.updateKycStatus error:', error);
      throw new Error('Failed to update KYC status', { cause: error });
    }
  }

  // Session Management
  public async createSession(sessionId: string, userId: string, ipAddress: string, userAgent?: string, impersonatedBy?: string) {
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db.insert(schema.userSessions).values({
        id: sessionId,
        userId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || null,
        impersonatedBy: impersonatedBy || null,
        expiresAt,
      });
      return { sessionId, expiresAt };
    } catch (error) {
      console.error('UserRepository.createSession error:', error);
      throw new Error('Failed to create user session', { cause: error });
    }
  }

  public async findSession(sessionId: string) {
    try {
      const rows = await withDbRetry(() =>
        db
          .select({
            session: schema.userSessions,
            user: schema.users,
          })
          .from(schema.userSessions)
          .innerJoin(schema.users, eq(schema.userSessions.userId, schema.users.id))
          .where(eq(schema.userSessions.id, sessionId))
          .limit(1)
      );

      if (!rows.length) return null;
      const { session, user } = rows[0];
      if (session.expiresAt < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }
      // Security Gate: Inactive or banned users cannot authenticate
      if (user.status !== 'active') {
        await this.deleteSession(sessionId);
        return null;
      }
      return { session, user: this.mapRowToUser(user), adminRole: user.adminRole };
    } catch (error) {
      console.error('UserRepository.findSession error:', error);
      return null;
    }
  }

  public async deleteSession(sessionId: string) {
    try {
      await db.delete(schema.userSessions).where(eq(schema.userSessions.id, sessionId));
    } catch (error) {
      console.error('UserRepository.deleteSession error:', error);
    }
  }

  public async deleteUserSessions(userId: string) {
    try {
      await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));
    } catch (error) {
      console.error('UserRepository.deleteUserSessions error:', error);
    }
  }
}

export const userRepository = new UserRepository();
