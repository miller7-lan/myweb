import { requireAdminSessionWithCsrf, type AdminEnv } from '../../_lib/admin';
import { apiError, json } from '../../_lib/announcement';

type R2PutOptions = {
  httpMetadata?: {
    contentType?: string;
  };
  customMetadata?: Record<string, string>;
};

type R2BucketBinding = {
  put(key: string, value: ArrayBuffer, options?: R2PutOptions): Promise<unknown>;
};

type Env = AdminEnv & {
  SITE_ASSETS_R2?: R2BucketBinding;
};

const maxUploadBytes = 4 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const randomToken = () => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    await requireAdminSessionWithCsrf(request, env);
    if (!env.SITE_ASSETS_R2) {
      return json({ ok: false, error: 'SITE_ASSETS_R2 未绑定' }, 503);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return json({ ok: false, error: '请选择要上传的图片' }, 400);
    }

    const extension = allowedTypes.get(file.type);
    if (!extension) {
      return json({ ok: false, error: '仅支持 JPG、PNG 或 WebP 图片' }, 415);
    }

    if (file.size <= 0 || file.size > maxUploadBytes) {
      return json({ ok: false, error: '图片大小需小于 4 MB' }, 413);
    }

    const key = `certificate-${Date.now()}-${randomToken()}.${extension}`;
    await env.SITE_ASSETS_R2.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    return json({
      ok: true,
      asset: {
        key,
        url: `/api/site-content/assets/${encodeURIComponent(key)}`,
        contentType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
