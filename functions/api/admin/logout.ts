import { clearSessionCookie, requireSameOrigin } from '../../_lib/admin';
import { apiError, json } from '../../_lib/announcement';

export async function onRequestPost({ request }: { request: Request }) {
  try {
    requireSameOrigin(request);
    return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
  } catch (error) {
    return apiError(error);
  }
}
