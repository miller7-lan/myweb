import { assertAdminActionAllowed, requireAdminSession, type AdminEnv } from '../_lib/admin';
import { apiError, json } from '../_lib/announcement';
import { loadSiteContent, normalizeSiteContent, readSiteContentBody, saveSiteContent, type SiteContentEnv } from '../_lib/siteContent';

type Env = AdminEnv & SiteContentEnv;

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
    const siteContent = normalizeSiteContent({
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: session.username,
    });

    await saveSiteContent(env, siteContent);
    return json({ ok: true, siteContent });
  } catch (error) {
    return apiError(error);
  }
}
