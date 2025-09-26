import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") ?? undefined;
    const brand = searchParams.get("brand") ?? undefined;
    const size = searchParams.get("size") ?? undefined;
    const condition = searchParams.get("condition") as
      | "NOWY"
      | "BARDZO_DOBRY"
      | "DOBRY"
      | "SREDNI"
      | null;

    const sort = (searchParams.get("sort") ?? "createdAt") as
      | "createdAt"
      | "priceCents"
      | "title";
    const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";

    const where = {
      AND: [
        query ? { title: { contains: query } } : {},
        brand ? { brand: { equals: brand } } : {},
        size ? { size: { equals: size } } : {},
        condition ? { condition } : {},
      ],
    };

    const items = await prisma.product.findMany({
      where,
      orderBy: { [sort]: order },
      include: { photos: true },
      take: 10000, // górny limit bezpieczeństwa
    });

    const header = [
      "id",
      "title",
      "brand",
      "size",
      "condition",
      "status",
      "priceCents",
      "dimA",
      "dimB",
      "dimC",
      "sku",
      "createdAt",
      "updatedAt",
      "frontUrl",
    ];

    const rows = items.map((p) => [
      p.id,
      p.title ?? "",
      p.brand ?? "",
      p.size ?? "",
      p.condition,
      p.status,
      String(p.priceCents ?? ""),
      p.dimA != null ? String(p.dimA) : "",
      p.dimB != null ? String(p.dimB) : "",
      p.dimC != null ? String(p.dimC) : "",
      p.sku ?? "",
      p.createdAt.toISOString(),
      p.updatedAt.toISOString(),
      (p.photos.find((ph) => ph.role === "front")?.url ?? p.photos[0]?.url ?? "") || "",
    ]);

    const content =
      header.join(",") +
      "\n" +
      rows.map((r) => r.map((c) => csvEscape(String(c))).join(",")).join("\n");

    const res = new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products_export.csv"`,
      },
    });
    return res;
  } catch (e) {
    console.error("GET /api/products/export error:", e);
    return NextResponse.json(
      { error: "Nie udało się wyeksportować CSV." },
      { status: 500 }
    );
  }
}
