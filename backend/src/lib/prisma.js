// Exposes one shared Prisma client instance for all database queries in the backend.
import { PrismaClient } from "@prisma/client";

// Reuse the same Prisma client in development to avoid too many connections.
const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
