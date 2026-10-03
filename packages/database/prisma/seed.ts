import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const permissions = [
  ['users.read', 'users', 'read', 'View users'],
  ['users.manage', 'users', 'manage', 'Create, update, suspend, and delete users'],
  ['roles.read', 'roles', 'read', 'View roles and permissions'],
  ['roles.manage', 'roles', 'manage', 'Create, update, and assign roles and permissions'],
  ['videos.read', 'videos', 'read', 'View videos'],
  ['videos.create', 'videos', 'create', 'Upload and create videos'],
  ['videos.update', 'videos', 'update', 'Update video metadata and publishing settings'],
  ['videos.delete', 'videos', 'delete', 'Delete videos'],
  ['analytics.read', 'analytics', 'read', 'View video and advertising analytics'],
  ['ads.read', 'ads', 'read', 'View advertisers, campaigns, and ads'],
  ['ads.manage', 'ads', 'manage', 'Create, update, and manage advertising campaigns'],
  ['settings.manage', 'settings', 'manage', 'Manage VaultStream settings'],
] as const;

const rolePermissions = {
  ADMIN: permissions.map(([key]) => key),
  CREATOR: ['videos.read', 'videos.create', 'videos.update', 'videos.delete', 'analytics.read'],
  ANALYST: ['videos.read', 'analytics.read', 'ads.read'],
  ADVERTISER: ['ads.read', 'ads.manage'],
  VIEWER: ['videos.read'],
} as const;

async function main() {
  const permissionRecords = await Promise.all(
    permissions.map(([key, resource, action, description]) =>
      prisma.permission.upsert({
        where: { key },
        update: { resource, action, description },
        create: { key, resource, action, description },
      }),
    ),
  );

  const permissionByKey = new Map(permissionRecords.map((permission) => [permission.key, permission.id]));

  for (const [name, permissionKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { isSystem: true },
      create: { name, isSystem: true },
    });

    await prisma.rolePermission.createMany({
      data: permissionKeys.map((key) => ({
        roleId: role.id,
        permissionId: permissionByKey.get(key)!,
      })),
      skipDuplicates: true,
    });
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@vaultstream.local';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    // Do not overwrite an existing administrator's password when the seed runs again.
    update: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'VaultStream',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.info(`Seeded VaultStream RBAC and admin user: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
