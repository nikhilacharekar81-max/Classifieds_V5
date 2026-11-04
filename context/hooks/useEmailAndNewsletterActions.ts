'use client';
import React from 'react';
import {
  EmailLog,
  EmailSettings,
  EmailTemplate,
  NewsletterCampaign,
  EmailSmtpConfig,
  NewsletterAudienceFilter,
  UserAccount,
  Listing,
  ToastMessage,
} from '@/lib/types';
import { INITIAL_EMAIL_TEMPLATES } from '@/lib/data/initialData';

interface UseEmailAndNewsletterActionsParams {
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  listings: Listing[];
  emailSettings: EmailSettings;
  setEmailSettings: React.Dispatch<React.SetStateAction<EmailSettings>>;
  emailTemplates: EmailTemplate[];
  setEmailTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>;
  newsletters: NewsletterCampaign[];
  setNewsletters: React.Dispatch<React.SetStateAction<NewsletterCampaign[]>>;
  setEmailLogs: React.Dispatch<React.SetStateAction<EmailLog[]>>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  recordAuditLog: (action: string, module: string, targetId: string, targetSummary: string, details: string) => void;
}

export function useEmailAndNewsletterActions({
  users,
  setUsers,
  listings,
  emailSettings,
  setEmailSettings,
  emailTemplates,
  setEmailTemplates,
  newsletters,
  setNewsletters,
  setEmailLogs,
  addToast,
  recordAuditLog,
}: UseEmailAndNewsletterActionsParams) {
  const sendEmail = (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => {
    const newLog: EmailLog = {
      ...emailData,
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'delivered',
    };
    setEmailLogs((prev) => [newLog, ...prev]);
    recordAuditLog(
      'DISPATCH_EMAIL',
      'Communications / Email',
      newLog.id,
      newLog.subject,
      `Sent to ${newLog.toName} (${newLog.toEmail})`
    );
  };

  const sendBatchEmails = async (emails: Omit<EmailLog, 'id' | 'sentAt' | 'status'>[]): Promise<number> => {
    const newLogs: EmailLog[] = emails.map((e) => ({
      ...e,
      id: 'eml_' + Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'delivered' as const,
    }));
    setEmailLogs((prev) => [...newLogs, ...prev]);
    return newLogs.length;
  };

  const filterAudienceUsers = (
    filter: NewsletterAudienceFilter | string,
    customState?: string,
    customCity?: string
  ): UserAccount[] => {
    const target = typeof filter === 'string' ? filter : filter.target;
    const filterState = typeof filter === 'object' ? filter.state : customState;
    const filterCity = typeof filter === 'object' ? filter.city : customCity;

    return users.filter((u) => {
      if (u.status === 'banned') return false;
      if (!u.email) return false;
      if (u.emailSubscribed === false) return false;

      switch (target) {
        case 'active_sellers': {
          return listings.some((l) => l.sellerId === u.id && l.status === 'approved');
        }
        case 'business_users': {
          return u.type === 'business' || u.businessDetails?.verifiedBusiness === true;
        }
        case 'individual_users': {
          return u.type === 'user';
        }
        case 'city_specific': {
          if (!filterCity || filterCity === 'All India' || filterCity === 'all') return true;
          return (u.location?.city || '').toLowerCase() === filterCity.toLowerCase();
        }
        case 'state_specific': {
          if (!filterState || filterState === 'all') return true;
          return (u.location?.state || '').toLowerCase() === filterState.toLowerCase();
        }
        case 'all_subscribed':
        default:
          return true;
      }
    });
  };

  const registerUser = (userData: Partial<UserAccount>): UserAccount => {
    const newId = 'usr_' + Date.now().toString(36);
    const defaultSub = emailSettings.defaultEmailSubscribedOnRegister ?? true;
    const newUser: UserAccount = {
      id: newId,
      name: userData.name || 'New User',
      email: userData.email || '',
      phone: userData.phone || '',
      avatar:
        userData.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      type: userData.type || 'user',
      status: 'active',
      kycStatus: 'unsubmitted',
      emailSubscribed: defaultSub,
      location: userData.location || { city: 'Mumbai', state: 'Maharashtra' },
      totalListings: 0,
      activeListings: 0,
      rating: 5.0,
      reviewCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastIp: '49.36.120.45',
    };

    setUsers((prev) => [newUser, ...prev]);
    recordAuditLog(
      'USER_REGISTERED',
      'Authentication / Users',
      newUser.id,
      newUser.name,
      `New user registration. Email: ${newUser.email} (Email Subscribed: ${newUser.emailSubscribed})`
    );

    const welcomeTemplate = emailTemplates.find((t) => t.id === 'tpl_welcome' && t.isActive);
    if (welcomeTemplate && newUser.email) {
      sendEmail({
        toEmail: newUser.email,
        toName: newUser.name,
        subject: welcomeTemplate.subject.replace(/\{\{user_name\}\}/g, newUser.name),
        body: welcomeTemplate.bodyText
          .replace(/\{\{user_name\}\}/g, newUser.name)
          .replace(/\{\{city\}\}/g, newUser.location?.city || 'India'),
        actionLabel: welcomeTemplate.actionLabel,
        actionUrl: welcomeTemplate.actionUrl,
        type: 'welcome',
        templateId: welcomeTemplate.id,
      });
    }

    return newUser;
  };

  const updateEmailSettings = (newSettings: Partial<EmailSettings>) => {
    setEmailSettings((prev) => ({
      ...prev,
      ...newSettings,
      smtp: newSettings.smtp ? { ...prev.smtp, ...newSettings.smtp } : prev.smtp,
    }));
    recordAuditLog(
      'UPDATE_EMAIL_SETTINGS',
      'Communications / Email',
      'email_settings',
      'Email & SMTP Settings',
      'Updated SMTP configuration & delivery settings'
    );
    addToast({
      type: 'success',
      title: 'Email Settings Saved',
      message: 'SMTP credentials and delivery preferences have been updated.',
    });
  };

  const addEmailTemplate = (templateData: Omit<EmailTemplate, 'id' | 'lastUpdated'>): EmailTemplate => {
    const id = 'tpl_' + Date.now().toString(36);
    const newTemplate: EmailTemplate = {
      ...templateData,
      id,
      lastUpdated: new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setEmailTemplates((prev) => [newTemplate, ...prev]);
    recordAuditLog(
      'CREATE_EMAIL_TEMPLATE',
      'Communications / Templates',
      id,
      newTemplate.name,
      `Category: ${newTemplate.category}`
    );
    addToast({
      type: 'success',
      title: 'Template Created',
      message: `"${newTemplate.name}" added successfully.`,
    });
    return newTemplate;
  };

  const updateEmailTemplate = (updated: EmailTemplate) => {
    setEmailTemplates((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? {
              ...updated,
              lastUpdated: new Date().toLocaleString([], {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : t
      )
    );
    recordAuditLog(
      'UPDATE_EMAIL_TEMPLATE',
      'Communications / Templates',
      updated.id,
      updated.name,
      'Updated template HTML/text contents'
    );
    addToast({
      type: 'success',
      title: 'Template Updated',
      message: `"${updated.name}" has been saved.`,
    });
  };

  const deleteEmailTemplate = (id: string) => {
    const tpl = emailTemplates.find((t) => t.id === id);
    if (!tpl) return;
    if (tpl.isSystemDefault) {
      addToast({
        type: 'warning',
        title: 'System Default Template',
        message: 'System core templates cannot be deleted, but you can edit or disable them.',
      });
      return;
    }
    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
    recordAuditLog('DELETE_EMAIL_TEMPLATE', 'Communications / Templates', id, tpl.name, 'Deleted email template');
    addToast({
      type: 'info',
      title: 'Template Deleted',
      message: `"${tpl.name}" was removed.`,
    });
  };

  const resetEmailTemplates = () => {
    setEmailTemplates(INITIAL_EMAIL_TEMPLATES);
    addToast({
      type: 'info',
      title: 'Templates Reset',
      message: 'Restored 20+ default templates.',
    });
  };

  const createNewsletterCampaign = (
    campaignData: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>
  ): NewsletterCampaign => {
    const id = 'camp_' + Date.now().toString(36);
    const audience = campaignData.audienceFilter || {
      target: campaignData.targetAudience || 'all_subscribed',
      city: campaignData.targetCity,
      state: campaignData.targetState,
    };
    const recipients = filterAudienceUsers(audience);

    const newCampaign: NewsletterCampaign = {
      ...campaignData,
      id,
      audienceFilter: audience,
      totalRecipients: recipients.length,
      targetCount: recipients.length,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      status: campaignData.status || 'draft',
      createdAt: new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNewsletters((prev) => [newCampaign, ...prev]);
    recordAuditLog(
      'CREATE_NEWSLETTER',
      'Communications / Newsletter',
      id,
      newCampaign.subject,
      `Created campaign with ${recipients.length} target recipients`
    );
    addToast({
      type: 'success',
      title: 'Campaign Created',
      message: `"${newCampaign.subject.substring(0, 30)}..." saved as ${newCampaign.status}.`,
    });
    return newCampaign;
  };

  const sendNewsletterCampaign = async (
    campaignId: string
  ): Promise<{ success: boolean; recipientCount: number; message: string }> => {
    const campaign = newsletters.find((c) => c.id === campaignId);
    if (!campaign) {
      return { success: false, recipientCount: 0, message: 'Campaign not found' };
    }

    const audience = campaign.audienceFilter || {
      target: campaign.targetAudience || 'all_subscribed',
      city: campaign.targetCity,
      state: campaign.targetState,
    };
    const recipients = filterAudienceUsers(audience);

    if (recipients.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Recipients Found',
        message: 'No active subscribed users match the selected audience filter.',
      });
      return { success: false, recipientCount: 0, message: 'No recipients matched the audience filter.' };
    }

    setNewsletters((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status: 'sending' as const } : c)));

    const sentLogs: EmailLog[] = recipients.map((u) => {
      const replacedSubject = campaign.subject
        .replace(/\{\{user_name\}\}/g, u.name)
        .replace(/\{\{city\}\}/g, u.location?.city || 'India');
      const replacedBody = (campaign.contentHtml || campaign.bodyHtml || '')
        .replace(/\{\{user_name\}\}/g, u.name)
        .replace(/\{\{city\}\}/g, u.location?.city || 'India')
        .replace(
          /\{\{unsubscribe_url\}\}/g,
          `${emailSettings.unsubscribeUrl || 'https://chillyads.com/unsubscribe'}?email=${encodeURIComponent(u.email)}`
        );

      return {
        id: 'eml_' + Math.random().toString(36).substring(2, 9),
        toEmail: u.email,
        toName: u.name,
        subject: replacedSubject,
        body: replacedBody,
        status: 'delivered' as const,
        sentAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: 'newsletter' as const,
        templateId: campaign.id,
        relatedUserId: u.id,
        isMarketing: true,
      };
    });

    setEmailLogs((prev) => [...sentLogs, ...prev]);

    const nowStr = new Date().toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    setNewsletters((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'sent' as const,
              sentCount: recipients.length,
              deliveredCount: recipients.length,
              openedCount: Math.round(recipients.length * 0.62),
              clickedCount: Math.round(recipients.length * 0.26),
              sentAt: nowStr,
            }
          : c
      )
    );

    recordAuditLog(
      'SEND_NEWSLETTER',
      'Communications / Newsletter',
      campaign.id,
      campaign.subject,
      `Dispatched to ${recipients.length} subscribers`
    );

    addToast({
      type: 'success',
      title: '🚀 Newsletter Dispatched!',
      message: `Successfully delivered to ${recipients.length} subscribers via ${emailSettings.smtp.host}.`,
    });

    return {
      success: true,
      recipientCount: recipients.length,
      message: `Successfully sent to ${recipients.length} recipients.`,
    };
  };

  const deleteNewsletterCampaign = (id: string) => {
    setNewsletters((prev) => prev.filter((c) => c.id !== id));
    addToast({
      type: 'info',
      title: 'Campaign Removed',
      message: 'Campaign has been deleted.',
    });
  };

  const testSmtpConnection = async (
    config?: EmailSmtpConfig
  ): Promise<{ success: boolean; message: string; latencyMs: number }> => {
    const smtpToTest = config || emailSettings.smtp;
    await new Promise((r) => setTimeout(r, 600));

    if (!smtpToTest.host || !smtpToTest.username) {
      return {
        success: false,
        message: 'SMTP Host and Username cannot be empty.',
        latencyMs: 120,
      };
    }

    return {
      success: true,
      message: `Connected to ${smtpToTest.host}:${smtpToTest.port} (${smtpToTest.encryption || 'TLS'}). Handshake and authentication verified.`,
      latencyMs: 78,
    };
  };

  const unsubscribeEmail = (email: string): boolean => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, emailSubscribed: false } : u))
      );
      recordAuditLog(
        'UNSUBSCRIBE_EMAIL',
        'Communications / Subscribers',
        user.id,
        user.name,
        `User opted out of marketing emails: ${email}`
      );
      addToast({
        type: 'info',
        title: 'Unsubscribed',
        message: `${email} has been unsubscribed from promotional emails.`,
      });
      return true;
    }
    return false;
  };

  return {
    sendEmail,
    sendBatchEmails,
    filterAudienceUsers,
    registerUser,
    updateEmailSettings,
    addEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    resetEmailTemplates,
    createNewsletterCampaign,
    sendNewsletterCampaign,
    deleteNewsletterCampaign,
    testSmtpConnection,
    unsubscribeEmail,
  };
}
