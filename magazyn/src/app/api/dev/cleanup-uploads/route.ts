// src/app/api/dev/cleanup-uploads/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "node:path";
import fs from "node:fs/promises";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Jeśli katalog nie istnieje – nic nie rób
  try {
    await fs.access(uploadsDir);
  } catch {
    return NextResponse.json({ removed: [], kept: [], message: "uploads directory not found" });
  }

  // Zbierz wszystkie URL-e z DB, które wskazują do /uploads/
  const photos = await prisma.photo.findMany({ select: { url: true } });
  const used = new Set(
    photos
      .map((p) => p.url || "")
      .filter((u) => typeof u === "string" && u.startsWith("/uploads/"))
      .map((u) => u.replace(/^\/uploads\//, ""))
  );

  const allFiles = await fs.readdir(uploadsDir);
  const toRemove: string[] = [];
  const toKeep: string[] = [];

  for (const f of allFiles) {
    if (used.has(f)) toKeep.push(f);
    else toRemove.push(f);
  }

  // Usuń osierocone
  await Promise.all(
    toRemove.map((f) => fs.unlink(path.join(uploadsDir, f)).catch(() => {}))
  );

  return NextResponse.json({
    removed: toRemove,
    kept: toKeep,
    summary: `removed ${toRemove.length}, kept ${toKeep.length}`,
  });
}
