import { assertLoginAllowed, createSessionCookie, readLoginBody, recordFailedLogin, requireAdminConfig, requireJsonRequest, requireSameOrigin, verifyPassword, type AdminEnv } from '../../_lib/admin';
import { apiError, json, type AnnouncementEnv } from '../../_lib/announcement';

type Env = AdminEnv & AnnouncementEnv;

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    requireSameOrigin(request);
    requireJsonRequest(request);
    requireAdminConfig(env);

    const { username, password } = await readLoginBody(request);
    await assertLoginAllowed(request, env, username);
    const adminUsername = env.ADMIN_USERNAME || '';
    const adminPasswordHash = env.ADMIN_PASSWORD_HASH || '';
    const usernameOk = username === adminUsername;
    const passwordOk = password ? await verifyPassword(password, adminPasswordHash) : false;

    if (!usernameOk || !passwordOk) {
      await recordFailedLogin(request, env, username);
      return json({ ok: false, error: '账号或密码不正确' }, 401);
    }

    const session = await createSessionCookie(request, env);
    return json(
      {
        ok: true,
        csrf: session.csrf,
        username: adminUsername,
        expiresAt: session.expiresAt,
      },
      200,
      { 'set-cookie': session.cookie },
    );
  } catch (error) {
    return apiError(error);
  }
}
