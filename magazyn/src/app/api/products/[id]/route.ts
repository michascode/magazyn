// src/app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const item = await prisma.product.findUnique({
    where: { id },
    include: { photos: { orderBy: [{ isFront: 'desc' }, { createdAt: 'asc' }] } },
  });

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = await req.json();

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { photos: { orderBy: [{ isFront: 'desc' }, { createdAt: 'asc' }] } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // najpierw usuń zdjęcia (ON DELETE CASCADE też załatwi sprawę, ale zrobimy jawnie)
  await prisma.photo.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
