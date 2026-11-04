'use client';

import React from 'react';
import dynamic from '@/src/shims/next-dynamic';
import { useApp } from '@/context/AppContext';
import { ToastContainer } from '@/components/common/ToastContainer';

const CmsPageModal = dynamic(() =>
  import('@/components/common/CmsPageModal').then((m) => m.CmsPageModal)
);
const ReportModal = dynamic(() =>
  import('@/components/common/ReportModal').then((m) => m.ReportModal)
);
const CmpConsentModal = dynamic(() =>
  import('@/components/common/CmpConsentModal').then((m) => m.CmpConsentModal)
);
const UsPrivacyModal = dynamic(() =>
  import('@/components/common/UsPrivacyModal').then((m) => m.UsPrivacyModal)
);
const EeatSchemaModal = dynamic(() =>
  import('@/components/common/EeatSchemaModal').then((m) => m.EeatSchemaModal)
);

export const GlobalOverlays: React.FC = () => {
  const {
    settings,
    activeCmsPageSlug,
    reportModalConfig,
    isCmpModalOpen,
    isUsPrivacyModalOpen,
    isEeatModalOpen,
  } = useApp();

  return (
    <>
      {activeCmsPageSlug && <CmsPageModal />}
      {reportModalConfig?.open && <ReportModal />}
      {settings?.enablePrivacyChoices && isCmpModalOpen && <CmpConsentModal />}
      {settings?.enablePrivacyChoices && isUsPrivacyModalOpen && <UsPrivacyModal />}
      {isEeatModalOpen && <EeatSchemaModal />}
      <ToastContainer />
    </>
  );
};
