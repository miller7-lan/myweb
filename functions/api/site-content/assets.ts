import { assertAdminActionAllowed, requireAdminSessionWithCsrf, type AdminEnv } from '../../_lib/admin';
import { apiError, json } from '../../_lib/announcement';
import { certificateAssetUrl } from '../../_lib/siteContent';

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

const hasImageSignature = (bytes: Uint8Array, contentType: string) => {
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (contentType === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a;
  }

  if (contentType === 'image/webp') {
    return bytes.length >= 12
      && bytes[0] === 0x52
      && bytes[1] === 0x49
      && bytes[2] === 0x46
      && bytes[3] === 0x46
      && bytes[8] === 0x57
      && bytes[9] === 0x45
      && bytes[10] === 0x42
      && bytes[11] === 0x50;
  }

  return false;
};

const randomToken = () => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const session = await requireAdminSessionWithCsrf(request, env);
    await assertAdminActionAllowed(request, env, session.username, 'certificate-upload', 20, 60 * 60);
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

    const buffer = await file.arrayBuffer();
    if (!hasImageSignature(new Uint8Array(buffer), file.type)) {
      return json({ ok: false, error: '图片内容与文件类型不匹配' }, 415);
    }

    const key = `certificate-${Date.now()}-${randomToken()}.${extension}`;
    await env.SITE_ASSETS_R2.put(key, buffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    return json({
      ok: true,
      asset: {
        key,
        url: certificateAssetUrl(key),
        contentType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
