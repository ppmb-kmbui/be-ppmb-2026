import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (!global.__prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL belum dikonfigurasi");
    }
    const adapter = new PrismaPg({ connectionString });
    global.__prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return global.__prisma;
}

// Keep the existing import API while initializing Prisma lazily at request time.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
