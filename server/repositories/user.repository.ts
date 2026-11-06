import { db, withDbRetry } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, desc, and, ne, gt, isNull, sql } from '@/src/db/pg-orm';
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
      emailUnsubscribedAt: row.emailUnsubscribedAt ? row.emailUnsubscribedAt.toISOString() : undefined,
      emailVerified: row.emailVerified,
      emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : undefined,
      banReason: row.banReason || undefined,
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
      lastIp: 'Not recorded',
      businessDetails: row.businessName
        ? {
            companyName: row.businessName,
            gstNumber: row.gstNumber || '',
            verifiedBusiness: row.verifiedBusiness,
          }
        : undefined,
    };
  }

  private async enrichUserWithStats(user: UserAccount, sessionIp?: string): Promise<UserAccount> {
    try {
      let totalListings = 0;
      let activeListings = 0;
      let lastIp = sessionIp && sessionIp !== 'unknown' ? sessionIp : 'Not recorded';

      try {
        const statsRows = (await withDbRetry(async () =>
          await db
            .select({
              total: sql<number>`count(*)::int`,
              active: sql<number>`sum(case when ${schema.listings.status} = 'approved' and ${schema.listings.expiresAt} >= now() then 1 else 0 end)::int`,
            })
            .from(schema.listings)
            .where(eq(schema.listings.sellerId, user.id))
        )) as any[];

        if (statsRows && statsRows.length > 0) {
          totalListings = Number(statsRows[0].total) || 0;
          activeListings = Number(statsRows[0].active) || 0;
        }
      } catch (err) {
        console.warn(`Failed to fetch listing stats for user ${user.id}:`, err);
      }

      if (lastIp === 'Not recorded') {
        try {
          const sessionRows = (await withDbRetry(async () =>
            await db
              .select({
                ipAddress: schema.userSessions.ipAddress,
              })
              .from(schema.userSessions)
              .where(eq(schema.userSessions.userId, user.id))
              .orderBy(desc(schema.userSessions.createdAt))
              .limit(1)
          )) as any[];

          if (sessionRows && sessionRows.length > 0 && sessionRows[0].ipAddress && sessionRows[0].ipAddress !== 'unknown') {
            lastIp = sessionRows[0].ipAddress;
          }
        } catch (err) {
          console.warn(`Failed to fetch lastIp for user ${user.id}:`, err);
        }
      }

      return {
        ...user,
        totalListings,
        activeListings,
        lastIp,
      };
    } catch (err) {
      console.warn(`enrichUserWithStats failed for user ${user.id}:`, err);
      return user;
    }
  }

  public async findById(id: string): Promise<UserAccount | null> {
    try {
      const rows = (await withDbRetry(() =>
        db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
      )) as any[];
      if (!rows.length) return null;
      const baseUser = this.mapRowToUser(rows[0]);
      return await this.enrichUserWithStats(baseUser);
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

  public async generateUnsubscribeToken(userId: string): Promise<string> {
    const token = `unsub_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    await db.update(schema.users).set({ unsubscribeToken: token }).where(eq(schema.users.id, userId));
    return token;
  }

  public async findByUnsubscribeToken(token: string): Promise<typeof schema.users.$inferSelect | null> {
    const rows = await db.select().from(schema.users).where(eq(schema.users.unsubscribeToken, token)).limit(1);
    return rows[0] || null;
  }

  public async findAll(): Promise<UserAccount[]> {
    try {
      const rows = (await withDbRetry(() =>
        db.select().from(schema.users).orderBy(desc(schema.users.createdAt))
      )) as any[];
      const users = rows.map((r) => this.mapRowToUser(r));

      try {
        const listingStatsRows = (await withDbRetry(() =>
          db
            .select({
              sellerId: schema.listings.sellerId,
              total: sql<number>`count(*)::int`,
              active: sql<number>`sum(case when ${schema.listings.status} = 'approved' and ${schema.listings.expiresAt} >= now() then 1 else 0 end)::int`,
            })
            .from(schema.listings)
            .groupBy(schema.listings.sellerId)
        )) as any[];

        const statsMap = new Map<string, { total: number; active: number }>();
        for (const row of listingStatsRows) {
          if (row.sellerId) {
            statsMap.set(row.sellerId, {
              total: Number(row.total) || 0,
              active: Number(row.active) || 0,
            });
          }
        }

        return users.map((u) => {
          const stats = statsMap.get(u.id);
          return {
            ...u,
            totalListings: stats?.total ?? 0,
            activeListings: stats?.active ?? 0,
          };
        });
      } catch (err) {
        console.warn('Failed to aggregate listing stats for users:', err);
        return users;
      }
    } catch (error) {
      console.error('UserRepository.findAll error:', error);
      throw new Error('Failed to find users', { cause: error });
    }
  }

  public async findAllForAdmin(): Promise<UserAccount[]> {
    try {
      const users = await this.findAll();
      const kycRows = (await withDbRetry(() =>
        db
          .select()
          .from(schema.kycDocuments)
          .orderBy(desc(schema.kycDocuments.submittedAt))
      )) as any[];

      const kycByUserId = new Map<string, typeof schema.kycDocuments.$inferSelect>();
      for (const kyc of kycRows) {
        if (!kycByUserId.has(kyc.userId)) {
          kycByUserId.set(kyc.userId, kyc);
        }
      }

      // Query most recent recorded IP address from user_sessions per user
      const sessionRows = (await withDbRetry(() =>
        db
          .select({
            userId: schema.userSessions.userId,
            ipAddress: schema.userSessions.ipAddress,
          })
          .from(schema.userSessions)
          .orderBy(desc(schema.userSessions.createdAt))
      )) as any[];

      const ipByUserId = new Map<string, string>();
      for (const sess of sessionRows) {
        if (sess.userId && !ipByUserId.has(sess.userId) && sess.ipAddress && sess.ipAddress !== 'unknown') {
          ipByUserId.set(sess.userId, sess.ipAddress);
        }
      }

      return users.map((u) => {
        const kyc = kycByUserId.get(u.id);
        const lastIp = ipByUserId.get(u.id) || 'Not recorded';
        const base = {
          ...u,
          lastIp,
        };
        if (kyc) {
          return {
            ...base,
            kycDocument: {
              type: kyc.documentType as any,
              docNumber: kyc.documentNumber,
              submittedAt: kyc.submittedAt.toISOString().split('T')[0],
              fileUrl: kyc.fileUrl,
            },
          };
        }
        return base;
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
    if (!data.phone || typeof data.phone !== 'string' || !data.phone.trim()) {
      throw new Error('A valid phone number is required to register an account');
    }
    const cleanDigits = data.phone.trim().replace(/\D/g, '');
    if (cleanDigits.length < 10 || cleanDigits.length > 15) {
      throw new Error('Phone number must contain between 10 and 15 digits');
    }
    const normalizedPhone = data.phone.trim().startsWith('+') ? `+${cleanDigits}` : cleanDigits;

    try {
      const inserted = await db
        .insert(schema.users)
        .values({
          id: data.id,
          uid: data.uid || null,
          name: data.name,
          email: data.email.toLowerCase().trim(),
          phone: normalizedPhone,
          passwordHash: data.passwordHash || null,
          avatarUrl: data.avatarUrl || null,
          type: data.type || 'user',
          city: data.city && typeof data.city === 'string' ? data.city.trim() : '',
          state: data.state && typeof data.state === 'string' ? data.state.trim() : '',
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
      if (user.status !== 'active' || !user.emailVerified) {
        await this.deleteSession(sessionId);
        return null;
      }
      const baseUser = this.mapRowToUser(user);
      const enrichedUser = await this.enrichUserWithStats(baseUser, session.ipAddress);
      return { session, user: enrichedUser, adminRole: user.adminRole };
    } catch (error) {
      console.error('UserRepository.findSession error:', error);
      return null;
    }
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await db.delete(schema.userSessions).where(eq(schema.userSessions.id, sessionId));
      return true;
    } catch (error) {
      console.error('UserRepository.deleteSession error:', error);
      return false;
    }
  }

  public async deleteUserSessions(userId: string): Promise<boolean> {
    try {
      await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));
      return true;
    } catch (error) {
      console.error('UserRepository.deleteUserSessions error:', error);
      throw new Error('Failed to delete user sessions', { cause: error });
    }
  }

  public async anonymizeAndDeleteUser(userId: string): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const now = new Date();
        await tx
          .update(schema.listings)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(schema.listings.sellerId, userId));

        await tx
          .update(schema.users)
          .set({
            name: 'Deleted User',
            email: `deleted_${userId.slice(0, 12)}@deleted.invalid`,
            phone: '0000000000',
            passwordHash: null,
            avatarUrl: null,
            status: 'deleted',
            emailVerified: false,
            updatedAt: now,
          })
          .where(eq(schema.users.id, userId));

        await tx
          .update(schema.kycDocuments)
          .set({
            documentNumber: 'ANONYMIZED',
            fileUrl: '',
          })
          .where(eq(schema.kycDocuments.userId, userId));

        await tx.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));
        return true;
      });
    } catch (error) {
      console.error(`UserRepository.anonymizeAndDeleteUser error for ${userId}:`, error);
      return false;
    }
  }

  public async deleteOtherUserSessions(userId: string, keepSessionId: string): Promise<boolean> {
    try {
      await db
        .delete(schema.userSessions)
        .where(
          and(
            eq(schema.userSessions.userId, userId),
            ne(schema.userSessions.id, keepSessionId)
          )
        );
      return true;
    } catch (error) {
      console.error('UserRepository.deleteOtherUserSessions error:', error);
      throw new Error('Failed to delete other user sessions', { cause: error });
    }
  }

  public async consumePasswordResetTokenAndSetPassword(
    tokenHash: string,
    newPasswordHash: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    return await withDbRetry(async () => {
      return await db.transaction(async (tx) => {
        const now = new Date();
        const tokenRows = await tx
          .select()
          .from(schema.passwordResetTokens)
          .where(
            and(
              eq(schema.passwordResetTokens.tokenHash, tokenHash),
              gt(schema.passwordResetTokens.expiresAt, now)
            )
          )
          .limit(1);

        if (!tokenRows.length) {
          return { success: false, error: 'Invalid or expired password reset token' };
        }

        const tokenRecord = tokenRows[0];
        if (tokenRecord.usedAt) {
          return { success: false, error: 'Password reset token has already been used' };
        }

        const markRes = await tx
          .update(schema.passwordResetTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(schema.passwordResetTokens.id, tokenRecord.id),
              isNull(schema.passwordResetTokens.usedAt)
            )
          )
          .returning({ id: schema.passwordResetTokens.id });

        if (!markRes.length) {
          return { success: false, error: 'Password reset token has already been used' };
        }

        const userUpdateRes = await tx
          .update(schema.users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: now,
          })
          .where(eq(schema.users.id, tokenRecord.userId))
          .returning({ id: schema.users.id });

        if (!userUpdateRes.length) {
          throw new Error('Failed to update user password');
        }

        await tx.delete(schema.userSessions).where(eq(schema.userSessions.userId, tokenRecord.userId));

        return { success: true, userId: tokenRecord.userId };
      });
    });
  }

  public async consumeEmailVerificationToken(
    tokenHash: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    return await withDbRetry(async () => {
      return await db.transaction(async (tx) => {
        const now = new Date();
        const tokenRows = await tx
          .select()
          .from(schema.emailVerificationTokens)
          .where(
            and(
              eq(schema.emailVerificationTokens.tokenHash, tokenHash),
              gt(schema.emailVerificationTokens.expiresAt, now)
            )
          )
          .limit(1);

        if (!tokenRows.length) {
          return { success: false, error: 'Invalid or expired email verification token' };
        }

        const tokenRecord = tokenRows[0];
        if (tokenRecord.usedAt) {
          return { success: false, error: 'Email verification token has already been used' };
        }

        const markRes = await tx
          .update(schema.emailVerificationTokens)
          .set({ usedAt: now })
          .where(
            and(
              eq(schema.emailVerificationTokens.id, tokenRecord.id),
              isNull(schema.emailVerificationTokens.usedAt)
            )
          )
          .returning({ id: schema.emailVerificationTokens.id });

        if (!markRes.length) {
          return { success: false, error: 'Email verification token has already been used' };
        }

        await tx
          .update(schema.users)
          .set({
            emailVerified: true,
            emailVerifiedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.users.id, tokenRecord.userId));

        return { success: true, userId: tokenRecord.userId };
      });
    });
  }

  public async changePasswordAndInvalidateOtherSessions(
    userId: string,
    newPasswordHash: string,
    keepSessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    return await withDbRetry(async () => {
      return await db.transaction(async (tx) => {
        const now = new Date();
        const updateRes = await tx
          .update(schema.users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: now,
          })
          .where(eq(schema.users.id, userId))
          .returning({ id: schema.users.id });

        if (!updateRes.length) {
          return { success: false, error: 'User account not found' };
        }

        if (keepSessionId) {
          await tx
            .delete(schema.userSessions)
            .where(
              and(
                eq(schema.userSessions.userId, userId),
                ne(schema.userSessions.id, keepSessionId)
              )
            );
        }

        return { success: true };
      });
    });
  }

  public async updatePassword(userId: string, passwordHash: string): Promise<boolean> {
    try {
      const res = await db
        .update(schema.users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning({ id: schema.users.id });
      return res.length > 0;
    } catch (error) {
      console.error(`UserRepository.updatePassword error for ${userId}:`, error);
      throw error;
    }
  }

  // Password Reset Token Management
  public async createPasswordResetToken(id: string, userId: string, tokenHash: string, expiresAt: Date) {
    try {
      await db.insert(schema.passwordResetTokens).values({
        id,
        userId,
        tokenHash,
        expiresAt,
      });
    } catch (error) {
      console.error('UserRepository.createPasswordResetToken error:', error);
      throw error;
    }
  }

  public async findPasswordResetToken(tokenHash: string) {
    try {
      const rows = await db
        .select()
        .from(schema.passwordResetTokens)
        .where(
          and(
            eq(schema.passwordResetTokens.tokenHash, tokenHash),
            gt(schema.passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      return rows[0] || null;
    } catch (error) {
      console.error('UserRepository.findPasswordResetToken error:', error);
      return null;
    }
  }

  public async markPasswordResetTokenUsed(tokenId: string) {
    try {
      await db
        .update(schema.passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.passwordResetTokens.id, tokenId));
    } catch (error) {
      console.error('UserRepository.markPasswordResetTokenUsed error:', error);
    }
  }

  // Email Verification Token Management
  public async createEmailVerificationToken(id: string, userId: string, tokenHash: string, expiresAt: Date) {
    try {
      await db.insert(schema.emailVerificationTokens).values({
        id,
        userId,
        tokenHash,
        expiresAt,
      });
    } catch (error) {
      console.error('UserRepository.createEmailVerificationToken error:', error);
      throw error;
    }
  }

  public async findEmailVerificationToken(tokenHash: string) {
    try {
      const rows = await db
        .select()
        .from(schema.emailVerificationTokens)
        .where(
          and(
            eq(schema.emailVerificationTokens.tokenHash, tokenHash),
            gt(schema.emailVerificationTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      return rows[0] || null;
    } catch (error) {
      console.error('UserRepository.findEmailVerificationToken error:', error);
      return null;
    }
  }

  public async markEmailVerificationTokenUsed(tokenId: string) {
    try {
      await db
        .update(schema.emailVerificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.emailVerificationTokens.id, tokenId));
    } catch (error) {
      console.error('UserRepository.markEmailVerificationTokenUsed error:', error);
    }
  }

  public async markEmailVerified(userId: string) {
    try {
      await db
        .update(schema.users)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } catch (error) {
      console.error('UserRepository.markEmailVerified error:', error);
    }
  }

  // Persistent Rate Limiting
  public async checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000, blockMs = 15 * 60 * 1000): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(schema.loginRateLimits)
        .where(eq(schema.loginRateLimits.id, key))
        .limit(1);

      if (!rows.length) {
        return { allowed: true, retryAfterSeconds: 0 };
      }

      const record = rows[0];

      if (record.blockedUntil && record.blockedUntil > now) {
        const retryAfterSeconds = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000);
        return { allowed: false, retryAfterSeconds };
      }

      if (now.getTime() - record.firstAttemptAt.getTime() > windowMs) {
        await db
          .update(schema.loginRateLimits)
          .set({ attempts: 0, firstAttemptAt: now, blockedUntil: null, updatedAt: now })
          .where(eq(schema.loginRateLimits.id, key));
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (record.attempts >= maxAttempts) {
        const blockedUntil = new Date(now.getTime() + blockMs);
        await db
          .update(schema.loginRateLimits)
          .set({ blockedUntil, updatedAt: now })
          .where(eq(schema.loginRateLimits.id, key));
        const retryAfterSeconds = Math.ceil(blockMs / 1000);
        return { allowed: false, retryAfterSeconds };
      }

      return { allowed: true, retryAfterSeconds: 0 };
    } catch (error) {
      console.error('UserRepository.checkRateLimit error:', error);
      return { allowed: true, retryAfterSeconds: 0 };
    }
  }

  public async recordFailedAttempt(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000, blockMs = 15 * 60 * 1000) {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(schema.loginRateLimits)
        .where(eq(schema.loginRateLimits.id, key))
        .limit(1);

      if (!rows.length) {
        await db.insert(schema.loginRateLimits).values({
          id: key,
          attempts: 1,
          firstAttemptAt: now,
          updatedAt: now,
        });
        return;
      }

      const record = rows[0];
      if (now.getTime() - record.firstAttemptAt.getTime() > windowMs) {
        await db
          .update(schema.loginRateLimits)
          .set({ attempts: 1, firstAttemptAt: now, blockedUntil: null, updatedAt: now })
          .where(eq(schema.loginRateLimits.id, key));
        return;
      }

      const newAttempts = record.attempts + 1;
      let blockedUntil = record.blockedUntil;
      if (newAttempts >= maxAttempts) {
        blockedUntil = new Date(now.getTime() + blockMs);
      }

      await db
        .update(schema.loginRateLimits)
        .set({ attempts: newAttempts, blockedUntil, updatedAt: now })
        .where(eq(schema.loginRateLimits.id, key));
    } catch (error) {
      console.error('UserRepository.recordFailedAttempt error:', error);
    }
  }

  public async clearRateLimit(key: string) {
    try {
      await db
        .delete(schema.loginRateLimits)
        .where(eq(schema.loginRateLimits.id, key));
    } catch (error) {
      console.error('UserRepository.clearRateLimit error:', error);
    }
  }
}

export const userRepository = new UserRepository();
