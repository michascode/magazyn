import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/products/:id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const updated = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        photos: { orderBy: [{ isFront: "desc" }, { createdAt: "asc" }] },
      },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

// DELETE /api/products/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } }); // zdjęcia schodzą przez onDelete: Cascade
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
