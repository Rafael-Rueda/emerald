import { PrismaPg } from "@prisma/adapter-pg";
import { DocumentStatus, NavigationNodeType, Prisma, PrismaClient, ReleaseVersionStatus, ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";

import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run prisma seed");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "password123";

const gettingStartedContent: Prisma.InputJsonValue = {
    type: "doc",
    version: 1,
    children: [
        {
            type: "heading",
            level: 2,
            id: "getting-started",
            children: [{ type: "text", text: "Getting Started" }],
        },
        {
            type: "paragraph",
            children: [{ type: "text", text: "Welcome to the Emerald guides." }],
        },
    ],
};

const apiReferenceContent: Prisma.InputJsonValue = {
    type: "doc",
    version: 1,
    children: [
        {
            type: "heading",
            level: 2,
            id: "api-reference",
            children: [{ type: "text", text: "API Reference" }],
        },
        {
            type: "paragraph",
            children: [{ type: "text", text: "Explore every endpoint available in Emerald." }],
        },
    ],
};

async function main() {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: "admin@test.com" },
        update: {
            username: "admin",
            passwordHash,
            roles: [ROLES.SUPER_ADMIN],
        },
        create: {
            username: "admin",
            email: "admin@test.com",
            passwordHash,
            roles: [ROLES.SUPER_ADMIN],
        },
    });

    await prisma.user.upsert({
        where: { email: "viewer@test.com" },
        update: {
            username: "viewer",
            passwordHash,
            roles: [ROLES.VIEWER],
        },
        create: {
            username: "viewer",
            email: "viewer@test.com",
            passwordHash,
            roles: [ROLES.VIEWER],
        },
    });

    const space = await prisma.space.upsert({
        where: { key: "guides" },
        update: {
            name: "Guides",
            description: "Product and developer guides",
        },
        create: {
            key: "guides",
            name: "Guides",
            description: "Product and developer guides",
        },
    });

    const releaseVersion = await prisma.releaseVersion.upsert({
        where: {
            spaceId_key: {
                spaceId: space.id,
                key: "v1",
            },
        },
        update: {
            label: "Version 1",
            status: ReleaseVersionStatus.PUBLISHED,
            isDefault: true,
            publishedAt: new Date(),
        },
        create: {
            spaceId: space.id,
            key: "v1",
            label: "Version 1",
            status: ReleaseVersionStatus.PUBLISHED,
            isDefault: true,
            publishedAt: new Date(),
        },
    });

    const gettingStarted = await prisma.document.upsert({
        where: {
            spaceId_slug_releaseVersionId: {
                spaceId: space.id,
                slug: "getting-started",
                releaseVersionId: releaseVersion.id,
            },
        },
        update: {
            title: "Getting Started",
            status: DocumentStatus.PUBLISHED,
            updatedBy: superAdmin.id,
        },
        create: {
            spaceId: space.id,
            releaseVersionId: releaseVersion.id,
            title: "Getting Started",
            slug: "getting-started",
            status: DocumentStatus.PUBLISHED,
            createdBy: superAdmin.id,
            updatedBy: superAdmin.id,
        },
    });

    const apiReference = await prisma.document.upsert({
        where: {
            spaceId_slug_releaseVersionId: {
                spaceId: space.id,
                slug: "api-reference",
                releaseVersionId: releaseVersion.id,
            },
        },
        update: {
            title: "API Reference",
            status: DocumentStatus.PUBLISHED,
            updatedBy: superAdmin.id,
        },
        create: {
            spaceId: space.id,
            releaseVersionId: releaseVersion.id,
            title: "API Reference",
            slug: "api-reference",
            status: DocumentStatus.PUBLISHED,
            createdBy: superAdmin.id,
            updatedBy: superAdmin.id,
        },
    });

    const gettingStartedRevision = await prisma.documentRevision.upsert({
        where: {
            documentId_revisionNumber: {
                documentId: gettingStarted.id,
                revisionNumber: 1,
            },
        },
        update: {
            contentJson: gettingStartedContent,
            renderedHtml: '<h2 id="getting-started">Getting Started</h2><p>Welcome to the Emerald guides.</p>',
            plainText: "Getting Started Welcome to the Emerald guides.",
            changeNote: "Initial release",
            createdBy: superAdmin.id,
        },
        create: {
            documentId: gettingStarted.id,
            revisionNumber: 1,
            contentJson: gettingStartedContent,
            renderedHtml: '<h2 id="getting-started">Getting Started</h2><p>Welcome to the Emerald guides.</p>',
            plainText: "Getting Started Welcome to the Emerald guides.",
            changeNote: "Initial release",
            createdBy: superAdmin.id,
        },
    });

    const apiReferenceRevision = await prisma.documentRevision.upsert({
        where: {
            documentId_revisionNumber: {
                documentId: apiReference.id,
                revisionNumber: 1,
            },
        },
        update: {
            contentJson: apiReferenceContent,
            renderedHtml:
                '<h2 id="api-reference">API Reference</h2><p>Explore every endpoint available in Emerald.</p>',
            plainText: "API Reference Explore every endpoint available in Emerald.",
            changeNote: "Initial release",
            createdBy: superAdmin.id,
        },
        create: {
            documentId: apiReference.id,
            revisionNumber: 1,
            contentJson: apiReferenceContent,
            renderedHtml:
                '<h2 id="api-reference">API Reference</h2><p>Explore every endpoint available in Emerald.</p>',
            plainText: "API Reference Explore every endpoint available in Emerald.",
            changeNote: "Initial release",
            createdBy: superAdmin.id,
        },
    });

    await prisma.document.update({
        where: { id: gettingStarted.id },
        data: {
            currentRevisionId: gettingStartedRevision.id,
            updatedBy: superAdmin.id,
        },
    });

    await prisma.document.update({
        where: { id: apiReference.id },
        data: {
            currentRevisionId: apiReferenceRevision.id,
            updatedBy: superAdmin.id,
        },
    });

    await prisma.navigationNode.deleteMany({
        where: {
            spaceId: space.id,
            releaseVersionId: releaseVersion.id,
        },
    });

    await prisma.navigationNode.createMany({
        data: [
            {
                spaceId: space.id,
                releaseVersionId: releaseVersion.id,
                documentId: gettingStarted.id,
                label: "Getting Started",
                slug: "getting-started",
                order: 0,
                nodeType: NavigationNodeType.DOCUMENT,
            },
            {
                spaceId: space.id,
                releaseVersionId: releaseVersion.id,
                documentId: apiReference.id,
                label: "API Reference",
                slug: "api-reference",
                order: 1,
                nodeType: NavigationNodeType.DOCUMENT,
            },
        ],
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
