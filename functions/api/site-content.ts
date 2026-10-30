import { assertAdminActionAllowed, requireAdminSession, type AdminEnv } from '../_lib/admin';
import { apiError, json } from '../_lib/announcement';
import {
  findIncompleteEntry,
  isCertificateAssetKey,
  loadSiteContent,
  normalizeSiteContent,
  readSiteContentBody,
  saveSiteContent,
  type SiteContentEnv,
} from '../_lib/siteContent';

type R2BucketBinding = {
  delete(keys: string | string[]): Promise<void>;
};

type Env = AdminEnv & SiteContentEnv & {
  SITE_ASSETS_R2?: R2BucketBinding;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const siteContent = await loadSiteContent(env);
    return json({ ok: true, siteContent });
  } catch (error) {
    return apiError(error);
  }
}

export async function onRequestPut({ request, env }: { request: Request; env: Env }) {
  try {
    const session = await requireAdminSession(request, env);
    await assertAdminActionAllowed(request, env, session.username, 'site-content-save', 60);
    const body = await readSiteContentBody(request);
    const incomplete = findIncompleteEntry(body);
    if (incomplete) {
      return json({ ok: false, error: incomplete }, 400);
    }

    const previous = await loadSiteContent(env);
    const siteContent = normalizeSiteContent({
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: session.username,
    });

    await saveSiteContent(env, siteContent);

    // Certificates that were removed (or given a new image) take their old image with them.
    const kept = new Set(siteContent.certificates.map((certificate) => certificate.imageKey));
    const orphaned = previous.certificates
      .map((certificate) => certificate.imageKey)
      .filter((key) => isCertificateAssetKey(key) && !kept.has(key));
    if (orphaned.length && env.SITE_ASSETS_R2) {
      try {
        await env.SITE_ASSETS_R2.delete(orphaned);
      } catch {
        // The save stands; a leftover image only takes up space.
      }
    }

    return json({ ok: true, siteContent });
  } catch (error) {
    return apiError(error);
  }
}
