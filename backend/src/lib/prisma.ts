import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function initDB() {
  await prisma.$queryRaw`PRAGMA journal_mode = WAL`
  await prisma.$queryRaw`PRAGMA synchronous = NORMAL`
  await prisma.$queryRaw`PRAGMA busy_timeout = 5000`
  await prisma.$queryRaw`PRAGMA foreign_keys = ON`
}
