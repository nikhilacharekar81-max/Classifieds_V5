'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { triggerFooterModal, FooterModalEvent } from '@/lib/utils/footerModalEvents';

export interface FooterModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  modalEvent: FooterModalEvent;
  children: React.ReactNode;
  showChevron?: boolean;
  chevronClassName?: string;
}

export const FooterModalButton: React.FC<FooterModalButtonProps> = ({
  modalEvent,
  children,
  className,
  showChevron = false,
  chevronClassName = 'w-3.5 h-3.5 text-slate-600',
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={() => triggerFooterModal(modalEvent)}
      className={className}
      {...props}
    >
      {children}
      {showChevron && <ChevronRight className={chevronClassName} />}
    </button>
  );
};
