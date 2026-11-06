import { emailRepository } from '@/server/repositories/email.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import {
  EmailTemplate,
  EmailLog,
  NewsletterCampaign,
  EmailSettings,
  EmailSmtpConfig,
  NewsletterAudienceFilter,
  UserAccount,
} from '@/lib/types';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class EmailService {
  public async getTemplates(): Promise<EmailTemplate[]> {
    return await emailRepository.findAllTemplates();
  }

  public async getTemplateById(id: string): Promise<EmailTemplate | null> {
    return await emailRepository.findTemplateById(id);
  }

  public async updateTemplate(
    id: string, 
    updatedData: Partial<EmailTemplate>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<EmailTemplate | null> {
    const fields: any = {};
    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.subject !== undefined) fields.subject = updatedData.subject;
    if (updatedData.bodyHtml !== undefined) fields.bodyHtml = updatedData.bodyHtml;
    if (updatedData.bodyText !== undefined) fields.bodyText = updatedData.bodyText;
    if (updatedData.actionLabel !== undefined) fields.actionLabel = updatedData.actionLabel;
    if (updatedData.actionUrl !== undefined) fields.actionUrl = updatedData.actionUrl;
    if (updatedData.isActive !== undefined) fields.isActive = updatedData.isActive;

    const updated = await emailRepository.updateTemplate(id, fields);
    if (updated) {
      await adminRepository.createAuditLog({
        adminId: actor?.id || 'system',
        adminName: actor?.name || 'System',
        action: 'EMAIL_TEMPLATE_UPDATED',
        module: 'Email',
        targetId: id,
        targetSummary: updated.name,
        details: `Updated template ${updated.name}`,
        ipAddress: actor?.ipAddress || 'unknown',
      });
    }
    return updated;
  }

  public async getLogs(): Promise<EmailLog[]> {
    return await emailRepository.findAllLogs();
  }

  public async sendEmail(logData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>): Promise<EmailLog> {
    const id = `eml_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.SMTP_PASSWORD;
    const fromAddress = process.env.SMTP_FROM || process.env.MAIL_FROM || 'noreply@chillyads.com';

    if (!smtpHost || !smtpUser) {
      return await emailRepository.logEmail({
        id,
        toEmail: logData.toEmail,
        toName: logData.toName,
        subject: logData.subject,
        body: logData.body,
        status: 'not_configured',
        type: logData.type,
        listingId: logData.listingId,
        relatedUserId: logData.relatedUserId,
      });
    }

    let isSentSuccess = false;

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 8000,
      });

      const info = await transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Chillyads'}" <${fromAddress}>`,
        to: logData.toName ? `"${logData.toName}" <${logData.toEmail}>` : logData.toEmail,
        subject: logData.subject,
        html: logData.body,
      });

      if (info && (info.messageId || (Array.isArray(info.accepted) && info.accepted.length > 0))) {
        isSentSuccess = true;
      }
    } catch (err: any) {
      console.error('[EmailService] SMTP send error:', err?.message || err);
    }

    return await emailRepository.logEmail({
      id,
      toEmail: logData.toEmail,
      toName: logData.toName,
      subject: logData.subject,
      body: logData.body,
      status: isSentSuccess ? 'delivered' : 'failed',
      type: logData.type,
      listingId: logData.listingId,
      relatedUserId: logData.relatedUserId,
    });
  }

  public async sendCustomEmail(data: {
    toEmail: string;
    toName?: string;
    subject: string;
    body: string;
    type: string;
    listingId?: string;
    relatedUserId?: string;
  }): Promise<EmailLog> {
    return await this.sendEmail({
      toEmail: data.toEmail,
      toName: data.toName || 'User',
      subject: data.subject,
      body: data.body,
      type: data.type as any,
      listingId: data.listingId,
      relatedUserId: data.relatedUserId,
    });
  }

  public async getNewsletters(): Promise<NewsletterCampaign[]> {
    return await emailRepository.findAllCampaigns();
  }

  public async filterAudienceUsers(filter: NewsletterAudienceFilter | string, customState?: string, customCity?: string): Promise<UserAccount[]> {
    const target = typeof filter === 'string' ? filter : filter.target;
    const city = customCity || (typeof filter !== 'string' ? filter.city : undefined);
    const state = customState || (typeof filter !== 'string' ? filter.state : undefined);
    return await emailRepository.findAudienceUsers(target, state, city);
  }

  public async createNewsletterCampaign(data: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>): Promise<NewsletterCampaign> {
    const id = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return await emailRepository.createCampaign({
      id,
      title: data.title || data.subject,
      subject: data.subject,
      previewText: data.previewText,
      contentHtml: data.contentHtml || data.bodyHtml || '',
      targetAudience: data.targetAudience || 'all_subscribed',
      targetCity: data.targetCity,
      targetState: data.targetState,
      status: 'draft',
      targetCount: 0,
    });
  }

  public async sendNewsletterCampaign(
    campaignId: string,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<{ success: boolean; recipientCount: number; message: string }> {
    const campaigns = await emailRepository.findAllCampaigns();
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return { success: false, recipientCount: 0, message: 'Campaign not found' };
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return { success: false, recipientCount: 0, message: `Campaign is already ${campaign.status} and cannot be sent again.` };
    }

    await emailRepository.updateCampaignStatus(campaignId, 'sending');

    const recipients = await this.filterAudienceUsers(campaign.targetAudience || 'all_subscribed', campaign.targetState, campaign.targetCity);
    const count = recipients.length;

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    
    let deliveredCount = 0;
    let failedCount = 0;
    let notConfiguredCount = 0;

    for (const user of recipients) {
      const unsubToken = await userRepository.generateUnsubscribeToken(user.id);
      const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/auth/unsubscribe?token=${unsubToken}`;
      
      const safeName = escapeHtml(user.name);
      const safeCity = escapeHtml(user.location?.city || 'India');

      const personalizedBody = (campaign.contentHtml || '')
        .replace(/\{\{user_name\}\}/g, () => safeName)
        .replace(/\{\{city\}\}/g, () => safeCity)
        .replace(/\{\{unsubscribe_url\}\}/g, () => unsubUrl);

      const personalizedSubject = campaign.subject
        .replace(/\{\{user_name\}\}/g, () => safeName)
        .replace(/\{\{city\}\}/g, () => safeCity);

      const logResult = await this.sendEmail({
        toEmail: user.email,
        toName: user.name,
        subject: personalizedSubject,
        body: personalizedBody,
        type: 'newsletter',
        isMarketing: true,
        relatedUserId: user.id,
      });

      if (logResult.status === 'delivered') {
        deliveredCount++;
      } else if (logResult.status === 'not_configured') {
        notConfiguredCount++;
      } else {
        failedCount++;
      }
    }

    // Honest status reporting:
    // If SMTP was not configured, the campaign cannot be marked 'sent' (no fake success).
    // If all deliveries failed or SMTP wasn't configured, mark as 'failed'.
    // If at least one delivered, mark as 'sent' with actual deliveredCount.
    const finalStatus =
      deliveredCount > 0 ? 'sent' : count === 0 ? 'sent' : 'failed';

    await emailRepository.updateCampaignStatus(campaignId, finalStatus, deliveredCount);

    await adminRepository.createAuditLog({
      adminId: actor?.id || 'system',
      adminName: actor?.name || 'System',
      action: finalStatus === 'sent' ? 'CAMPAIGN_SENT' : 'CAMPAIGN_FAILED',
      module: 'Email',
      targetId: campaignId,
      targetSummary: campaign.subject,
      details: notConfiguredCount > 0
        ? `Broadcast halted: SMTP not configured for ${notConfiguredCount} recipients`
        : `Broadcast completed: ${deliveredCount} delivered, ${failedCount} failed out of ${count} recipients`,
      ipAddress: actor?.ipAddress || 'unknown',
    });

    const isSuccess = finalStatus === 'sent';
    const message = notConfiguredCount > 0
      ? `SMTP is not configured. 0/${count} emails were delivered.`
      : `Newsletter "${campaign.subject}" processed: ${deliveredCount} delivered, ${failedCount} failed.`;

    return {
      success: isSuccess,
      recipientCount: deliveredCount,
      message,
    };
  }

  public async testSmtpConnection(config?: EmailSmtpConfig): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const host = config?.host || process.env.SMTP_HOST || process.env.MAIL_HOST;
    const port = Number(config?.port || process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
    const user = config?.username || process.env.SMTP_USER || process.env.MAIL_USER;
    const pass = config?.password || process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.SMTP_PASSWORD;

    if (!host || !user) {
      return {
        success: false,
        message: 'SMTP credentials are not configured. Set host and user in email settings.',
        latencyMs: 0,
      };
    }

    const startTime = Date.now();
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 5000,
      });

      await transporter.verify();
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: `SMTP handshake and authentication verified for ${host}:${port}.`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: `SMTP verification failed for ${host}:${port}: ${err?.message || 'Connection failed'}`,
        latencyMs,
      };
    }
  }
}

export const emailService = new EmailService();
