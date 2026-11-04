'use client';

import React, { useState, useEffect } from 'react';
import dynamic from '@/src/shims/next-dynamic';
import { useAppOptional } from '@/context/AppContextInstance';
import { FooterModalEvent } from '@/lib/utils/footerModalEvents';

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

export const FooterModalsIsland: React.FC<{ enablePrivacyChoices?: boolean }> = () => {
  const app = useAppOptional();
  const [localCmsSlug, setLocalCmsSlug] = useState<string | null>(null);
  const [localReportConfig, setLocalReportConfig] = useState<{
    open: boolean;
    type: 'ad' | 'user';
    targetId?: string;
  } | null>(null);
  const [localCmpOpen, setLocalCmpOpen] = useState(false);
  const [localUsPrivacyOpen, setLocalUsPrivacyOpen] = useState(false);
  const [localEeatOpen, setLocalEeatOpen] = useState(false);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FooterModalEvent>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === 'cms') {
        if (app?.openCmsPageModal) {
          app.openCmsPageModal(detail.slug);
        } else {
          setLocalCmsSlug(detail.slug);
        }
      } else if (detail.type === 'report') {
        if (app?.openReportModal) {
          app.openReportModal(detail.reportType, detail.targetId);
        } else {
          setLocalReportConfig({ open: true, type: detail.reportType, targetId: detail.targetId });
        }
      } else if (detail.type === 'cmp') {
        if (app?.openCmpModal) {
          app.openCmpModal();
        } else {
          setLocalCmpOpen(true);
        }
      } else if (detail.type === 'us-privacy') {
        if (app?.openUsPrivacyModal) {
          app.openUsPrivacyModal();
        } else {
          setLocalUsPrivacyOpen(true);
        }
      } else if (detail.type === 'eeat') {
        if (app?.openEeatModal) {
          app.openEeatModal();
        } else {
          setLocalEeatOpen(true);
        }
      }
    };

    window.addEventListener('chilly:footer-modal', handleEvent);
    return () => window.removeEventListener('chilly:footer-modal', handleEvent);
  }, [app]);

  return (
    <>
      {!app && localCmsSlug && (
        <CmsPageModal slug={localCmsSlug} onClose={() => setLocalCmsSlug(null)} />
      )}
      {!app && localReportConfig?.open && (
        <ReportModal
          reportConfig={localReportConfig}
          onClose={() => setLocalReportConfig(null)}
        />
      )}
      {!app && localCmpOpen && (
        <CmpConsentModal isOpen={localCmpOpen} onClose={() => setLocalCmpOpen(false)} />
      )}
      {!app && localUsPrivacyOpen && (
        <UsPrivacyModal
          isOpen={localUsPrivacyOpen}
          onClose={() => setLocalUsPrivacyOpen(false)}
        />
      )}
      {!app && localEeatOpen && (
        <EeatSchemaModal
          isOpen={localEeatOpen}
          onClose={() => setLocalEeatOpen(false)}
          onOpenCmsPage={(slug) => setLocalCmsSlug(slug)}
        />
      )}
    </>
  );
};
