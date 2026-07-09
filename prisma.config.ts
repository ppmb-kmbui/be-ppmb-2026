import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI commands and migrations should use Supabase session pooler.
    // The application runtime still uses DATABASE_URL in src/lib/prisma.ts.
    url: env("DIRECT_URL"),
  },
});
