import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, $Enums } from "@prisma/client";

/**
 * GET /api/products
 * query params:
 *  - query
 *  - brands (comma)
 *  - sizes (comma)
 *  - condition
 *  - status
 *  - page (1-based)
 *  - limit
 *  - sort: CREATED_DESC | CREATED_ASC | PRICE_DESC | PRICE_ASC
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") ?? "").trim();
    const brands = (url.searchParams.get("brands") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const sizes = (url.searchParams.get("sizes") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const condition = (url.searchParams.get("condition") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "8")));
    const sortKey = url.searchParams.get("sort") ?? "CREATED_DESC";

    const where: Prisma.ProductWhereInput = {};

    if (query) {
      where.title = { contains: query, mode: "insensitive" };
    }
    if (brands.length) {
      where.brand = { in: brands };
    }
    if (sizes.length) {
      where.size = { in: sizes };
    }
    if (condition) {
      where.condition = condition;
    }
    if (status) {
      // Prisma enum jest stringiem – runtime’owo to zadziała
      where.status = status as $Enums.ProductStatus;
    }

    const orderBy =
      sortKey === "CREATED_ASC"
        ? { createdAt: "asc" as const }
        : sortKey === "PRICE_DESC"
        ? { priceCents: "desc" as const }
        : sortKey === "PRICE_ASC"
        ? { priceCents: "asc" as const }
        : { createdAt: "desc" as const };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          photos: { orderBy: [{ isFront: "desc" }, { createdAt: "asc" }] },
        },
      }),
    ]);

    // FACETS – z całej tabeli (niezależnie od filtrów), aby dropdowny zawsze miały pełne opcje
    const [allBrands, allSizes, allConditions, allStatuses] = await Promise.all([
      prisma.product.findMany({ select: { brand: true }, distinct: ["brand"] }),
      prisma.product.findMany({ select: { size: true }, distinct: ["size"] }),
      prisma.product.findMany({ select: { condition: true }, distinct: ["condition"] }),
      prisma.product.findMany({ select: { status: true }, distinct: ["status"] }),
    ]);

    return NextResponse.json({
      total,
      items,
      facets: {
        brands: allBrands.map((x) => x.brand).filter(Boolean) as string[],
        sizes: allSizes.map((x) => x.size).filter(Boolean) as string[],
        conditions: allConditions.map((x) => x.condition).filter(Boolean) as string[],
        statuses: allStatuses.map((x) => x.status) as $Enums.ProductStatus[],
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "List failed" }, { status: 400 });
  }
}

/**
 * POST /api/products
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const status: $Enums.ProductStatus =
      (body.status as $Enums.ProductStatus) ?? "NA_MAGAZYNIE";

    const created = await prisma.product.create({
      data: {
        title: body.title ?? "Nowy produkt",
        status,
        priceCents: body.priceCents ?? 0, // <--- WYMAGANE
        brand: body.brand ?? null,
        size: body.size ?? null,
        condition: body.condition ?? null,
        notes: body.notes ?? null,
      },
      include: {
        photos: { orderBy: [{ isFront: "desc" }, { createdAt: "asc" }] },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Create failed" }, { status: 400 });
  }
}

