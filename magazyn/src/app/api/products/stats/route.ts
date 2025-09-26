import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/products/stats
 * Zwraca:
 * - countsByBrand: [{ brand, _count }]
 * - countsByStatus: [{ status, _count }]
 * - avgPriceByBrand: [{ brand, _avg: { priceCents } }]
 * - totalOnStock
 */
export async function GET() {
  try {
    const [countsByBrand, countsByStatus, avgPriceByBrand, totalOnStock] = await Promise.all([
      prisma.product.groupBy({
        by: ["brand"],
        where: { brand: { not: "" } },
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["brand"],
        where: { brand: { not: "" } },
        _avg: { priceCents: true },
      }),
      prisma.product.count({ where: { status: "NA_MAGAZYNIE" } }),
    ]);

    return NextResponse.json({
      countsByBrand,
      countsByStatus,
      avgPriceByBrand,
      totalOnStock,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
