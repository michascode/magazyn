// src/app/api/products/[id]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  const { id: productId, photoId } = await ctx.params;
  const body = await req.json();

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: {
      isFront: body.isFront ?? undefined,
      role: body.role ?? undefined,
      order: body.order ?? undefined,
    },
  });

  if (body.isFront === true) {
    await prisma.photo.updateMany({
      where: { productId, NOT: { id: photoId } },
      data: { isFront: false },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; photoId: string }> }) {
  const { photoId } = await ctx.params;

  const photo = await prisma.photo.delete({ where: { id: photoId } });

  try {
    const diskPath = path.join(process.cwd(), 'public', photo.url.replace(/^\//, ''));
    await fs.unlink(diskPath);
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
