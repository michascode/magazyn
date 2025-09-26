// server/prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // wyczyść (na potrzeby powtarzalnego seedowania)
  await prisma.photo.deleteMany();
  await prisma.product.deleteMany();

  const p1 = await prisma.product.create({
    data: {
      title: 'Nike Air Zoom',
      brand: 'Nike',
      size: '42',
      condition: 'new',
      photos: {
        create: [
          { url: 'https://picsum.photos/seed/nike/600/400' },
          { url: 'https://picsum.photos/seed/nike2/600/400' },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      title: 'Adidas Ultraboost',
      brand: 'Adidas',
      size: '44',
      condition: 'used',
      photos: {
        create: [{ url: 'https://picsum.photos/seed/adidas/600/400' }],
      },
    },
  });

  console.log('Seed done:', { p1: p1.id, p2: p2.id });
}

main().catch(console.error).finally(() => prisma.$disconnect());
