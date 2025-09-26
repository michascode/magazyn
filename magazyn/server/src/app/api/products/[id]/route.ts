import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteParams = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<RouteParams> }) {
  try {
    const { id } = await ctx.params;           // <-- ważne: await
    const trimmed = id?.trim();

    if (!trimmed) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: trimmed },
      include: { photos: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (err) {
    console.error("[GET /api/products/[id]] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
