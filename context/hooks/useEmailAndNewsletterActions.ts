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
  const sendEmail = async (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => {
    try {
      const res = await fetch('/api/admin/email/custom-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      
      setEmailLogs((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Send Failed', message: err.message });
      return null;
    }
  };

  const sendBatchEmails = async (emails: Omit<EmailLog, 'id' | 'sentAt' | 'status'>[]): Promise<number> => {
    // For batching, we'll just loop for now or implement a dedicated bulk API if needed
    let successCount = 0;
    for (const email of emails) {
      const res = await sendEmail(email);
      if (res) successCount++;
    }
    return successCount;
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
      lastLogin: new Date().toLocaleString(),
      lastIp: '49.36.120.45',
    };

    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  };

  const updateEmailSettings = async (newSettings: Partial<EmailSettings>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSettings: newSettings }),
      });
      if (!res.ok) throw new Error('Failed to update email settings');
      
      setEmailSettings((prev) => ({
        ...prev,
        ...newSettings,
        smtp: newSettings.smtp ? { ...prev.smtp, ...newSettings.smtp } : prev.smtp,
      }));
      addToast({
        type: 'success',
        title: 'Email Settings Saved',
        message: 'SMTP credentials and delivery preferences have been updated on server.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  const addEmailTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'lastUpdated'>): Promise<EmailTemplate | null> => {
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');
      
      setEmailTemplates((prev) => [data, ...prev]);
      addToast({ type: 'success', title: 'Template Created', message: `"${data.name}" added.` });
      return data;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Creation Failed', message: err.message });
      return null;
    }
  };

  const updateEmailTemplate = async (updated: EmailTemplate) => {
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update template');
      
      setEmailTemplates((prev) => prev.map((t) => (t.id === updated.id ? data : t)));
      addToast({ type: 'success', title: 'Template Updated', message: `"${updated.name}" has been saved.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message });
    }
  };

  const deleteEmailTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      
      setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
      addToast({ type: 'info', title: 'Template Deleted', message: 'The template was removed from server.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Deletion Failed', message: err.message });
    }
  };

  const resetEmailTemplates = () => {
    // For demo/reset, we could have a reset API or just re-upload INITIAL_EMAIL_TEMPLATES
    addToast({ type: 'info', title: 'Not Implemented', message: 'Resetting templates is restricted in production.' });
  };

  const createNewsletterCampaign = async (
    campaignData: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>
  ): Promise<NewsletterCampaign | null> => {
    try {
      const res = await fetch('/api/admin/email/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
      
      setNewsletters((prev) => [data, ...prev]);
      addToast({ type: 'success', title: 'Campaign Created', message: `"${data.subject}" saved.` });
      return data;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Creation Failed', message: err.message });
      return null;
    }
  };

  const sendNewsletterCampaign = async (
    campaignId: string
  ): Promise<{ success: boolean; recipientCount: number; message: string }> => {
    try {
      const res = await fetch(`/api/admin/email/newsletters/${campaignId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send campaign');
      
      // Update local state to reflect sent status
      setNewsletters((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status: 'sent', sentCount: data.recipientCount } : c)));
      
      addToast({
        type: 'success',
        title: '🚀 Newsletter Dispatched!',
        message: data.message,
      });
      return data;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Send Failed', message: err.message });
      return { success: false, recipientCount: 0, message: err.message };
    }
  };

  const deleteNewsletterCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email/newsletters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete campaign');
      setNewsletters((prev) => prev.filter((c) => c.id !== id));
      addToast({ type: 'info', title: 'Campaign Removed', message: 'Campaign has been deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Deletion Failed', message: err.message });
    }
  };

  const testSmtpConnection = async (
    config?: EmailSmtpConfig
  ): Promise<{ success: boolean; message: string; latencyMs: number }> => {
    try {
      const res = await fetch('/api/admin/email/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err.message, latencyMs: 0 };
    }
  };

  const unsubscribeEmail = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to unsubscribe');
      
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, emailSubscribed: false } : u))
      );
      addToast({ type: 'info', title: 'Unsubscribed', message: `${email} has been unsubscribed.` });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
      return false;
    }
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
