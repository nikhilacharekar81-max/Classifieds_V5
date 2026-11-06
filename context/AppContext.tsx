'use client';
import React, { useState, useEffect } from 'react';
import {
  AdminUser,
  UserAccount,
  Listing,
  Category,
  CustomFieldDefinition,
  LocationItem,
  ReportItem,
  ModerationRule,
  PromotionalPackage,
  OrderTransaction,
  AuditLog,
  ToastMessage,
  SystemSettings,
  Role,
  UserGeoLocation,
  EmailLog,
  EmailSettings,
  EmailTemplate,
  NewsletterCampaign,
  CmsPage,
} from '@/lib/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_LOCATIONS,
  INITIAL_REPORTS,
  INITIAL_MODERATION_RULES,
  INITIAL_PACKAGES,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_EMAIL_LOGS,
  INITIAL_EMAIL_SETTINGS,
  INITIAL_EMAIL_TEMPLATES,
  INITIAL_NEWSLETTERS,
  INITIAL_CMS_PAGES,
} from '@/lib/data/initialData';
import { isListingBoosted } from '@/lib/utils/boostHelper';
import { useEmailAndNewsletterActions } from './hooks/useEmailAndNewsletterActions';
import { useListingActions } from './hooks/useListingActions';
import { useAdminAndTaxonomyActions } from './hooks/useAdminAndTaxonomyActions';
import {
  AppContext,
  useAppOptional,
  useApp,
  type AppContextType,
  type InitialServerData,
} from './AppContextInstance';

export { AppContext, useAppOptional, useApp, type AppContextType, type InitialServerData };

