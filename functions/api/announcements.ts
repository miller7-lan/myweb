import { apiError, json, loadAnnouncement, normalizeAnnouncement, readJsonBody, saveAnnouncement, type AnnouncementEnv } from '../_lib/announcement';
import { requireAdminSession, type AdminEnv } from '../_lib/admin';

type Env = AnnouncementEnv & AdminEnv;

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const announcement = await loadAnnouncement(env);
    return json({ ok: true, announcement });
  } catch (error) {
    return apiError(error);
  }
}

export async function onRequestPut({ request, env }: { request: Request; env: Env }) {
  try {
    const session = await requireAdminSession(request, env);
    const body = await readJsonBody(request);
    const announcement = normalizeAnnouncement({
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: session.username,
    });

    await saveAnnouncement(env, announcement);
    return json({ ok: true, announcement });
  } catch (error) {
    return apiError(error);
  }
}
