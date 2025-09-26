// src/lib/uploadPhoto.ts
export async function uploadPhoto(
  productId: string,
  file: File,
  opts?: { role?: string; isFront?: boolean; order?: number }
) {
  const fd = new FormData();
  fd.append('file', file);                    // NAZWA MUSI BYĆ "file"
  if (opts?.role) fd.append('role', opts.role);
  if (typeof opts?.isFront === 'boolean') fd.append('isFront', String(opts.isFront));
  if (typeof opts?.order === 'number') fd.append('order', String(opts.order));

  const res = await fetch(`/api/products/${productId}/photos`, {
    method: 'POST',
    body: fd,                                 // fetch sam doda boundary; NIE dodawaj Content-Type
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }
  return res.json();
}
