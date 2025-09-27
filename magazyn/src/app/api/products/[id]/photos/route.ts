// src/app/api/products/[id]/photos/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import fs from "node:fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (_) {}
}

function photoSelect() {
  return {
    id: true,
    createdAt: true,
    url: true,
    role: true,
    width: true,
    height: true,
    sizeBytes: true,
    isFront: true,
    order: true,
    productId: true,
  };
}

function includeProductWithPhotos() {
  return {
    photos: {
      orderBy: [{ isFront: "desc" as const }, { order: "asc" as const }, { createdAt: "asc" as const }],
    },
  };
}

/** Zwraca produkt z posortowanymi zdjęciami */
async function fetchProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: includeProductWithPhotos(),
  });
}

/* ------------------------------ POST (upload/reorder) ------------------------------ */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  // 1) Spróbuj JSON (akcja reorder)
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json().catch(() => ({} as any));
      if (body.action === "reorder") {
        const order = body.order as string[] | undefined;
        if (!Array.isArray(order) || order.length === 0) {
          return NextResponse.json({ error: "Invalid 'order' payload" }, { status: 400 });
        }

        // Pobierz aktualne zdjęcia dla produktu
        const photos = await prisma.photo.findMany({
          where: { productId },
          select: { id: true },
        });
        const dbIds = photos.map(p => p.id);
        const reqIds = order;

        // Walidacje:
        const uniqueReqIds = new Set(reqIds);
        if (uniqueReqIds.size !== reqIds.length) {
          return NextResponse.json({ error: "Duplicate IDs in 'order' array" }, { status: 400 });
        }
        // Zestawy muszą się pokrywać 1:1
        if (dbIds.length !== reqIds.length ||
            dbIds.some(id => !uniqueReqIds.has(id))) {
          return NextResponse.json({ error: "Order must include exactly all photo IDs of this product" }, { status: 400 });
        }

        // Aktualizacja w transakcji
        await prisma.$transaction(
          reqIds.map((photoId, idx) =>
            prisma.photo.update({
              where: { id: photoId },
              data: { order: idx },
              select: { id: true },
            })
          )
        );

        const product = await fetchProduct(productId);
        return NextResponse.json(product);
      }

      return NextResponse.json({ error: "Unknown JSON action" }, { status: 400 });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Failed to process JSON body" }, { status: 400 });
    }
  }

  // 2) FormData (upload)
  await ensureUploadDir();

  const form = await req.formData();
  const files = form.getAll("photos").filter(Boolean) as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  // Ustal order startowy (za końcem obecnych)
  const existing = await prisma.photo.findMany({
    where: { productId },
    select: { id: true, order: true },
    orderBy: [{ order: "asc" }],
  });
  let baseOrder = existing.length ? (existing[existing.length - 1].order ?? 0) + 1 : 0;

  const created: string[] = [];

  for (const f of files) {
    const bytes = await f.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = (f.type && f.type.includes("jpeg")) ? "jpg"
              : (f.type && f.type.includes("png")) ? "png"
              : (f.name?.split(".").pop() || "bin");
    const fileName = `${productId}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const rel = `/uploads/${fileName}`;
    const abs = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(abs, buffer);

    const role = baseOrder === 0 ? "front" : "gallery";

    const p = await prisma.photo.create({
      data: {
        url: rel,
        role,
        isFront: baseOrder === 0, // pierwsze zdjęcie ustaw jako front
        order: baseOrder,
        sizeBytes: buffer.length,
        productId,
      },
      select: photoSelect(),
    });

    created.push(p.id);
    baseOrder += 1;
  }

  // Jeżeli to pierwsza partia zdjęć, dopilnuj, że właśnie dodane pierwsze jest frontem
  const product = await fetchProduct(productId);
  return NextResponse.json(product);
}

/* ------------------------------ PATCH (set front) ------------------------------ */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; photoId?: string }> }
) {
  const { id: productId, photoId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { isFront } = body ?? {};

    if (typeof isFront !== "boolean") {
      return NextResponse.json({ error: "Missing 'isFront' boolean" }, { status: 400 });
    }
    if (!photoId) {
      return NextResponse.json({ error: "Missing photoId" }, { status: 400 });
    }

    // Sprawdź, czy zdjęcie należy do produktu
    const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true, productId: true } });
    if (!photo || photo.productId !== productId) {
      return NextResponse.json({ error: "Photo not found for this product" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.photo.updateMany({ where: { productId }, data: { isFront: false } }),
      prisma.photo.update({ where: { id: photoId }, data: { isFront: true, role: "front" } }),
    ]);

    const product = await fetchProduct(productId);
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set front photo" }, { status: 500 });
  }
}

/* ------------------------------ DELETE (remove photo) ------------------------------ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: productId, photoId } = await params;

  try {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { id: true, url: true, productId: true, isFront: true },
    });

    if (!photo || photo.productId !== productId) {
      return NextResponse.json({ error: "Photo not found for this product" }, { status: 404 });
    }

    // Usuń z dysku (jeśli lokalny upload)
    if (photo.url && photo.url.startsWith("/uploads/")) {
      const abs = path.join(process.cwd(), "public", photo.url);
      fs.unlink(abs).catch(() => {});
    }

    await prisma.photo.delete({ where: { id: photoId } });

    // Jeżeli kasowaliśmy front – ustaw inny jako front (najstarszy po order/createdAt)
    if (photo.isFront) {
      const nextFront = await prisma.photo.findFirst({
        where: { productId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      if (nextFront) {
        await prisma.photo.update({ where: { id: nextFront.id }, data: { isFront: true, role: "front" } });
      }
    }

    const product = await fetchProduct(productId);
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
