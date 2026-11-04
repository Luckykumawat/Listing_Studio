import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { POST } from '../app/api/upload/sign/route.ts';

test('authorizes a 50-image batch with signed public upload parameters', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'fixture';
  process.env.CLOUDINARY_API_KEY = 'fixture';
  process.env.CLOUDINARY_API_SECRET = 'fixture-secret';
  const origin = 'https://studio.test';
  const digests = Array.from({ length: 50 }, (_, index) => index.toString(16).padStart(64, '0'));
  const request = new Request(`${origin}/api/upload/sign`, {
    method: 'POST',
    headers: { origin },
    body: JSON.stringify(digests),
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  const { cloud, uploads } = await response.json();
  assert.equal(cloud, 'fixture');
  assert.equal(uploads.length, 50);
  uploads.forEach(({ api_key, signature, ...fields }, index) => {
    assert.equal(api_key, 'fixture');
    assert.equal(fields.public_id, `meesho/${digests[index]}`);
    assert.equal(fields.type, 'upload');
    assert.equal(fields.overwrite, 'false');
    const parameters = Object.entries(fields).sort().map(([key, value]) => `${key}=${value}`).join('&');
    assert.equal(signature, createHash('sha1').update(parameters + 'fixture-secret').digest('hex'));
  });
});
