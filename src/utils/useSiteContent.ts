import { useEffect, useState } from 'react';
import { defaultSiteContent, type SiteContentDocument } from '../data/siteContent';

declare global {
  interface WindowEventMap {
    /** Sent after the admin saves; carries the saved document. */
    'galaxy-site-content-updated': CustomEvent<SiteContentDocument | undefined>;
  }
}

/** Tells the pages showing the admin's additions that they changed. */
export const announceSiteContent = (saved: SiteContentDocument) => {
  window.dispatchEvent(new CustomEvent('galaxy-site-content-updated', { detail: saved }));
};

/**
 * The admin's additions (个人介绍, 奖状, 作品), loaded once per page. After a
 * save the saved copy arrives with the update event, so a read from the
 * store that is still catching up can't roll it back; a failed load keeps
 * what is already shown.
 */
export function useSiteContent() {
  const [siteContent, setSiteContent] = useState<SiteContentDocument>(defaultSiteContent);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/site-content', { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) return;
        const payload = await response.json() as { siteContent?: SiteContentDocument };
        if (!cancelled && payload.siteContent) setSiteContent(payload.siteContent);
      } catch {
        // Offline for a moment: keep what is shown.
      }
    };
    const handleUpdate = (event: WindowEventMap['galaxy-site-content-updated']) => {
      if (event.detail) setSiteContent(event.detail);
      else void load();
    };

    const timeoutId = window.setTimeout(() => void load(), 0);
    window.addEventListener('galaxy-site-content-updated', handleUpdate);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('galaxy-site-content-updated', handleUpdate);
    };
  }, []);

  return siteContent;
}
