import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, desc } from '@/src/db/pg-orm';
import { ReportItem, ModerationRule } from '@/lib/types';

export class ModerationRepository {
  private mapRowToReport(row: typeof schema.abuseReports.$inferSelect): ReportItem {
    return {
      id: row.id,
      type: row.type as any,
      targetId: row.targetId,
      targetTitle: row.targetTitle,
      reportedBy: row.reportedBy,
      reportedByName: row.reportedBy || 'User',
      reason: row.reason as any,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      status: row.status as any,
      actionTaken: row.actionTaken || undefined,
    };
  }

  private mapRowToRule(row: typeof schema.moderationRules.$inferSelect): ModerationRule {
    return {
      id: row.id,
      title: row.title,
      type: row.type as any,
      action: row.action as any,
      keywords: (row.keywords as string[]) || [],
      threshold: row.threshold ? Number(row.threshold) : undefined,
      isActive: row.isActive,
    };
  }

  public async findAllReports(limit = 500, offset = 0): Promise<ReportItem[]> {
    try {
      const safeLimit = Math.min(Math.max(1, Number(limit) || 500), 1000);
      const safeOffset = Math.max(0, Number(offset) || 0);
      const rows = await db
        .select()
        .from(schema.abuseReports)
        .orderBy(desc(schema.abuseReports.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);
      return rows.map((r) => this.mapRowToReport(r));
    } catch (error) {
      console.error('ModerationRepository.findAllReports error:', error);
      throw new Error('Failed to find abuse reports', { cause: error });
    }
  }

  public async createReport(data: {
    id: string;
    type: string;
    targetId: string;
    targetTitle: string;
    reportedBy: string;
    reason: string;
    notes: string;
  }): Promise<ReportItem> {
    try {
      const inserted = await db
        .insert(schema.abuseReports)
        .values({
          id: data.id,
          type: data.type,
          targetId: data.targetId,
          targetTitle: data.targetTitle,
          reportedBy: data.reportedBy,
          reason: data.reason,
          notes: data.notes,
          status: 'pending',
        })
        .returning();

      return this.mapRowToReport(inserted[0]);
    } catch (error) {
      console.error('ModerationRepository.createReport error:', error);
      throw new Error('Failed to create abuse report', { cause: error });
    }
  }

  public async updateReportStatus(id: string, status: string, actionTaken?: string): Promise<boolean> {
    try {
      const res = await db
        .update(schema.abuseReports)
        .set({
          status,
          actionTaken: actionTaken || null,
        })
        .where(eq(schema.abuseReports.id, id))
        .returning({ id: schema.abuseReports.id });

      return res.length > 0;
    } catch (error) {
      console.error(`ModerationRepository.updateReportStatus error for ${id}:`, error);
      throw new Error(`Failed to update report ${id}`, { cause: error });
    }
  }

  public async findAllRules(limit = 200, offset = 0): Promise<ModerationRule[]> {
    try {
      const safeLimit = Math.min(Math.max(1, Number(limit) || 200), 1000);
      const safeOffset = Math.max(0, Number(offset) || 0);
      const rows = await db.select().from(schema.moderationRules).limit(safeLimit).offset(safeOffset);
      return rows.map((r) => this.mapRowToRule(r));
    } catch (error) {
      console.error('ModerationRepository.findAllRules error:', error);
      return [];
    }
  }

  public async createRule(data: {
    id: string;
    title: string;
    type: string;
    action: string;
    keywords?: string[];
    threshold?: number;
  }): Promise<ModerationRule> {
    try {
      const inserted = await db
        .insert(schema.moderationRules)
        .values({
          id: data.id,
          title: data.title,
          type: data.type,
          action: data.action,
          keywords: data.keywords || [],
          threshold: data.threshold ? String(data.threshold) : null,
          isActive: true,
        })
        .returning();

      return this.mapRowToRule(inserted[0]);
    } catch (error) {
      console.error('ModerationRepository.createRule error:', error);
      throw new Error('Failed to create moderation rule', { cause: error });
    }
  }

  public async updateRule(id: string, data: Partial<typeof schema.moderationRules.$inferInsert>): Promise<ModerationRule | null> {
    try {
      const updated = await db
        .update(schema.moderationRules)
        .set(data)
        .where(eq(schema.moderationRules.id, id))
        .returning();

      return updated[0] ? this.mapRowToRule(updated[0]) : null;
    } catch (error) {
      console.error(`ModerationRepository.updateRule error for ${id}:`, error);
      throw new Error(`Failed to update moderation rule ${id}`, { cause: error });
    }
  }

  public async deleteRule(id: string): Promise<boolean> {
    try {
      const res = await db.delete(schema.moderationRules).where(eq(schema.moderationRules.id, id)).returning({ id: schema.moderationRules.id });
      return res.length > 0;
    } catch (error) {
      console.error(`ModerationRepository.deleteRule error for ${id}:`, error);
      throw new Error(`Failed to delete moderation rule ${id}`, { cause: error });
    }
  }
}

export const moderationRepository = new ModerationRepository();
