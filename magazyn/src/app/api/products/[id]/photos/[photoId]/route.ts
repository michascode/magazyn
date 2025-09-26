import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function productWithPhotosWhere(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: [{ isFront: "desc" }, { order: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

/**
 * Ustawianie flag lub kolejności pojedynczego zdjęcia.
 * Dozwolone pola body: { isFront?: boolean, role?: string, order?: number }
 */
export async function PATCH(
  req: Request,
  ctx: { params: { id: string; photoId: string } }
) {
  const { id: productId, photoId } = await ctx.params; // <-- WAŻNE: await!

  try {
    const body = (await req.json().catch(() => ({}))) as {
      isFront?: boolean;
      role?: string;
      order?: number;
    };

    // jeśli ustawiamy "front", najpierw zdejmij z pozostałych
    if (body.isFront === true) {
      await prisma.photo.updateMany({
        where: { productId, isFront: true },
        data: { isFront: false },
      });
      await prisma.photo.update({
        where: { id: photoId },
        data: { isFront: true },
      });
    } else {
      // częściowy update – żadnego wymagania, że "role" musi być
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          ...(typeof body.role === "string" ? { role: body.role } : {}),
          ...(typeof body.order === "number" ? { order: body.order } : {}),
        },
      });
    }

    const product = await productWithPhotosWhere(productId);
    return NextResponse.json(product);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "PATCH photo error" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string; photoId: string } }
) {
  const { id: productId, photoId } = await ctx.params; // <-- WAŻNE: await!

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.productId !== productId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.photo.delete({ where: { id: photoId } });

    // Jeśli usunęliśmy zdjęcie front, wybierz następne jako front (jeśli jest)
    if (photo.isFront) {
      const next = await prisma.photo.findFirst({
        where: { productId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await prisma.photo.update({ where: { id: next.id }, data: { isFront: true } });
      }
    }

    const product = await productWithPhotosWhere(productId);
    return NextResponse.json(product);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "DELETE photo error" },
      { status: 400 }
    );
  }
}
