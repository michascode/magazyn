// src/app/api/products/[id]/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(orig: string) {
  const base = path.basename(orig).replace(/[^\w.\-()+]/g, "_");
  const [name, ext = ""] = (() => {
    const i = base.lastIndexOf(".");
    return i >= 0 ? [base.slice(0, i), base.slice(i)] : [base, ""];
  })();
  const id = crypto.randomUUID();
  return `${Date.now()}-${id}${ext.toLowerCase()}`;
}

async function saveFileToUploads(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = safeName(file.name || "upload.bin");
  const abs = path.join(uploadsDir, filename);
  await writeFile(abs, bytes);

  // ścieżka publiczna (Next serwuje /public pod /)
  const url = `/uploads/${filename}`;
  return { url, width: null, height: null, sizeBytes: bytes.length };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Uwaga: w app routerze params są async.
  const { id } = await ctx.params;

  const ct = req.headers.get("content-type") || "";
  // 1) Gałąź JSON dla akcji reorder
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "reorder" && Array.isArray(body.order)) {
      const order = body.order as string[];

      // Ustawimy 'order' zgodnie z przekazaną kolejnością
      await Promise.all(
        order.map((photoId: string, idx: number) =>
          prisma.photo.update({
            where: { id: photoId },
            data: { order: idx },
          })
        )
      );

      const product = await prisma.product.findUnique({
        where: { id },
        include: { photos: true },
      });

      return NextResponse.json(product, { status: 200 });
    }

    return NextResponse.json(
      { message: "Nieprawidłowe body JSON." },
      { status: 400 }
    );
  }

  // 2) Gałąź multipart/form-data (upload)
  const fd = await req.formData();

  // Zbierz pliki z kilku popularnych nazw pól
  const candidateKeys = ["photos", "photos[]", "file", "files", "image", "images"];
  const all = candidateKeys.flatMap((k) => fd.getAll(k));
  const files = all.filter((v): v is File => v instanceof File && v.size > 0);

  if (files.length === 0) {
    // Pomocna diagnostyka – pokaż jakie klucze faktycznie przyszły
    const presentKeys = Array.from(fd.keys());
    return NextResponse.json(
      {
        message: "Brak plików w polu 'photos'.",
        receivedKeys: presentKeys,
      },
      { status: 400 }
    );
  }

  // zapisz fizyczne pliki i utwórz rekordy Photo
  const saved = await Promise.all(files.map(saveFileToUploads));

  // wstaw rekordy w bazie
  await prisma.$transaction(
    saved.map((f, idx) =>
      prisma.photo.create({
        data: {
          url: f.url,
          role: "PHOTO",
          width: f.width,
          height: f.height,
          sizeBytes: f.sizeBytes,
          isFront: false,
          order: idx,
          product: { connect: { id } },
        },
      })
    )
  );

  const product = await prisma.product.findUnique({
    where: { id },
    include: { photos: true },
  });

  return NextResponse.json(product, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id, photoId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (body?.isFront) {
    // Wyłącz dotychczasowy front i ustaw nowy
    await prisma.$transaction([
      prisma.photo.updateMany({
        where: { productId: id, isFront: true },
        data: { isFront: false },
      }),
      prisma.photo.update({
        where: { id: photoId },
        data: { isFront: true },
      }),
    ]);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { photos: true },
  });

  return NextResponse.json(product, { status: 200 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id, photoId } = await ctx.params;

  await prisma.photo.delete({ where: { id: photoId } });

  const product = await prisma.product.findUnique({
    where: { id },
    include: { photos: true },
  });

  return NextResponse.json(product, { status: 200 });
}
