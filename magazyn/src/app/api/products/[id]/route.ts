/* eslint-disable no-console */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* GET /api/products/[id] */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await prisma.product.findUnique({
      where: { id: params.id },
      include: { photos: { orderBy: [{ isFront: "desc" }, { createdAt: "asc" }] } },
    });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/* PATCH /api/products/[id] */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await req.json();
    const data: any = {};

    const allowedKeys = [
      "title",
      "brand",
      "size",
      "condition",
      "priceCents",
      "dimA",
      "dimB",
      "dimC",
      "sku",
      "status",
      "notes",
    ] as const;

    for (const k of allowedKeys) {
      if (payload.hasOwnProperty(k)) (data as any)[k] = payload[k];
    }

    if ("priceCents" in data) data.priceCents = Number(data.priceCents ?? 0);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { photos: { orderBy: [{ isFront: "desc" }, { createdAt: "asc" }] } },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/* DELETE /api/products/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({ where: { id: params.id } }); // photos kasują się przez onDelete: Cascade
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