export const AppProvider: React.FC<{ children: React.ReactNode; initialServerData?: InitialServerData }> = ({
  children,
  initialServerData,
}) => {
  // Navigation & Mode
  const [viewMode, setViewMode] = useState<'admin' | 'marketplace'>('admin');
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Admin and Auth
  const [authUser, setAuthUser] = useState<UserAccount | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<UserAccount | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const requestCounter = React.useRef(0);

  const updateAuth = (user: UserAccount | null, admin: AdminUser | null, userId: string | null) => {
    // Invalidate stale pending auth requests
    requestCounter.current++;
    setIsAuthChecking(false);
    setAuthUser(user);
    setCurrentAdmin(admin);
    setActiveUserId(userId);
  };

  useEffect(() => {
    let active = true;
    const requestId = ++requestCounter.current;
    
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return null;
        return res.json().catch(() => null);
      })
      .then((data) => {
        if (!active || requestCounter.current !== requestId) return;
        setIsAuthChecking(false);
        if (data && data.authenticated && data.user) {
          const admin = (data.isAdmin || data.isModerator) ? {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar || 'https://picsum.photos/seed/admin/100/100',
            role: data.adminRole || (data.isAdmin ? 'super_admin' : 'moderator'),
            twoFactorEnabled: false,
            lastLogin: 'Just now',
            ipAddress: '127.0.0.1',
            status: 'active',
          } : null;
          updateAuth(data.user, admin, data.user.id);
          if (data.favoriteListingIds) {
            setFavoriteListingIds(data.favoriteListingIds);
          }
        } else {
          updateAuth(null, null, null);
        }
      })
      .catch(() => {
        if (!active || requestCounter.current !== requestId) return;
        setIsAuthChecking(false);
        updateAuth(null, null, null);
      });
      
    return () => { active = false; };
  }, []);

  // Collections (initialized from server-fetched PostgreSQL data during SSR when provided)
  const [listings, setListings] = useState<Listing[]>(() => initialServerData?.listings || []);
  const [categories, setCategories] = useState<Category[]>(() =>
    initialServerData?.categories && initialServerData.categories.length > 0
      ? initialServerData.categories
      : INITIAL_CATEGORIES
  );
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(INITIAL_CUSTOM_FIELDS);
  const [locations, setLocations] = useState<LocationItem[]>(() =>
    initialServerData?.locations && initialServerData.locations.length > 0
      ? initialServerData.locations
      : INITIAL_LOCATIONS
  );
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [rules, setRules] = useState<ModerationRule[]>(INITIAL_MODERATION_RULES);
  const [packages, setPackages] = useState<PromotionalPackage[]>(INITIAL_PACKAGES);
  const [transactions, setTransactions] = useState<OrderTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() =>
    initialServerData?.settings ? { ...INITIAL_SETTINGS, ...initialServerData.settings } : INITIAL_SETTINGS
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(INITIAL_EMAIL_SETTINGS);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(INITIAL_EMAIL_TEMPLATES);
  const [newsletters, setNewsletters] = useState<NewsletterCampaign[]>([]);
  const [favoriteListingIds, setFavoriteListingIds] = useState<string[]>([]);

  // Sync server-provided reference data when root layout revalidates
  useEffect(() => {
    if (initialServerData?.categories && initialServerData.categories.length > 0) {
      setCategories(initialServerData.categories);
    }
  }, [initialServerData?.categories]);

  useEffect(() => {
    if (initialServerData?.locations && initialServerData.locations.length > 0) {
      setLocations(initialServerData.locations);
    }
  }, [initialServerData?.locations]);

  useEffect(() => {
    if (initialServerData?.settings) {
      setSettings((prev) => ({ ...prev, ...initialServerData.settings }));
    }
  }, [initialServerData?.settings]);

  // CMS Pages & Footer Modal State
  const [cmsPages, setCmsPages] = useState<CmsPage[]>(() =>
    initialServerData?.cmsPages && initialServerData.cmsPages.length > 0
      ? initialServerData.cmsPages
      : INITIAL_CMS_PAGES
  );
  const [activeCmsPageSlug, setActiveCmsPageSlug] = useState<string | null>(null);
  const [reportModalConfig, setReportModalConfig] = useState<{
    open: boolean;
    type?: 'ad' | 'user';
    targetId?: string;
    targetTitle?: string;
  } | null>(null);

  // Regulatory & Compliance Modals State
  const [isCmpModalOpen, setIsCmpModalOpen] = useState(false);
  const [isUsPrivacyModalOpen, setIsUsPrivacyModalOpen] = useState(false);
  const [isEeatModalOpen, setIsEeatModalOpen] = useState(false);

  const openCmpModal = () => setIsCmpModalOpen(true);
  const closeCmpModal = () => setIsCmpModalOpen(false);
  const openUsPrivacyModal = () => setIsUsPrivacyModalOpen(true);
  const closeUsPrivacyModal = () => setIsUsPrivacyModalOpen(false);
  const openEeatModal = () => setIsEeatModalOpen(true);
  const closeEeatModal = () => setIsEeatModalOpen(false);

  useEffect(() => {
    const handleOpenCmp = () => setIsCmpModalOpen(true);
    window.addEventListener('open_cmp_modal', handleOpenCmp);
    return () => {
      window.removeEventListener('open_cmp_modal', handleOpenCmp);
    };
  }, []);

  const openCmsPageModal = (slug: string) => setActiveCmsPageSlug(slug);
  const closeCmsPageModal = () => setActiveCmsPageSlug(null);

  const openReportModal = (type: 'ad' | 'user' = 'ad', targetId?: string, targetTitle?: string) => {
    setReportModalConfig({ open: true, type, targetId, targetTitle });
  };
  const closeReportModal = () => setReportModalConfig(null);

  // Marketplace filter states
  const [selectedMarketplaceCity, setSelectedMarketplaceCity] = useState<string>('All India');
  const [selectedMarketplaceCategory, setSelectedMarketplaceCategory] = useState<string>('all');
  const [selectedMarketplaceSubcategory, setSelectedMarketplaceSubcategory] = useState<string>('all');
  const [marketplaceSearch, setMarketplaceSearch] = useState<string>('');
  const [activeViewingListing, setActiveViewingListing] = useState<Listing | null>(null);
  const [isPostAdOpen, setIsPostAdOpen] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserGeoLocation | null>({
    latitude: 19.0596,
    longitude: 72.8295,
    city: 'Mumbai',
    area: 'Bandra West',
    radiusKm: 25,
  });

  // Toast manager
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const currentUser =
    impersonatedUser || authUser || (activeUserId ? users.find((u) => u.id === activeUserId) || null : null);

  // Audit Logger
  const recordAuditLog = (
    action: string,
    module: string,
    targetId: string,
    targetSummary: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: 'aud_' + Date.now(),
      adminId: currentAdmin?.id || currentUser?.id || 'system',
      adminName: currentAdmin?.name || currentUser?.name || 'System User',
      action,
      module,
      targetId,
      targetSummary,
      details,
      ipAddress: currentAdmin?.ipAddress ? currentAdmin.ipAddress.split(' ')[0] : 'unknown',
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const fetchGpsLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          let detectedCity = '';
          let detectedArea = `GPS: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
              { signal: controller.signal }
            ).catch(() => null);
            clearTimeout(timeoutId);
            if (res && res.ok) {
              const data = await res.json().catch(() => null);
              const addr = data?.address || {};
              const resolvedCity = addr.city || addr.town || addr.village || addr.county || addr.state_district;
              if (resolvedCity) {
                detectedCity = resolvedCity;
                detectedArea = addr.suburb || addr.neighbourhood || detectedCity;
              }
            }
          } catch {
            // graceful fallback to coordinates
          }

          const finalCity = detectedCity || 'Current Location';
          setUserLocation({
            latitude: lat,
            longitude: lon,
            city: finalCity,
            area: detectedArea,
            radiusKm: 25,
          });
          if (detectedCity) {
            setSelectedMarketplaceCity(detectedCity);
          }
          addToast({
            type: 'success',
            title: '📍 Location Acquired',
            message: `${finalCity} (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          });
        },
        () => {
          addToast({
            type: 'warning',
            title: 'GPS Unavailable',
            message: 'Unable to acquire GPS coordinates. Please select your city manually.',
          });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      addToast({ type: 'error', title: 'Not Supported', message: 'Geolocation is not supported by this browser' });
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' });
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return;
        const data = await res.json().catch(() => null);
        if (!data) return;
        if (Array.isArray(data.listings)) {
          setListings(data.listings);
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations);
        }
        if (Array.isArray(data.cmsPages)) {
          setCmsPages(data.cmsPages);
        }
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        if (Array.isArray(data.users)) {
          setUsers(data.users);
        }
        if (data.currentUser) {
          setActiveUserId(data.currentUser.id);
          if (data.favoriteListingIds) {
            setFavoriteListingIds(data.favoriteListingIds);
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync bootstrap data with backend:', err);
    }
  };

  useEffect(() => {
    const hasServerCategories = Boolean(
      initialServerData?.categories && initialServerData.categories.length > 0
    );
    if (initialServerData && hasServerCategories) {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      const needsFullCatalogue =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/my-account') ||
        pathname.startsWith('/my-ads');
      if (!needsFullCatalogue) {
        return;
      }
    }
    refreshData();
  }, [initialServerData]);

  const switchAdminRole = (role: Role) => {
    console.warn('switchAdminRole is a demo capability and does not affect server-side permissions.');
    addToast({
      type: 'info',
      title: `Role Switch Simulated (${role})`,
      message: 'This is a demo capability. Server-side permissions remain unchanged.',
    });
  };

  const impersonateUser = async (user: UserAccount) => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId: user.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to start impersonation');
      }
      setImpersonatedUser(user);
      setViewMode('marketplace');
      recordAuditLog(
        'IMPERSONATE_USER',
        'Users / Impersonation',
        user.id,
        user.name,
        `Admin ${currentAdmin?.name || 'System'} started impersonation session for audit`
      );
      addToast({
        type: 'warning',
        title: `Impersonating ${user.name}`,
        message: 'You are now viewing the marketplace as this user. Actions will be logged in audit trail.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Impersonation Failed',
        message: err?.message || 'Could not initiate impersonation session.',
      });
    }
  };

  const exitImpersonation = async () => {
    try {
      await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
    } catch (err) {
      console.error('Failed to exit impersonation on server:', err);
    }
    if (impersonatedUser) {
      recordAuditLog(
        'EXIT_IMPERSONATION',
        'Users / Impersonation',
        impersonatedUser.id,
        impersonatedUser.name,
        `Admin ${currentAdmin?.name || 'System'} ended impersonation session`
      );
    }
    setImpersonatedUser(null);
    setViewMode('admin');
    addToast({
      type: 'info',
      title: 'Exited Impersonation',
      message: 'Returned safely to the Admin Control Panel.',
    });
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      updateAuth(null, null, null);
      addToast({ type: 'info', title: 'Signed Out', message: 'You have been signed out.' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const emailActions = useEmailAndNewsletterActions({
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
  });

  const listingActions = useListingActions({
    listings,
    setListings,
    users,
    currentUser,
    packages,
    setPackages,
    setTransactions,
    sendEmail: emailActions.sendEmail,
    addToast,
    recordAuditLog,
  });

  const adminActions = useAdminAndTaxonomyActions({
    categories,
    setCategories,
    customFields,
    setCustomFields,
    locations,
    setLocations,
    users,
    setUsers,
    currentUser,
    setListings,
    setReports,
    rules,
    setRules,
    packages,
    setPackages,
    setSettings,
    cmsPages,
    setCmsPages,
    setReportModalConfig,
    addToast,
    recordAuditLog,
  });

  const toggleFavorite = async (listingId: string) => {
    if (!currentUser) {
      addToast({ type: 'warning', title: 'Login Required', message: 'Please sign in to save items to your watchlist.' });
      return;
    }
    try {
      const res = await fetch(`/api/listings/${listingId}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update favorites');
      
      setFavoriteListingIds(prev => 
        data.isFavorited ? [...prev, listingId] : prev.filter(id => id !== listingId)
      );

      // Update the listing's like count in local state
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, likes: data.count } : l));

      addToast({
        type: 'success',
        title: data.isFavorited ? 'Saved to Watchlist' : 'Removed from Watchlist',
        message: data.isFavorited ? 'Listing added to your saved items.' : 'Listing removed from your saved items.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Periodic automatic cleanup of expired boosts
  useEffect(() => {
    listingActions.cleanupExpiredBoosts();
    const interval = setInterval(() => {
      listingActions.cleanupExpiredBoosts();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        activeSidebarTab,
        setActiveSidebarTab,
        theme,
        toggleTheme,
        globalSearchOpen,
        setGlobalSearchOpen,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        currentAdmin,
        switchAdminRole,
        impersonatedUser,
        impersonateUser,
        exitImpersonation,
        currentUser,
        authUser,
        updateAuth,
        isAuthChecking,
        listings,
        categories,
        customFields,
        locations,
        users,
        reports,
        rules,
        packages,
        transactions,
        auditLogs,
        settings,
        toasts,
        ...listingActions,
        emailLogs,
        emailSettings,
        emailTemplates,
        newsletters,
        favoriteListingIds,
        ...emailActions,
        ...adminActions,
        toggleFavorite,
        isListingBoosted,
        addToast,
        removeToast,
        recordAuditLog,
        selectedMarketplaceCity,
        setSelectedMarketplaceCity,
        selectedMarketplaceCategory,
        setSelectedMarketplaceCategory,
        selectedMarketplaceSubcategory,
        setSelectedMarketplaceSubcategory,
        marketplaceSearch,
        setMarketplaceSearch,
        activeViewingListing,
        setActiveViewingListing,
        isPostAdOpen,
        setIsPostAdOpen,
        userLocation,
        setUserLocation,
        fetchGpsLocation,
        signOut,
        cmsPages,
        activeCmsPageSlug,
        openCmsPageModal,
        closeCmsPageModal,
        reportModalConfig,
        openReportModal,
        closeReportModal,
        isCmpModalOpen,
        openCmpModal,
        closeCmpModal,
        isUsPrivacyModalOpen,
        openUsPrivacyModal,
        closeUsPrivacyModal,
        isEeatModalOpen,
        openEeatModal,
        closeEeatModal,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
