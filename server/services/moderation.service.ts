import { moderationRepository } from '@/server/repositories/moderation.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { invalidateLiveListingCountsCache } from '@/server/cache/reference-data.cache';
import { ReportItem, ModerationRule } from '@/lib/types';

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
      adminName: actor?.name || 'Moderator',
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
      adminName: actor?.name || 'Moderator',
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
}

export const moderationService = new ModerationService();
