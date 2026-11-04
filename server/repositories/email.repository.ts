import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { desc, eq } from '@/src/db/pg-orm';
import { EmailTemplate, EmailLog, NewsletterCampaign } from '@/lib/types';

export class EmailRepository {
  private mapRowToTemplate(row: typeof schema.emailTemplates.$inferSelect): EmailTemplate {
    const rawVars = (row.variables as any[]) || [];
    const variables = rawVars.map((v) =>
      typeof v === 'string'
        ? { key: v, label: v, sample: `Sample ${v}` }
        : { key: v.key || 'key', label: v.label || v.key || 'label', sample: v.sample || '' }
    );

    return {
      id: row.id,
      name: row.name,
      category: row.category as any,
      description: (row as any).description || '',
      subject: row.subject,
      bodyHtml: row.bodyHtml,
      bodyText: row.bodyText,
      actionLabel: row.actionLabel || undefined,
      actionUrl: row.actionUrl || undefined,
      variables,
      isActive: row.isActive,
      isSystemDefault: row.isSystemDefault,
      lastUpdated: row.updatedAt.toISOString().split('T')[0],
    };
  }

  private mapRowToLog(row: typeof schema.emailLogs.$inferSelect): EmailLog {
    return {
      id: row.id,
      toEmail: row.toEmail,
      toName: row.toName,
      subject: row.subject,
      body: row.body,
      sentAt: row.sentAt.toISOString(),
      status: row.status as any,
      type: row.type as any,
      listingId: row.listingId || undefined,
      relatedUserId: row.relatedUserId || undefined,
    };
  }

  private mapRowToCampaign(row: typeof schema.newsletterCampaigns.$inferSelect): NewsletterCampaign {
    return {
      id: row.id,
      title: row.title,
      subject: row.subject,
      previewText: row.previewText || '',
      contentHtml: row.contentHtml,
      targetAudience: row.targetAudience as any,
      targetCity: row.targetCity || undefined,
      targetState: row.targetState || undefined,
      status: row.status as any,
      targetCount: row.targetCount,
      sentCount: row.sentCount,
      deliveredCount: row.deliveredCount,
      openedCount: row.openedCount,
      clickedCount: row.clickedCount,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt ? row.sentAt.toISOString() : undefined,
    };
  }

  public async findAllTemplates(): Promise<EmailTemplate[]> {
    try {
      const rows = await db.select().from(schema.emailTemplates).orderBy(schema.emailTemplates.category);
      return rows.map((r) => this.mapRowToTemplate(r));
    } catch (error) {
      console.error('EmailRepository.findAllTemplates error:', error);
      return [];
    }
  }

  public async findTemplateById(id: string): Promise<EmailTemplate | null> {
    try {
      const rows = await db.select().from(schema.emailTemplates).where(eq(schema.emailTemplates.id, id)).limit(1);
      return rows[0] ? this.mapRowToTemplate(rows[0]) : null;
    } catch (error) {
      console.error(`EmailRepository.findTemplateById error for ${id}:`, error);
      return null;
    }
  }

  public async updateTemplate(id: string, data: Partial<typeof schema.emailTemplates.$inferInsert>): Promise<EmailTemplate | null> {
    try {
      const updated = await db
        .update(schema.emailTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.emailTemplates.id, id))
        .returning();

      return updated[0] ? this.mapRowToTemplate(updated[0]) : null;
    } catch (error) {
      console.error(`EmailRepository.updateTemplate error for ${id}:`, error);
      throw new Error(`Failed to update email template ${id}`, { cause: error });
    }
  }

  public async logEmail(data: {
    id: string;
    toEmail: string;
    toName: string;
    subject: string;
    body: string;
    status: string;
    type: string;
    listingId?: string;
    relatedUserId?: string;
  }): Promise<EmailLog> {
    try {
      const inserted = await db
        .insert(schema.emailLogs)
        .values({
          id: data.id,
          toEmail: data.toEmail,
          toName: data.toName,
          subject: data.subject,
          body: data.body,
          status: data.status,
          type: data.type,
          listingId: data.listingId || null,
          relatedUserId: data.relatedUserId || null,
        })
        .returning();

      return this.mapRowToLog(inserted[0]);
    } catch (error) {
      console.error('EmailRepository.logEmail error:', error);
      throw new Error('Failed to log email in PostgreSQL', { cause: error });
    }
  }

  public async findAllLogs(limit = 100): Promise<EmailLog[]> {
    try {
      const rows = await db
        .select()
        .from(schema.emailLogs)
        .orderBy(desc(schema.emailLogs.sentAt))
        .limit(limit);

      return rows.map((r) => this.mapRowToLog(r));
    } catch (error) {
      console.error('EmailRepository.findAllLogs error:', error);
      return [];
    }
  }

  public async findAllCampaigns(): Promise<NewsletterCampaign[]> {
    try {
      const rows = await db.select().from(schema.newsletterCampaigns).orderBy(desc(schema.newsletterCampaigns.createdAt));
      return rows.map((r) => this.mapRowToCampaign(r));
    } catch (error) {
      console.error('EmailRepository.findAllCampaigns error:', error);
      return [];
    }
  }

  public async createCampaign(data: {
    id: string;
    title: string;
    subject: string;
    previewText?: string;
    contentHtml: string;
    targetAudience: string;
    targetCity?: string;
    targetState?: string;
    status?: string;
    targetCount?: number;
    createdBy?: string;
  }): Promise<NewsletterCampaign> {
    try {
      const inserted = await db
        .insert(schema.newsletterCampaigns)
        .values({
          id: data.id,
          title: data.title,
          subject: data.subject,
          previewText: data.previewText || null,
          contentHtml: data.contentHtml,
          targetAudience: data.targetAudience,
          targetCity: data.targetCity || null,
          targetState: data.targetState || null,
          status: data.status || 'draft',
          targetCount: data.targetCount || 0,
          createdBy: data.createdBy || null,
        })
        .returning();

      return this.mapRowToCampaign(inserted[0]);
    } catch (error) {
      console.error('EmailRepository.createCampaign error:', error);
      throw new Error('Failed to create newsletter campaign', { cause: error });
    }
  }
}

export const emailRepository = new EmailRepository();
