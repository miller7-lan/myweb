import { getAdminSession, type AdminEnv } from '../../_lib/admin';
import { apiError, json } from '../../_lib/announcement';

export async function onRequestGet({ request, env }: { request: Request; env: AdminEnv }) {
  try {
    const session = await getAdminSession(request, env);
    return json({
      ok: true,
      authenticated: Boolean(session),
      username: session?.username ?? null,
      csrf: session?.csrf ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}
