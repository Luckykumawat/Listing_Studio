import { createHash } from 'node:crypto';

const requests: number[] = [];

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Cross-origin uploads are not allowed.' }, { status: 403 });
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) {
    return Response.json({ error: 'Image hosting is not configured.' }, { status: 503 });
  }

  const digests: unknown = await request.json().catch(() => null);
  if (!Array.isArray(digests) || !digests.length || digests.length > 200 ||
      !digests.every(digest => typeof digest === 'string' && /^[a-f0-9]{64}$/.test(digest))) {
    return Response.json({ error: 'Invalid upload batch.' }, { status: 400 });
  }

  const now = Date.now();
  while (requests.length && requests[0] <= now - 60000) requests.shift();
  if (requests.length >= 10) {
    return Response.json({ error: 'Upload rate limit reached. Wait a minute and retry.' }, { status: 429 });
  }
  requests.push(now);

  const uploads = digests.map(digest => {
    const fields = {
      allowed_formats: 'jpg,jpeg,png',
      overwrite: 'false',
      public_id: `meesho/${digest}`,
      timestamp: String(Math.floor(now / 1000)),
      type: 'upload',
    };
    const parameters = Object.entries(fields).map(([key, value]) => `${key}=${value}`).join('&');
    const signature = createHash('sha1').update(parameters + secret).digest('hex');
    return { ...fields, api_key: apiKey, signature };
  });
  return Response.json({ cloud, uploads }, { headers: { 'Cache-Control': 'no-store' } });
}
