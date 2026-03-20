import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

export default async function globalTeardown() {
    dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("\n❌ DATABASE_URL not found in .env.test");
        return;
    }

    const adapter = new PrismaPg({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        await prisma.$connect();
        await prisma.user.deleteMany();
        console.log("\n✅ Test database cleaned successfully");
    } catch (error) {
        console.error("\n❌ Error cleaning test database:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}
