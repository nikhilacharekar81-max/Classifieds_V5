'use client';
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  Send,
  LayoutDashboard,
  Settings,
  History,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  Users,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Smartphone,
  Monitor,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Sparkle,
  Layers,
  Building,
  MapPin,
  Flame,
  ArrowRight,
  TrendingUp,
  Inbox,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Server,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import {
  EmailTemplate,
  EmailLog,
  NewsletterCampaign,
  EmailSettings as IEmailSettings,
  NewsletterAudienceFilter,
  NewsletterTargetAudience,
} from '@/lib/types';

export const INDIAN_STATES_AND_CITIES: Record<string, string[]> = {
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Navi Mumbai'],
  Delhi: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini'],
  Karnataka: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davanagere'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Greater Noida', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara'],
  Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Rohtak', 'Hisar'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  Bihar: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
  Andhra_Pradesh: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
};

interface EmailManagementModuleProps {
  initialTab?: 'dashboard' | 'send' | 'templates' | 'settings' | 'logs' | 'campaigns';
}

export const EmailManagementModule: React.FC<EmailManagementModuleProps> = ({
  initialTab = 'dashboard',
}) => {
  const {
    emailLogs,
    emailSettings,
    emailTemplates,
    newsletters,
    users,
    listings,
    sendEmail,
    sendBatchEmails,
    updateEmailSettings,
    addEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    resetEmailTemplates,
    createNewsletterCampaign,
    sendNewsletterCampaign,
    deleteNewsletterCampaign,
    testSmtpConnection,
    filterAudienceUsers,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'send' | 'templates' | 'settings' | 'logs' | 'campaigns'
  >(initialTab);

  // Sync tab if prop changes
  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  // ==========================================
  // 1. DASHBOARD OVERVIEW METRICS
  // ==========================================
  const totalSent = emailLogs.length;
  const totalSubscribers = users.filter((u) => u.emailSubscribed !== false && u.status !== 'banned')
    .length;
  const activeSellersCount = users.filter((u) =>
    listings.some((l) => l.sellerId === u.id && l.status === 'approved')
  ).length;
  const businessUsersCount = users.filter((u) => u.type === 'business').length;
  const recentLogs = emailLogs.slice(0, 6);
  const recentCampaigns = newsletters.slice(0, 4);

  // ==========================================
  // 2. NEWSLETTER COMPOSER STATE
  // ==========================================
  const [composerSubject, setComposerSubject] = useState('');
  const [composerPreviewText, setComposerPreviewText] = useState('');
  const [composerBodyHtml, setComposerBodyHtml] = useState(
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <h2 style="color: #002f34; margin-bottom: 16px;">Exciting Marketplace Updates for You!</h2>
  <p>Hello <strong>{{user_name}}</strong>,</p>
  <p>Discover the latest high-demand verified listings and featured deals currently trending in <strong>{{city}}</strong>.</p>
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #002f34; font-size: 16px;">🌟 Trending Categories Today</h3>
    <ul style="padding-left: 20px; margin-bottom: 0;">
      <li>Cars & Commercial Vehicles</li>
      <li>Smartphones & Electronics</li>
      <li>Apartments & Commercial Properties</li>
    </ul>
  </div>
  <p>Looking to sell something? Post an ad today and reach thousands of verified buyers across India for free.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://chillyads.com" style="background-color: #002f34; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Explore Marketplace Deals</a>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
  <p style="font-size: 12px; color: #64748b; text-align: center;">You received this email because your account is registered on Chillyads.<br /><a href="{{unsubscribe_url}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a></p>
</div>`
  );
  const [composerAudience, setComposerAudience] =
    useState<NewsletterTargetAudience>('all_subscribed');
  const [composerSelectedState, setComposerSelectedState] = useState<string>('Maharashtra');
  const [composerSelectedCity, setComposerSelectedCity] = useState<string>('Mumbai');
  const [composerPreviewMode, setComposerPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [composerEditorMode, setComposerEditorMode] = useState<'visual' | 'code'>('visual');
  const [isSendingConfirmOpen, setIsSendingConfirmOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('admin@chillyads.com');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Template selector inside composer
  const [selectedPresetTemplateId, setSelectedPresetTemplateId] = useState<string>('');

  const audienceFilterObj: NewsletterAudienceFilter = useMemo(() => {
    return {
      target: composerAudience,
      state: composerAudience === 'state_specific' ? composerSelectedState : undefined,
      city: composerAudience === 'city_specific' ? composerSelectedCity : undefined,
    };
  }, [composerAudience, composerSelectedState, composerSelectedCity]);

  const targetRecipients = useMemo(() => {
    return filterAudienceUsers(
      audienceFilterObj,
      composerSelectedState,
      composerSelectedCity
    );
  }, [filterAudienceUsers, audienceFilterObj, composerSelectedState, composerSelectedCity]);

  const availableCitiesForState = useMemo(() => {
    return INDIAN_STATES_AND_CITIES[composerSelectedState] || [];
  }, [composerSelectedState]);

  // Insert rich text or variable tags into composer
  const handleInsertTag = (tag: string) => {
    setComposerBodyHtml((prev) => prev + ` ${tag} `);
  };

  const handleApplyFormatting = (tag: 'b' | 'i' | 'u' | 'h2' | 'h3' | 'p' | 'ul' | 'quote' | 'hr') => {
    let snippet = '';
    switch (tag) {
      case 'b':
        snippet = '<strong>Bold Text</strong>';
        break;
      case 'i':
        snippet = '<em>Italic Text</em>';
        break;
      case 'u':
        snippet = '<u>Underlined Text</u>';
        break;
      case 'h2':
        snippet = '<h2 style="color: #002f34; margin: 16px 0 8px;">Section Heading</h2>';
        break;
      case 'h3':
        snippet = '<h3 style="color: #002f34; margin: 14px 0 6px;">Sub-heading</h3>';
        break;
      case 'p':
        snippet = '<p>Write your paragraph here...</p>';
        break;
      case 'ul':
        snippet = '<ul style="padding-left: 20px;">\n  <li>Feature point 1</li>\n  <li>Feature point 2</li>\n</ul>';
        break;
      case 'quote':
        snippet = '<blockquote style="border-left: 3px solid #002f34; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic;">"Featured customer feedback or quote"</blockquote>';
        break;
      case 'hr':
        snippet = '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />';
        break;
    }
    setComposerBodyHtml((prev) => prev + '\n' + snippet);
  };

  const handleInsertLinkPrompt = () => {
    const url = prompt('Enter Destination URL:', 'https://');
    const text = prompt('Enter Link Label:', 'Click Here');
    if (url && text) {
      const linkHtml = `<a href="${url}" style="color: #002f34; font-weight: 600; text-decoration: underline;">${text}</a>`;
      setComposerBodyHtml((prev) => prev + linkHtml);
    }
  };

  const handleInsertImagePrompt = () => {
    const imgUrl = prompt(
      'Enter Image URL (HTTPS):',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80'
    );
    if (imgUrl) {
      const imgHtml = `<div style="text-align: center; margin: 16px 0;"><img src="${imgUrl}" alt="Banner" style="max-width: 100%; border-radius: 8px; height: auto;" /></div>`;
      setComposerBodyHtml((prev) => prev + imgHtml);
    }
  };

  const handleApplyPresetTemplate = (templateId: string) => {
    setSelectedPresetTemplateId(templateId);
    if (!templateId) return;
    const tpl = emailTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setComposerSubject(tpl.subject);
      setComposerBodyHtml(tpl.bodyHtml);
      addToast({
        type: 'info',
        title: 'Template Loaded',
        message: `Applied "${tpl.name}" to the composer.`,
      });
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid destination email address for the test.',
      });
      return;
    }

    setIsSendingTest(true);
    await new Promise((r) => setTimeout(r, 700));

    sendEmail({
      toEmail: testEmailAddress,
      toName: 'Admin / Reviewer',
      subject: `[TEST PREVIEW] ${composerSubject || 'Marketplace Newsletter'}`,
      body: composerBodyHtml
        .replace(/\{\{user_name\}\}/g, 'Admin Reviewer')
        .replace(/\{\{city\}\}/g, 'Mumbai')
        .replace(/\{\{unsubscribe_url\}\}/g, '#test-unsubscribe'),
      type: 'test',
      isMarketing: true,
    });

    setIsSendingTest(false);
    addToast({
      type: 'success',
      title: 'Test Email Dispatched',
      message: `Test preview sent successfully to ${testEmailAddress}.`,
    });
  };

  const handleExecuteDispatch = async () => {
    setIsSendingConfirmOpen(false);

    if (!composerSubject.trim()) {
      addToast({
        type: 'error',
        title: 'Subject Required',
        message: 'Please provide a subject line before dispatching the campaign.',
      });
      return;
    }

    const campaign = createNewsletterCampaign({
      title: composerSubject,
      subject: composerSubject,
      previewText: composerPreviewText,
      contentHtml: composerBodyHtml,
      bodyHtml: composerBodyHtml,
      targetAudience: composerAudience,
      targetCity: composerAudience === 'city_specific' ? composerSelectedCity : undefined,
      targetState: composerAudience === 'state_specific' ? composerSelectedState : undefined,
      audienceFilter: audienceFilterObj,
      status: 'sending',
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      authorName: 'Admin Team',
    });

    await sendNewsletterCampaign(campaign.id);
    setActiveTab('campaigns');
  };

  // ==========================================
  // 3. TEMPLATES MANAGEMENT STATE
  // ==========================================
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);

  // New template form
  const [newTemplateForm, setNewTemplateForm] = useState<{
    name: string;
    category: EmailTemplate['category'];
    description: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    actionLabel: string;
    actionUrl: string;
  }>({
    name: '',
    category: 'marketing',
    description: '',
    subject: '',
    bodyHtml: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">\n  <h2 style="color: #002f34;">Hello {{user_name}}</h2>\n  <p>Your message content here.</p>\n</div>`,
    bodyText: 'Hello {{user_name}},\n\nYour message content here.',
    actionLabel: 'View Details',
    actionUrl: 'https://chillyads.com',
  });

  const filteredTemplates = useMemo(() => {
    return emailTemplates.filter((tpl) => {
      if (templateCategoryFilter !== 'all' && tpl.category !== templateCategoryFilter)
        return false;
      if (templateSearch.trim()) {
        const q = templateSearch.toLowerCase();
        return (
          tpl.name.toLowerCase().includes(q) ||
          tpl.subject.toLowerCase().includes(q) ||
          tpl.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [emailTemplates, templateCategoryFilter, templateSearch]);

  const handleSaveNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateForm.name || !newTemplateForm.subject) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Template name and subject are required.',
      });
      return;
    }

    addEmailTemplate({
      name: newTemplateForm.name,
      category: newTemplateForm.category,
      description: newTemplateForm.description,
      subject: newTemplateForm.subject,
      bodyHtml: newTemplateForm.bodyHtml,
      bodyText: newTemplateForm.bodyText || newTemplateForm.bodyHtml.replace(/<[^>]+>/g, ''),
      actionLabel: newTemplateForm.actionLabel,
      actionUrl: newTemplateForm.actionUrl,
      variables: [
        { key: '{{user_name}}', label: 'User Name', sample: 'Rajesh Kumar' },
        { key: '{{city}}', label: 'City', sample: 'Mumbai' },
      ],
      isActive: true,
      isSystemDefault: false,
    });

    setIsCreateTemplateModalOpen(false);
    setNewTemplateForm({
      name: '',
      category: 'marketing',
      description: '',
      subject: '',
      bodyHtml: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">\n  <h2 style="color: #002f34;">Hello {{user_name}}</h2>\n  <p>Your message content here.</p>\n</div>`,
      bodyText: '',
      actionLabel: 'View Details',
      actionUrl: 'https://chillyads.com',
    });
  };

  // ==========================================
  // 4. SMTP SETTINGS STATE
  // ==========================================
  const [smtpHost, setSmtpHost] = useState(emailSettings.smtp.host);
  const [smtpPort, setSmtpPort] = useState(emailSettings.smtp.port);
  const [smtpUser, setSmtpUser] = useState(emailSettings.smtp.username);
  const [smtpPass, setSmtpPass] = useState(emailSettings.smtp.password);
  const [smtpEncryption, setSmtpEncryption] = useState<'tls' | 'ssl' | 'none'>(
    emailSettings.smtp.encryption || (emailSettings.smtp.secure ? 'ssl' : 'tls')
  );
  const [smtpAuthRequired, setSmtpAuthRequired] = useState(
    emailSettings.smtp.authRequired ?? true
  );
  const [showPassword, setShowPassword] = useState(false);

  // Senders & Preferences
  const [senderName, setSenderName] = useState(emailSettings.senderName);
  const [senderEmail, setSenderEmail] = useState(emailSettings.senderEmail);
  const [replyToEmail, setReplyToEmail] = useState(emailSettings.replyToEmail);
  const [marketingSenderName, setMarketingSenderName] = useState(
    emailSettings.marketingSenderName || 'Chillyads Promotions'
  );
  const [marketingSenderEmail, setMarketingSenderEmail] = useState(
    emailSettings.marketingSenderEmail || 'deals@newsletter.chillyads.com'
  );
  const [companyAddress, setCompanyAddress] = useState(
    emailSettings.companyAddress || emailSettings.footerAddress || 'Chillyads Pvt Ltd, DLF Cyber City, Tower B, Gurugram, Haryana 122002'
  );
  const [unsubscribeUrl, setUnsubscribeUrl] = useState(
    emailSettings.unsubscribeUrl || 'https://chillyads.com/unsubscribe'
  );
  const [autoSubscribeOnRegister, setAutoSubscribeOnRegister] = useState(
    emailSettings.defaultEmailSubscribedOnRegister ?? true
  );

  // SMTP Testing feedback
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);

  const handleRunSmtpTest = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    const res = await testSmtpConnection({
      host: smtpHost,
      port: Number(smtpPort),
      username: smtpUser,
      password: smtpPass,
      secure: smtpEncryption === 'ssl',
      encryption: smtpEncryption,
      authRequired: smtpAuthRequired,
    });

    setIsTestingSmtp(false);
    setSmtpTestResult(res);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'SMTP Connected',
        message: res.message,
      });
    } else {
      addToast({
        type: 'error',
        title: 'SMTP Connection Failed',
        message: res.message,
      });
    }
  };

  const handleSaveSmtpSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailSettings({
      senderName,
      senderEmail,
      replyToEmail,
      marketingSenderName,
      marketingSenderEmail,
      companyAddress,
      footerAddress: companyAddress,
      unsubscribeUrl,
      defaultEmailSubscribedOnRegister: autoSubscribeOnRegister,
      smtp: {
        host: smtpHost,
        port: Number(smtpPort),
        username: smtpUser,
        password: smtpPass,
        secure: smtpEncryption === 'ssl',
        encryption: smtpEncryption,
        authRequired: smtpAuthRequired,
      },
    });
  };

  // ==========================================
  // 5. EMAIL LOGS / HISTORY STATE
  // ==========================================
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<EmailLog | null>(null);

  const filteredEmailLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      if (logTypeFilter !== 'all') {
        if (logTypeFilter === 'marketing' && !log.isMarketing && log.type !== 'newsletter')
          return false;
        if (logTypeFilter === 'transactional' && (log.isMarketing || log.type === 'newsletter'))
          return false;
        if (
          logTypeFilter !== 'marketing' &&
          logTypeFilter !== 'transactional' &&
          log.type !== logTypeFilter
        )
          return false;
      }

      if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false;

      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        return (
          log.toEmail.toLowerCase().includes(q) ||
          log.toName.toLowerCase().includes(q) ||
          log.subject.toLowerCase().includes(q) ||
          (log.listingTitle && log.listingTitle.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [emailLogs, logTypeFilter, logStatusFilter, logSearchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Email & Newsletter Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Production-ready SMTP mailer, automated ad renewal notifications, visual newsletter
            composer, and templates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('send')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Newsletter</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates ({emailTemplates.length})</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Email Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('send')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'send'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Newsletter</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'campaigns'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Campaigns ({newsletters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Email Templates ({emailTemplates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Email Settings & SMTP</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Email Logs / History ({emailLogs.length})</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: EMAIL DASHBOARD
      ========================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Delivered Emails
                </span>
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">{totalSent.toLocaleString()}</span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> 99.4%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Transactional & Marketing dispatches</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Subscribed Audience
                </span>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {totalSubscribers.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  of {users.length} Total Registered
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Default auto-subscribed upon registration</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Average Open Rate
                </span>
                <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">64.8%</span>
                <span className="text-xs text-purple-600 font-semibold">28.4% Click-thru</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across all verified newsletters & alerts</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Active SMTP Gateway
                </span>
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-sm font-semibold truncate">{emailSettings.smtp.host}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Port {emailSettings.smtp.port} (TLS Active)</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Audience breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Campaigns & Dispatches */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Campaigns */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold">Recent Newsletter Campaigns</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({newsletters.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm">{camp.subject}</span>
                          <Badge
                            variant={
                              camp.status === 'sent' || camp.status === 'completed'
                                ? 'success'
                                : camp.status === 'sending'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {camp.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Audience: {camp.targetAudience?.replace('_', ' ') || 'All Subscribed'}</span>
                          <span>•</span>
                          <span>Delivered: {camp.sentCount || camp.deliveredCount || 0}</span>
                          <span>•</span>
                          <span>Created: {camp.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {camp.status === 'draft' ? (
                          <button
                            onClick={() => sendNewsletterCampaign(camp.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Send Now
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                            {camp.openedCount
                              ? `${Math.round(((camp.openedCount || 0) / (camp.sentCount || 1)) * 100)}% Opened`
                              : 'Delivered'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Email Logs Feed */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold">Latest Dispatched Transactional & System Emails</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Logs</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded shrink-0 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{log.subject}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            To: {log.toName} ({log.toEmail})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400">{log.sentAt}</span>
                        <Badge variant={log.status === 'delivered' ? 'success' : 'warning'}>
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Audience Segmentation & Automated Triggers */}
            <div className="space-y-6">
              {/* Audience Segments Card */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Audience Breakdown</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      All Subscribed Users
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {totalSubscribers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Active Sellers (with live ads)
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {activeSellersCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Verified Business Dealers
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {businessUsersCount}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('send')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Targeted Campaign</span>
                </button>
              </div>

              {/* Automated Triggers Status */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5 shadow-xs">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Automated System Triggers</span>
                </h3>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Ad Expired Free Renewal Notice</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>New User Registration Welcome</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ad Approval / Rejection Alerts</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Featured Ad Boost Confirmation</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Configure Templates ({emailTemplates.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: SEND NEWSLETTER / RICH COMPOSER
      ========================================== */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Composer Form */}
            <div className="lg:col-span-7 space-y-5">
              {/* Audience Selector Card */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Target Audience & Segmentation
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    {targetRecipients.length} Recipients Matched
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setComposerAudience('all_subscribed')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      composerAudience === 'all_subscribed'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">All Subscribed</span>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      All registered active email subscribers
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerAudience('active_sellers')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      composerAudience === 'active_sellers'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Active Sellers</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Users with active published ads
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComposerAudience('business_users')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      composerAudience === 'business_users'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">Verified Businesses</span>
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Business accounts & verified dealers
                    </span>
                  </button>
                </div>

                {/* State / City specific filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <button
                      type="button"
                      onClick={() => setComposerAudience('state_specific')}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs flex items-center justify-between cursor-pointer ${
                        composerAudience === 'state_specific'
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Specific State
                      </span>
                      {composerAudience === 'state_specific' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {composerAudience === 'state_specific' && (
                      <select
                        value={composerSelectedState}
                        onChange={(e) => {
                          setComposerSelectedState(e.target.value);
                          const cities = INDIAN_STATES_AND_CITIES[e.target.value];
                          if (cities && cities.length > 0) {
                            setComposerSelectedCity(cities[0]);
                          }
                        }}
                        className="mt-2 w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      >
                        {Object.keys(INDIAN_STATES_AND_CITIES).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setComposerAudience('city_specific')}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs flex items-center justify-between cursor-pointer ${
                        composerAudience === 'city_specific'
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Specific City
                      </span>
                      {composerAudience === 'city_specific' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {composerAudience === 'city_specific' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <select
                          value={composerSelectedState}
                          onChange={(e) => {
                            setComposerSelectedState(e.target.value);
                            const cities = INDIAN_STATES_AND_CITIES[e.target.value];
                            if (cities && cities.length > 0) {
                              setComposerSelectedCity(cities[0]);
                            }
                          }}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          {Object.keys(INDIAN_STATES_AND_CITIES).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <select
                          value={composerSelectedCity}
                          onChange={(e) => setComposerSelectedCity(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          {availableCitiesForState.map((ct: string) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Preset Selector */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Load Existing Template
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Populate composer with pre-designed responsive templates
                  </p>
                </div>
                <select
                  value={selectedPresetTemplateId}
                  onChange={(e) => handleApplyPresetTemplate(e.target.value)}
                  className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">-- Choose Template Preset --</option>
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category.toUpperCase()}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign Content Card */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Campaign Content & Message
                </label>

                {/* Subject Line */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    value={composerSubject}
                    onChange={(e) => setComposerSubject(e.target.value)}
                    placeholder="e.g. 📢 Special Offer: Top Deals in {{city}} This Weekend!"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Preview Text */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Preheader / Preview Text
                  </label>
                  <input
                    type="text"
                    value={composerPreviewText}
                    onChange={(e) => setComposerPreviewText(e.target.value)}
                    placeholder="Short snippet shown beside subject line in inbox"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                {/* Variable insertion buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">
                    Insert Personalization Variables:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: '{{user_name}}', label: 'User Name' },
                      { tag: '{{city}}', label: 'City' },
                      { tag: '{{ad_title}}', label: 'Ad Title' },
                      { tag: '{{renew_url}}', label: 'Renew URL' },
                      { tag: '{{unsubscribe_url}}', label: 'Unsubscribe URL' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertTag(v.tag)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
                      >
                        +{v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formatting Toolbar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Email Body & Styling
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setComposerEditorMode('visual')}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          composerEditorMode === 'visual'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Visual Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerEditorMode('code')}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          composerEditorMode === 'code'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 font-semibold shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Raw HTML
                      </button>
                    </div>
                  </div>

                  {/* Visual Formatting Toolbar */}
                  <div className="flex items-center gap-1 flex-wrap p-2 bg-slate-50 dark:bg-slate-800/80 rounded-t-lg border border-slate-300 dark:border-slate-700 border-b-0">
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('b')}
                      title="Bold"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('i')}
                      title="Italic"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('u')}
                      title="Underline"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('h2')}
                      title="Heading 2"
                      className="px-1.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('h3')}
                      title="Heading 3"
                      className="px-1.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('ul')}
                      title="Bullet List"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('quote')}
                      title="Quote Block"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('hr')}
                      title="Horizontal Divider"
                      className="px-1.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      — Divider
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                    <button
                      type="button"
                      onClick={handleInsertLinkPrompt}
                      title="Insert Hyperlink"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600 cursor-pointer"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertImagePrompt}
                      title="Insert Image"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editor Content Area */}
                  <textarea
                    rows={12}
                    value={composerBodyHtml}
                    onChange={(e) => setComposerBodyHtml(e.target.value)}
                    className="w-full p-3 rounded-b-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  />
                </div>

                {/* Send & Test Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Test Send Input */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Send test to..."
                      className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 w-48"
                    />
                    <button
                      type="button"
                      disabled={isSendingTest}
                      onClick={handleSendTestEmail}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isSendingTest ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Test</span>
                    </button>
                  </div>

                  {/* Mass Dispatch Button */}
                  <button
                    type="button"
                    onClick={() => setIsSendingConfirmOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Dispatch to {targetRecipients.length} Subscribers</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Live Real-time Rendered Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  {/* Device Toggle Header */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Live Preview
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                      <button
                        onClick={() => setComposerPreviewMode('desktop')}
                        className={`p-1.5 rounded cursor-pointer ${
                          composerPreviewMode === 'desktop'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500'
                        }`}
                        title="Desktop Browser"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setComposerPreviewMode('mobile')}
                        className={`p-1.5 rounded cursor-pointer ${
                          composerPreviewMode === 'mobile'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500'
                        }`}
                        title="Mobile Phone"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Simulated Inbox Subject header */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        From:
                      </span>
                      <span>
                        {emailSettings.marketingSenderName || emailSettings.senderName} &lt;
                        {emailSettings.marketingSenderEmail || emailSettings.senderEmail}&gt;
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {composerSubject || '(No Subject Line Entered)'}
                    </div>
                    {composerPreviewText && (
                      <div className="text-[11px] text-slate-400 italic">
                        Preview: {composerPreviewText}
                      </div>
                    )}
                  </div>

                  {/* Rendered HTML Container */}
                  <div
                    className={`p-4 bg-slate-50 dark:bg-slate-950/70 overflow-y-auto max-h-[600px] flex justify-center`}
                  >
                    <div
                      className={`bg-white text-slate-900 shadow-xs rounded-lg transition-all ${
                        composerPreviewMode === 'mobile'
                          ? 'w-[340px] p-4 text-xs border border-slate-200'
                          : 'w-full p-6 text-sm'
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: composerBodyHtml
                          .replace(/\{\{user_name\}\}/g, 'Rajesh Kumar')
                          .replace(/\{\{city\}\}/g, composerSelectedCity || 'Mumbai')
                          .replace(/\{\{ad_title\}\}/g, 'Honda City 2021 VMT')
                          .replace(
                            /\{\{renew_url\}\}/g,
                            'https://chillyads.com/my-account?tab=my-ads'
                          )
                          .replace(
                            /\{\{unsubscribe_url\}\}/g,
                            emailSettings.unsubscribeUrl || 'https://chillyads.com/unsubscribe'
                          ),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: CAMPAIGNS HISTORY
      ========================================== */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Newsletter Campaign History</h2>
              <p className="text-xs text-slate-500">
                Track delivery statuses, open rates, and dispatch drafts
              </p>
            </div>
            <button
              onClick={() => setActiveTab('send')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Campaign / Subject</th>
                    <th className="p-3.5">Target Audience</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Delivered</th>
                    <th className="p-3.5 text-center">Open Rate</th>
                    <th className="p-3.5 text-center">Clicks</th>
                    <th className="p-3.5">Sent / Created</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {newsletters.map((c) => {
                    const delivered = c.sentCount || c.deliveredCount || 0;
                    const opened = c.openedCount || 0;
                    const clicked = c.clickedCount || 0;
                    const openRate =
                      delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                    const clickRate =
                      delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3.5 font-medium max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {c.subject}
                          </p>
                          {c.previewText && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {c.previewText}
                            </p>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
                            {c.targetAudience?.replace('_', ' ') || 'All Subscribed'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <Badge
                            variant={
                              c.status === 'sent' || c.status === 'completed'
                                ? 'success'
                                : c.status === 'sending'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {c.status.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-center font-semibold">
                          {delivered.toLocaleString()}
                        </td>

                        <td className="p-3.5 text-center">
                          {delivered > 0 ? (
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              {openRate}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {delivered > 0 ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {clickRate}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="p-3.5 text-[11px] text-slate-400">
                          {c.sentAt || c.createdAt}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'draft' ? (
                              <button
                                onClick={() => sendNewsletterCampaign(c.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] cursor-pointer"
                              >
                                Send
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setComposerSubject(c.subject);
                                  setComposerBodyHtml(c.contentHtml || c.bodyHtml || '');
                                  setActiveTab('send');
                                }}
                                className="p-1 text-slate-500 hover:text-blue-600 cursor-pointer"
                                title="Clone & Reuse Content"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => deleteNewsletterCampaign(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: EMAIL TEMPLATES (20+ CATEGORIZED)
      ========================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Responsive Email Templates</h2>
              <p className="text-xs text-slate-500">
                20+ pre-built transactional, marketing, and ad lifecycle notification templates
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetEmailTemplates}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Restore 20+ Default Templates"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>

              <button
                onClick={() => setIsCreateTemplateModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Template</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'account', label: 'Account & Security' },
                { id: 'ad_lifecycle', label: 'Ad Expiry & Renewals' },
                { id: 'user_activity', label: 'Promotions & Boost' },
                { id: 'marketing', label: 'Newsletters' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setTemplateCategoryFilter(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    templateCategoryFilter === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-xs outline-none"
              />
            </div>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-all space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge
                      variant={
                        tpl.category === 'ad_lifecycle'
                          ? 'warning'
                          : tpl.category === 'marketing'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {tpl.category.toUpperCase().replace('_', ' ')}
                    </Badge>
                    {tpl.isSystemDefault && (
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        System Core
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>

                  <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Subject:
                    </span>{' '}
                    {tpl.subject}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewingTemplate(tpl)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => {
                        setComposerSubject(tpl.subject);
                        setComposerBodyHtml(tpl.bodyHtml);
                        setActiveTab('send');
                        addToast({
                          type: 'info',
                          title: 'Template Loaded',
                          message: `Loaded into composer: ${tpl.name}`,
                        });
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Use</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title="Edit Template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!tpl.isSystemDefault && (
                      <button
                        onClick={() => deleteEmailTemplate(tpl.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: EMAIL SETTINGS (STANDARD SMTP CREDENTIALS)
      ========================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSmtpSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Col: Standard SMTP Server Credentials */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold">Standard SMTP Server Configuration</h3>
                </div>
                <Badge variant="info">SSL / TLS Ready</Badge>
              </div>

              <div className="space-y-3 text-xs">
                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="e.g. smtp.sendgrid.net or smtp.gmail.com"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      SMTP Port *
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    SMTP Username / API User *
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="e.g. apikey or support@chillyads.com"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    required
                  />
                </div>

                {/* Password / API Key */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      SMTP Password / Secret Key *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    required
                  />
                </div>

                {/* Encryption Protocol */}
                <div className="space-y-1 pt-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Encryption Protocol
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'tls', label: 'TLS (Port 587)' },
                      { id: 'ssl', label: 'SSL (Port 465)' },
                      { id: 'none', label: 'None (Plain)' },
                    ].map((enc) => (
                      <button
                        key={enc.id}
                        type="button"
                        onClick={() => setSmtpEncryption(enc.id as any)}
                        className={`p-2 rounded-lg border text-center font-semibold cursor-pointer ${
                          smtpEncryption === enc.id
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {enc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Authentication Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Authentication Required (AUTH LOGIN)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Always recommended for cloud relays (SendGrid, SES, Mailgun)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smtpAuthRequired}
                    onChange={(e) => setSmtpAuthRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {/* Interactive SMTP Connection Test Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isTestingSmtp}
                    onClick={handleRunSmtpTest}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isTestingSmtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>Test SMTP Connection & Handshake</span>
                  </button>

                  {smtpTestResult && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        smtpTestResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {smtpTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        {smtpTestResult.message} ({smtpTestResult.latencyMs}ms)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Senders & Auto-subscription Policy */}
            <div className="space-y-6">
              {/* Senders Identity */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold">Sender Identity & Brand Footers</h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Default Sender Name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Default Sender Email
                      </label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Marketing / Newsletter Sender Name
                      </label>
                      <input
                        type="text"
                        value={marketingSenderName}
                        onChange={(e) => setMarketingSenderName(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Marketing / Newsletter Sender Email
                      </label>
                      <input
                        type="email"
                        value={marketingSenderEmail}
                        onChange={(e) => setMarketingSenderEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Reply-To Email
                    </label>
                    <input
                      type="email"
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Company Legal Address & Disclaimer (Footer)
                    </label>
                    <textarea
                      rows={2}
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Registration Privacy & Auto-Subscribe Policy */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Auto-Subscribe on User Registration
                    </span>
                    <p className="text-[11px] text-slate-500">
                      When a user registers on Chillyads, automatically capture their email and set
                      newsletter subscription to <strong>YES</strong> by default silently.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSubscribeOnRegister}
                    onChange={(e) => setAutoSubscribeOnRegister(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Email & SMTP Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* ==========================================
          TAB 6: EMAIL LOGS / HISTORY
      ========================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Email Logs & Delivery History</h2>
              <p className="text-xs text-slate-500">
                Detailed audit trail of all sent transactional notices, renewals, and newsletters
              </p>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Total Log Entries: {emailLogs.length}
            </span>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Logs' },
                { id: 'transactional', label: 'Transactional' },
                { id: 'marketing', label: 'Marketing' },
                { id: 'ad_expired', label: 'Expiry Notices' },
                { id: 'welcome', label: 'Welcome Alerts' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLogTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    logTypeFilter === t.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search recipient, subject..."
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-xs outline-none"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Delivery Status</th>
                    <th className="p-3.5">Sent Timestamp</th>
                    <th className="p-3.5 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmailLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.toName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.toEmail}</div>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {log.subject}
                        </p>
                        {log.listingTitle && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 truncate">
                            Ad: {log.listingTitle}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            log.isMarketing || log.type === 'newsletter'
                              ? 'info'
                              : log.type === 'ad_expired'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {log.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400 text-[11px]">{log.sentAt}</td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS & PREVIEW OVERLAYS
      ========================================== */}

      {/* 1. Send Confirmation Modal */}
      {isSendingConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Newsletter Dispatch
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are about to dispatch this campaign to{' '}
              <strong className="text-blue-600 font-bold">
                {targetRecipients.length} subscribed users
              </strong>{' '}
              via your configured SMTP server (<code>{emailSettings.smtp.host}</code>).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div>
                <strong>Subject:</strong> {composerSubject}
              </div>
              <div>
                <strong>Audience:</strong> {composerAudience.replace('_', ' ')}
              </div>
              <div>
                <strong>Sender:</strong> {emailSettings.marketingSenderName || emailSettings.senderName}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSendingConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Template Preview Modal */}
      {previewingTemplate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">{previewingTemplate.name}</h3>
                <p className="text-xs text-slate-500">{previewingTemplate.subject}</p>
              </div>
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div
                className="bg-white text-slate-900 p-6 rounded-lg shadow-xs"
                dangerouslySetInnerHTML={{
                  __html: previewingTemplate.bodyHtml
                    .replace(/\{\{user_name\}\}/g, 'Rajesh Kumar')
                    .replace(/\{\{city\}\}/g, 'Mumbai')
                    .replace(/\{\{listing_title\}\}/g, 'Royal Enfield Classic 350')
                    .replace(/\{\{ad_title\}\}/g, 'Royal Enfield Classic 350')
                    .replace(/\{\{renew_link\}\}/g, 'https://chillyads.com/my-ads')
                    .replace(/\{\{renew_url\}\}/g, 'https://chillyads.com/my-ads'),
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setComposerSubject(previewingTemplate.subject);
                  setComposerBodyHtml(previewingTemplate.bodyHtml);
                  setPreviewingTemplate(null);
                  setActiveTab('send');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Load into Composer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Log Details Preview Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">Email Audit Log Record</h3>
                <p className="text-xs text-slate-500">Log ID: {selectedLogDetail.id}</p>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">To:</span>
                  <span className="font-semibold">
                    {selectedLogDetail.toName} &lt;{selectedLogDetail.toEmail}&gt;
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-semibold">{selectedLogDetail.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <Badge variant="success">{selectedLogDetail.status.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sent At:</span>
                  <span>{selectedLogDetail.sentAt}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto">
                <div
                  className="bg-white text-slate-900 p-4 rounded text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: selectedLogDetail.body.includes('<')
                      ? selectedLogDetail.body
                      : `<p style="white-space: pre-wrap;">${selectedLogDetail.body}</p>`,
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Create New Template Modal */}
      {isCreateTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveNewTemplate}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold">Create Custom Email Template</h3>
              <button
                type="button"
                onClick={() => setIsCreateTemplateModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Template Name *</label>
                  <input
                    type="text"
                    value={newTemplateForm.name}
                    onChange={(e) =>
                      setNewTemplateForm({ ...newTemplateForm, name: e.target.value })
                    }
                    placeholder="e.g. Festival Season Discount Notice"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Category *</label>
                  <select
                    value={newTemplateForm.category}
                    onChange={(e) =>
                      setNewTemplateForm({
                        ...newTemplateForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="marketing">Marketing / Promotional</option>
                    <option value="ad_lifecycle">Ad Expiry & Renewals</option>
                    <option value="user_activity">Promotions & Boost</option>
                    <option value="account">Account & Security</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Subject Line *</label>
                <input
                  type="text"
                  value={newTemplateForm.subject}
                  onChange={(e) =>
                    setNewTemplateForm({ ...newTemplateForm, subject: e.target.value })
                  }
                  placeholder="e.g. 🎉 Exclusive Deals for {{user_name}} in {{city}}"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Description</label>
                <input
                  type="text"
                  value={newTemplateForm.description}
                  onChange={(e) =>
                    setNewTemplateForm({ ...newTemplateForm, description: e.target.value })
                  }
                  placeholder="Short note about when this template triggers"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">HTML Body Content</label>
                <textarea
                  rows={8}
                  value={newTemplateForm.bodyHtml}
                  onChange={(e) =>
                    setNewTemplateForm({ ...newTemplateForm, bodyHtml: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
