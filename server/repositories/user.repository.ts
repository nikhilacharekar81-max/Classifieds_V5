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
      const rows = (await withDbRetry(() =>
        db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
      )) as any[];
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

  public async findAllForAdmin(): Promise<UserAccount[]> {
    try {
      const users = await this.findAll();
      const kycRows = await db
        .select()
        .from(schema.kycDocuments)
        .orderBy(desc(schema.kycDocuments.submittedAt));

      const kycByUserId = new Map<string, typeof schema.kycDocuments.$inferSelect>();
      for (const kyc of kycRows) {
        if (!kycByUserId.has(kyc.userId)) {
          kycByUserId.set(kyc.userId, kyc);
        }
      }

      return users.map((u) => {
        const kyc = kycByUserId.get(u.id);
        if (kyc) {
          return {
            ...u,
            kycDocument: {
              type: kyc.documentType as any,
              docNumber: kyc.documentNumber,
              submittedAt: kyc.submittedAt.toISOString().split('T')[0],
              fileUrl: kyc.fileUrl,
            },
          };
        }
        return u;
      });
    } catch (error) {
      console.error('UserRepository.findAllForAdmin error:', error);
      return await this.findAll();
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

  public async updateKycStatus(userId: string, status: string, rejectionReason?: string, reviewedBy?: string): Promise<boolean> {
    try {
      const res = await db
        .update(schema.users)
        .set({
          kycStatus: status,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning({ id: schema.users.id });

      // Update associated kyc_documents record as well
      await db
        .update(schema.kycDocuments)
        .set({
          status: status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending',
          rejectionReason: rejectionReason || null,
          reviewedBy: reviewedBy || null,
          reviewedAt: new Date(),
        })
        .where(eq(schema.kycDocuments.userId, userId));

      return res.length > 0;
    } catch (error) {
      console.error('UserRepository.updateKycStatus error:', error);
      throw new Error('Failed to update KYC status', { cause: error });
    }
  }

  public async createKycDocument(data: {
    id: string;
    userId: string;
    documentType: string;
    documentNumber: string;
    fileUrl: string;
  }) {
    try {
      const inserted = await db
        .insert(schema.kycDocuments)
        .values({
          id: data.id,
          userId: data.userId,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          fileUrl: data.fileUrl,
          status: 'pending',
        })
        .returning();

      await db
        .update(schema.users)
        .set({
          kycStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, data.userId));

      return inserted[0];
    } catch (error) {
      console.error('UserRepository.createKycDocument error:', error);
      throw new Error('Failed to create KYC document', { cause: error });
    }
  }

  public async findLatestKycDocument(userId: string) {
    try {
      const rows = await db
        .select()
        .from(schema.kycDocuments)
        .where(eq(schema.kycDocuments.userId, userId))
        .orderBy(desc(schema.kycDocuments.submittedAt))
        .limit(1);

      return rows[0] || null;
    } catch (error) {
      console.error('UserRepository.findLatestKycDocument error:', error);
      return null;
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
      const sessionRows = await withDbRetry(() =>
        db
          .select()
          .from(schema.userSessions)
          .where(eq(schema.userSessions.id, sessionId))
          .limit(1)
      );

      if (!sessionRows.length) return null;
      const session = sessionRows[0];
      if (session.expiresAt < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      const userRows = await withDbRetry(() =>
        db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .limit(1)
      );

      if (!userRows.length) return null;
      const user = userRows[0];

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
