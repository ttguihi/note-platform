// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: ['query'], // 开启查询日志，方便调试看 SQL
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma