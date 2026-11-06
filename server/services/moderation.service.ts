import { moderationRepository } from '@/server/repositories/moderation.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { invalidateLiveListingCountsCache } from '@/server/cache/reference-data.cache';
import { ReportItem, ModerationRule } from '@/lib/types';
import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, desc, and } from '@/src/db/pg-orm';

export class ModerationService {
  public async getReports(statusFilter?: string): Promise<ReportItem[]> {
    const all = await moderationRepository.findAllReports();
    if (statusFilter && statusFilter !== 'all') {
      return all.filter((r) => r.status === statusFilter);
    }
    return all;
  }

  public async submitReport(data: {
    type: 'listing' | 'user' | 'message';
    targetId: string;
    targetTitle: string;
    reportedBy: string;
    reason: string;
    notes: string;
  }): Promise<ReportItem> {
    const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return await moderationRepository.createReport({
      id,
      type: data.type,
      targetId: data.targetId,
      targetTitle: data.targetTitle,
      reportedBy: data.reportedBy,
      reason: data.reason,
      notes: data.notes,
    });
  }

  public async actionReport(
    reportId: string,
    actionNote: string,
    actionType: 'actioned' | 'dismissed',
    targetListingId?: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const success = await moderationRepository.updateReportStatus(reportId, actionType, actionNote);
    if (!success) return false;

    if (actionType === 'actioned' && targetListingId) {
      const updatedListing = await listingRepository.update(targetListingId, {
        status: 'rejected',
        rejectionReason: `Actioned report: ${actionNote}`,
      });
      if (updatedListing) {
        await invalidateLiveListingCountsCache();
      }
    }

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: actionType === 'actioned' ? 'REPORT_ACTIONED' : 'REPORT_DISMISSED',
      module: 'Moderation',
      targetId: reportId,
      targetSummary: `Report ${reportId}`,
      details: `Action: ${actionType}. Note: ${actionNote}`,
      ipAddress: actor?.ipAddress || 'unknown',
    });

    return true;
  }

  // Rules
  public async getRules(): Promise<ModerationRule[]> {
    return await moderationRepository.findAllRules();
  }

  public async addRule(
    ruleData: Omit<ModerationRule, 'id'>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<ModerationRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const rule = await moderationRepository.createRule({
      id,
      title: ruleData.title,
      type: ruleData.type,
      action: ruleData.action,
      keywords: ruleData.keywords,
      threshold: ruleData.threshold,
    });

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: 'RULE_CREATED',
      module: 'Moderation',
      targetId: id,
      targetSummary: rule.title,
      details: `Added moderation rule ${rule.title}`,
      ipAddress: actor?.ipAddress || 'unknown',
    });

    return rule;
  }

  public async toggleRule(id: string): Promise<boolean> {
    const rules = await moderationRepository.findAllRules();
    const rule = rules.find((r) => r.id === id);
    if (!rule) return false;

    const updated = await moderationRepository.updateRule(id, { isActive: !rule.isActive });
    return updated ? updated.isActive : false;
  }

  public async getBanAppeals(statusFilter?: string): Promise<any[]> {
    try {
      const rows = await db.select().from(schema.banAppeals).orderBy(desc(schema.banAppeals.createdAt));
      if (statusFilter && statusFilter !== 'all') {
        return rows.filter((r) => r.status === statusFilter);
      }
      return rows;
    } catch (error) {
      console.error('ModerationService.getBanAppeals error:', error);
      return [];
    }
  }

  public async reviewBanAppeal(params: {
    appealId: string;
    decision: 'accepted' | 'rejected';
    reviewNotes: string;
    unbanUser?: boolean;
    actor?: { id?: string; name?: string; ipAddress?: string };
  }): Promise<boolean> {
    const { appealId, decision, reviewNotes, unbanUser, actor } = params;
    try {
      return await db.transaction(async (tx) => {
        const appealRows = await tx
          .select()
          .from(schema.banAppeals)
          .where(and(eq(schema.banAppeals.id, appealId), eq(schema.banAppeals.status, 'pending')))
          .limit(1);

        if (!appealRows.length) return false;
        const appeal = appealRows[0];

        const updated = await tx
          .update(schema.banAppeals)
          .set({
            status: decision,
            reviewedBy: actor?.id || 'staff',
            reviewNotes: reviewNotes || `Decision: ${decision}`,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.banAppeals.id, appealId), eq(schema.banAppeals.status, 'pending')));

        if (updated.length === 0) return false;

        if (decision === 'accepted' && unbanUser) {
          await tx
            .update(schema.users)
            .set({ status: 'active', banReason: null, updatedAt: new Date() })
            .where(eq(schema.users.id, appeal.userId));
        }

        await adminRepository.createAuditLog({
          adminId: actor?.id || 'system',
          adminName: actor?.name || 'System',
          action: 'BAN_APPEAL_REVIEWED',
          module: 'Moderation',
          targetId: appealId,
          targetSummary: `Appeal for ${appeal.userEmail}`,
          details: `Decision: ${decision}. Notes: ${reviewNotes}. Unbanned: ${Boolean(unbanUser)}`,
          ipAddress: actor?.ipAddress || 'unknown',
        }, tx);

        return true;
      });
    } catch (error) {
      console.error('ModerationService.reviewBanAppeal error:', error);
      return false;
    }
  }
}

export const moderationService = new ModerationService();
