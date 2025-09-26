import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs"; // wymagane do użycia fs

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku 'file' w form-data" }, { status: 400 });
    }

    // ograniczenie rozmiaru (np. 10MB)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Plik większy niż 10MB" }, { status: 413 });
    }

    // katalog docelowy
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // bezpieczna nazwa pliku
    const ext = path.extname(file.name || "").toLowerCase() || ".bin";
    const name = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, name);

    await fs.writeFile(filepath, bytes);

    // publiczny URL (Next serwuje /public pod rootem)
    const url = `/uploads/${name}`;

    return NextResponse.json({
      url,
      sizeBytes: bytes.length,
      // width/height tu pomijamy (bez dodatkowych zależności typu sharp)
      width: null,
      height: null,
    });
  } catch (e) {
    console.error("POST /api/uploads error:", e);
    return NextResponse.json({ error: "Nie udało się zapisać pliku." }, { status: 500 });
  }
}
