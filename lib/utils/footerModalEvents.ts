export type FooterModalEvent =
  | { type: 'cms'; slug: string }
  | { type: 'report'; reportType: 'ad' | 'user'; targetId?: string }
  | { type: 'cmp' }
  | { type: 'us-privacy' }
  | { type: 'eeat' };

export function triggerFooterModal(event: FooterModalEvent) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chilly:footer-modal', { detail: event }));
  }
}
