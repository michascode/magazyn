import { PrismaClient } from "@prisma/client";

console.log("DATABASE_URL at runtime:", process.env.DATABASE_URL); // <-- tymczasowo

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
