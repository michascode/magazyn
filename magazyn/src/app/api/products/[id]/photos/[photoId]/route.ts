// src/app/api/products/[id]/photos/[photoId]/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getProductWithPhotos(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      photos: {
        orderBy: [{ isFront: "desc" }, { order: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function PATCH(req: Request, ctx: any) {
  const { id: productId, photoId } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({} as any));

    // Na dziś obsługujemy tylko ustawianie frontu
    if (body?.isFront === true) {
      await prisma.$transaction([
        // wyłącz front na pozostałych
        prisma.photo.updateMany({
          where: { productId, NOT: { id: photoId } },
          data: { isFront: false },
        }),
        // ustaw front na wskazanym
        prisma.photo.update({
          where: { id: photoId },
          data: { isFront: true },
        }),
      ]);

      const product = await getProductWithPhotos(productId);
      return NextResponse.json(product, { status: 200 });
    }

    return NextResponse.json({ error: "Missing or invalid body." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: any) {
  const { id: productId, photoId } = await ctx.params;

  try {
    // znajdź zdjęcie, żeby usunąć też plik
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // skasuj rekord
    await prisma.photo.delete({ where: { id: photoId } });

    // Kasuj plik na dysku (jeśli istnieje)
    if (photo.url && photo.url.startsWith("/uploads/")) {
      const absPath = path.join(process.cwd(), "public", photo.url);
      try {
        await fs.unlink(absPath);
      } catch {
        // plik mógł nie istnieć — ignorujemy
      }
    }

    const product = await getProductWithPhotos(productId);
    return NextResponse.json(product, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
