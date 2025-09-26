import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Query = {
  search?: string | null;
  page?: string | null;
  limit?: string | null;
};

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const q: Query = {
      search: sp.get("search"),
      page: sp.get("page"),
      limit: sp.get("limit"),
    };

    const page = Math.max(1, Number(q.page ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? "20") || 20));

    const where =
      q.search && q.search.trim().length
        ? {
            OR: [
              { title: { contains: q.search, mode: "insensitive" as const } },
              { brand: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { photos: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json(
      { data, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/products] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
