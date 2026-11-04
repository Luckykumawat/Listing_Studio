export async function imageDigest(file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) {
    throw Error('Select an image smaller than 10 MB.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  if (!jpeg && !png) throw Error('Invalid image content. Only JPEG and PNG are allowed.');

  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadDirect(file: File, cloud: string, fields: Record<string, string>) {
  const body = new FormData();
  body.set('file', file);
  for (const [key, value] of Object.entries(fields)) body.set(key, value);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, {
    method: 'POST',
    body,
  });
  const data = await response.json();
  if (!response.ok || !data.secure_url) throw Error(data.error?.message || 'Upload failed. Retry this image.');

  const url = new URL(data.secure_url);
  if (url.origin !== 'https://res.cloudinary.com' ||
      !url.pathname.startsWith(`/${cloud}/image/upload/`)) {
    throw Error('Unexpected storage URL.');
  }
  return url.href;
}
