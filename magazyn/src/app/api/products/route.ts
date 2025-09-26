/* eslint-disable no-console */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SortKey = "CREATED_ASC" | "CREATED_DESC" | "PRICE_ASC" | "PRICE_DESC";

function mapSort(sortKey: SortKey | undefined) {
  switch (sortKey) {
    case "CREATED_ASC":
      return [{ createdAt: "asc" } as const];
    case "PRICE_ASC":
      return [{ priceCents: "asc" } as const, { createdAt: "desc" } as const];
    case "PRICE_DESC":
      return [{ priceCents: "desc" } as const, { createdAt: "desc" } as const];
    case "CREATED_DESC":
    default:
      return [{ createdAt: "desc" } as const];
  }
}

/**
 * GET /api/products
 * Filtry:
 *  - query (po tytule / sku)
 *  - brands   -> CSV, np. ?brands=Zara,VERO%20MODA  (puste => wszystkie)
 *  - sizes    -> CSV, np. ?sizes=XS,XL               (puste => wszystkie)
 *  - condition, status, sku
 *  - page, limit
 *  - sort (CREATED_ASC|CREATED_DESC|PRICE_ASC|PRICE_DESC)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const query = (sp.get("query") ?? "").trim();
    const condition = (sp.get("condition") ?? "").trim();
    const status = (sp.get("status") ?? "").trim();
    const sku = (sp.get("sku") ?? "").trim();

    // NOWE: multi-wybory po CSV
    const brandsQ = (sp.get("brands") ?? "").trim();
    const sizesQ = (sp.get("sizes") ?? "").trim();

    const brands = brandsQ ? brandsQ.split(",").map(s => s.trim()).filter(Boolean) : [];
    const sizes  = sizesQ  ? sizesQ.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Dla kompatybilności (stare zakładki z pojedynczym brand/size):
    const brandSingle = (sp.get("brand") ?? "").trim();
    const sizeSingle  = (sp.get("size")  ?? "").trim();

    const sortKey = (sp.get("sort") as SortKey | null) ?? "CREATED_DESC";
    const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "30") || 30));
    const skip = (page - 1) * limit;

    // SQLite — bez mode: 'insensitive'
    const where: any = { AND: [] as any[] };

    if (query) {
      // najczęściej wystarczy po title, ewentualnie sku
      where.AND.push({
        OR: [
          { title: { contains: query } },
          { sku: { contains: query } },
        ],
      });
    }

    if (brands.length) {
      where.AND.push({ brand: { in: brands } });
    } else if (brandSingle) {
      where.AND.push({ brand: { contains: brandSingle } });
    }

    if (sizes.length) {
      where.AND.push({ size: { in: sizes } });
    } else if (sizeSingle) {
      where.AND.push({ size: { contains: sizeSingle } });
    }

    if (condition) where.AND.push({ condition: { contains: condition } });
    if (status)    where.AND.push({ status: { equals: status } });
    if (sku)       where.AND.push({ sku: { contains: sku } });

    if (where.AND.length === 0) delete where.AND;

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: mapSort(sortKey ?? undefined),
        include: {
          photos: {
            orderBy: [{ isFront: "desc" }, { order: "asc" }, { createdAt: "asc" }],
          },
        },
        skip,
        take: limit,
      }),
    ]);

    /**
     * FACETY do selectów (tylko to, co jest na magazynie)
     */
    const onStock = { status: "NA_MAGAZYNIE" as const };

    const [brandsRows, sizesRows, conditionsRows, statusesRows] = await Promise.all([
      prisma.product.findMany({ where: onStock, select: { brand: true }, distinct: ["brand"] }),
      prisma.product.findMany({ where: onStock, select: { size: true }, distinct: ["size"] }),
      prisma.product.findMany({ where: onStock, select: { condition: true }, distinct: ["condition"] }),
      prisma.product.findMany({ select: { status: true }, distinct: ["status"] }), // wszystkie statusy które istnieją
    ]);

    const sortAlpha = (a: string, b: string) => a.localeCompare(b, "pl", { sensitivity: "base" });
    const isStr = (v: string | null | undefined): v is string =>
      typeof v === "string" && v.length > 0;

    const facets = {
      brands:     brandsRows.map(b => b.brand).filter(isStr).sort(sortAlpha),
      sizes:      sizesRows.map(s => s.size).filter(isStr).sort(sortAlpha),
      conditions: conditionsRows.map(c => c.condition).filter(isStr).sort(sortAlpha),
      statuses:   statusesRows.map(s => s.status).filter(isStr).sort(sortAlpha),
    };

    return NextResponse.json({ total, items, facets }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Tworzenie nowego produktu
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const created = await prisma.product.create({
      data: {
        title: body.title,
        brand: body.brand ?? "",
        size: body.size ?? "",
        condition: body.condition ?? "",
        status: body.status ?? "NA_MAGAZYNIE",
        priceCents: Number(body.priceCents ?? 0) || 0,
        dimA: body.dimA ?? null,
        dimB: body.dimB ?? null,
        dimC: body.dimC ?? null,
        notes: body.notes ?? null,
        sku: body.sku ?? null,
      },
      include: { photos: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
