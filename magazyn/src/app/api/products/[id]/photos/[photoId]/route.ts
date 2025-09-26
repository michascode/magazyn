import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/products/:id/photos/:photoId
// body: { role: 'front'|'back'|'measure1'|'measure2'|'extra' }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; photoId: string } }
) {
  const { id: productId, photoId } = params;

  try {
    const body = await req.json().catch(() => ({}));
    const role = typeof body.role === "string" ? body.role : undefined;
    if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 });

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.productId !== productId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (role === "front") {
      await prisma.photo.updateMany({
        where: { productId, role: "front", NOT: { id: photoId } },
        data: { role: "extra" },
      });
    }

    const updated = await prisma.photo.update({
      where: { id: photoId },
      data: { role },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/products/:id/photos/:photoId
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; photoId: string } }
) {
  const { id: productId, photoId } = params;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.productId !== productId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await prisma.photo.delete({ where: { id: photoId } });

    // (opcjonalnie) fizyczne usunięcie pliku z dysku/S3 — do dodania tu

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
