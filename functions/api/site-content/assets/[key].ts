type R2ObjectBody = {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: {
    contentType?: string;
  };
};

type R2BucketBinding = {
  get(key: string): Promise<R2ObjectBody | null>;
};

type Env = {
  SITE_ASSETS_R2?: R2BucketBinding;
};

const safeKeyPattern = /^certificate-[a-zA-Z0-9.-]+$/;
const noIndexHeader = 'noindex, nofollow, noarchive, nosnippet, noai, noimageai';

export async function onRequestGet({ params, env }: { params: { key?: string }; env: Env }) {
  if (!env.SITE_ASSETS_R2) {
    return new Response('SITE_ASSETS_R2 is not configured', {
      status: 503,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': noIndexHeader,
      },
    });
  }

  const rawKey = params.key || '';
  let key: string;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return new Response('Not found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': noIndexHeader,
      },
    });
  }

  if (!safeKeyPattern.test(key)) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': noIndexHeader,
      },
    });
  }

  const object = await env.SITE_ASSETS_R2.get(key);
  if (!object) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': noIndexHeader,
      },
    });
  }

  return new Response(await object.arrayBuffer(), {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': noIndexHeader,
    },
  });
}
