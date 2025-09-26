/* eslint-disable no-console */
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// prosta heurystyka roli ze stringa
function guessRole(fileName: string): string {
  const lower = (fileName || "").toLowerCase();
  if (lower.includes("front") || lower.includes("prz")) return "front";
  if (lower.includes("back") || lower.includes("tyl") || lower.includes("tył")) return "back";
  if (lower.includes("a/b") || lower.includes("measure1") || lower.includes("ab")) return "measure1";
  if (lower.includes("c") || lower.includes("measure2")) return "measure2";
  return "extra";
}

/** GET – lista zdjęć produktu (zawsze z sortem po isFront i createdAt) */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const photos = await prisma.photo.findMany({
      where: { productId: params.id },
      orderBy: [{ isFront: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items: photos }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/** POST – upload wielu plików */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const created: any[] = [];

    for (const f of files) {
      const arrayBuffer = await f.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      const fname = `${Date.now()}-${crypto.randomUUID()}-${f.name}`.replace(/\s+/g, "_");
      const filePath = path.join(UPLOAD_DIR, fname);
      await fs.writeFile(filePath, buf);

      const role = guessRole(f.name);

      const photo = await prisma.photo.create({
        data: {
          productId: params.id,
          url: `/uploads/${fname}`,
          role,
          width: null,
          height: null,
          sizeBytes: f.size ?? buf.byteLength, // <- NAPRAWA: sizeBytes zawsze obecne
          isFront: role === "front",
          order: 9999, // tymczasowa; faktyczną kolejność mamy z D&D
        },
      });

      created.push({
        id: photo.id,
        url: photo.url,
        role: photo.role,
        width: photo.width,
        height: photo.height,
        sizeBytes: photo.sizeBytes,
        isFront: photo.isFront,
        order: typeof (photo as any).order === "number" ? (photo as any).order : 0,
      });
    }

    return NextResponse.json({ items: created }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    // typowy FK/constraint -> zwracamy jasno
    return NextResponse.json(
      { error: e?.message ?? "Upload error" },
      { status: 500 }
    );
  }
}

/** PATCH – akcje: setFront / reorder */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (body?.action === "setFront" && body?.photoId) {
      await prisma.$transaction([
        prisma.photo.updateMany({
          where: { productId: params.id, isFront: true },
          data: { isFront: false },
        }),
        prisma.photo.update({
          where: { id: body.photoId },
          data: { isFront: true },
        }),
      ]);

      const photos = await prisma.photo.findMany({
        where: { productId: params.id },
        orderBy: [{ isFront: "desc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items: photos }, { status: 200 });
    }

    if (body?.action === "reorder" && Array.isArray(body?.order)) {
      const ops = body.order.map((photoId: string, idx: number) =>
        prisma.photo.update({ where: { id: photoId }, data: { order: idx + 1 } })
      );
      await prisma.$transaction(ops);

      const photos = await prisma.photo.findMany({
        where: { productId: params.id },
        orderBy: [{ isFront: "desc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items: photos }, { status: 200 });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/** DELETE – usunięcie zdjęcia */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");
    if (!photoId) return NextResponse.json({ error: "Missing photoId" }, { status: 400 });

    const photo = await prisma.photo.delete({ where: { id: photoId } });

    // spróbuj usunąć fizyczny plik (best effort)
    try {
      const abs = path.join(process.cwd(), "public", photo.url.replace(/^\/+/, ""));
      await fs.unlink(abs);
    } catch {
      /* ignore */
    }

    const photos = await prisma.photo.findMany({
      where: { productId: params.id },
      orderBy: [{ isFront: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items: photos }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
