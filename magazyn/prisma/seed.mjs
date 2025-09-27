// prisma/seed.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const BRANDS = ['Zara', 'H&M', 'Reserved', 'House', 'Cropp', 'Only', 'New Look'];
const SIZES  = ['XS','S','M','L','XL','XXL'];
const CONDITIONS = ['NOWY','BARDZO_DOBRY','DOBRY','ŚREDNI'];
const STATUSES = ['NA_MAGAZYNIE','ZAREZERWOWANY','SPRZEDANY'];

async function main() {
  console.log('💾 Seeding…');

  // Wyczyść dane (ostrożnie; to seed dev)
  await prisma.photo.deleteMany({});
  await prisma.product.deleteMany({});

  // Dodaj kilka produktów
  const toCreate = Array.from({ length: 8 }).map((_, i) => ({
    title: `Produkt #${i+1}`,
    brand: pick(BRANDS),
    size: pick(SIZES),
    condition: pick(CONDITIONS),
    status: pick(STATUSES),
    priceCents: (50 + Math.floor(Math.random()*400)) * 100,
    notes: i % 2 === 0 ? 'Przykładowe notatki…' : null,
    sku: `SKU-${1000+i}`,
    dimA: Math.round(30 + Math.random()*50),
    dimB: Math.round(30 + Math.random()*50),
    dimC: Math.round(30 + Math.random()*50),
  }));

  for (const data of toCreate) {
    const product = await prisma.product.create({ data });
    // Dorzuć 1–3 zdjęcia z picsum (zostawiamy sizeBytes=0 – to pole jest wymagane, ale nie potrzebujemy realnej wagi)
    const photos = Array.from({ length: 1 + Math.floor(Math.random()*3) }).map((_, idx) => ({
      url: `https://picsum.photos/seed/${product.id}-${idx}/800/600`,
      role: idx === 0 ? 'front' : 'gallery',
      isFront: idx === 0,
      order: idx,
      sizeBytes: 0,
      productId: product.id,
    }));
    await prisma.photo.createMany({ data: photos });
  }

  console.log('✅ Seed done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
