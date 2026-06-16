import { PrismaClient, PaymentType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'rafael.crdistribuidora@gmail.com';
const RECOVERY_EMAIL = 'recuperacao@gestorj2.local';

const RESELLER_EMAIL = 'revendedor.demo@gestorj2.local';
const RESELLER_PHONE = '+55 11 99999-0001';

const SERVER_NAME = 'Servidor Premium';
const RESELLER_LOGIN = 'revendedor_demo';

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const recoveryPassword = process.env.SEED_RECOVERY_PASSWORD;
  const resellerPassword = process.env.SEED_RESELLER_PASSWORD;
  const resetPasswords = process.env.SEED_RESET_PASSWORDS === 'true';

  if (!adminPassword || !recoveryPassword || !resellerPassword) {
    throw new Error(
      'Configure SEED_ADMIN_PASSWORD, SEED_RECOVERY_PASSWORD e SEED_RESELLER_PASSWORD antes de executar o seed.',
    );
  }

  // POLÃTICA 2-ADMINS: nunca cria um 2Âº admin operacional nem uma 2Âª conta de recuperaÃ§Ã£o.
  const otherAdmin = await prisma.user.findFirst({
    where: { role: UserRole.admin, email: { not: ADMIN_EMAIL } },
  });
  if (otherAdmin) {
    throw new Error(
      `JÃ¡ existe um admin operacional (${otherAdmin.email}). O sistema permite apenas 1 â€” abortando para nÃ£o criar outro.`,
    );
  }
  const otherRecovery = await prisma.user.findFirst({
    where: { role: UserRole.recovery, email: { not: RECOVERY_EMAIL } },
  });
  if (otherRecovery) {
    throw new Error(
      `JÃ¡ existe uma conta de recuperaÃ§Ã£o (${otherRecovery.email}). O sistema permite apenas 1 â€” abortando.`,
    );
  }

  const [adminPasswordHash, recoveryPasswordHash, resellerPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(recoveryPassword, 12),
    bcrypt.hash(resellerPassword, 12),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: 'Rafael CR Distribuidora',
      phone: '+55 11 99999-0000',
      role: UserRole.admin,
      status: UserStatus.active,
      paymentType: PaymentType.prepaid,
      ...(resetPasswords ? { passwordHash: adminPasswordHash } : {}),
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      name: 'Rafael CR Distribuidora',
      phone: '+55 11 99999-0000',
      role: UserRole.admin,
      status: UserStatus.active,
      paymentType: PaymentType.prepaid,
    },
  });

  // Conta de recuperaÃ§Ã£o (fallback/seguranÃ§a): sÃ³ troca credenciais do admin operacional.
  await prisma.user.upsert({
    where: { email: RECOVERY_EMAIL },
    update: {
      name: 'Conta de RecuperaÃ§Ã£o',
      role: UserRole.recovery,
      status: UserStatus.active,
      ...(resetPasswords ? { passwordHash: recoveryPasswordHash } : {}),
    },
    create: {
      email: RECOVERY_EMAIL,
      passwordHash: recoveryPasswordHash,
      name: 'Conta de RecuperaÃ§Ã£o',
      role: UserRole.recovery,
      status: UserStatus.active,
    },
  });

  const reseller = await prisma.user.upsert({
    where: { email: RESELLER_EMAIL },
    update: {
      name: 'Revendedor Demo',
      phone: RESELLER_PHONE,
      role: UserRole.reseller,
      status: UserStatus.active,
      paymentType: PaymentType.prepaid,
      parentId: admin.id,
      ...(resetPasswords ? { passwordHash: resellerPasswordHash } : {}),
    },
    create: {
      email: RESELLER_EMAIL,
      passwordHash: resellerPasswordHash,
      name: 'Revendedor Demo',
      phone: RESELLER_PHONE,
      role: UserRole.reseller,
      status: UserStatus.active,
      paymentType: PaymentType.prepaid,
      parentId: admin.id,
    },
  });

  const existingServer = await prisma.server.findFirst({
    where: { name: SERVER_NAME, ownerId: admin.id },
  });

  const server = existingServer
    ? await prisma.server.update({
        where: { id: existingServer.id },
        data: {
          panelLink: 'https://premium.gestorj2.local/painel',
          costPerCredit: '4.5000',
          valuePerCredit: '6.0000',
          active: true,
        },
      })
    : await prisma.server.create({
        data: {
          name: SERVER_NAME,
          panelLink: 'https://premium.gestorj2.local/painel',
          costPerCredit: '4.5000',
          valuePerCredit: '6.0000',
          ownerId: admin.id,
          active: true,
        },
      });

  await prisma.resellerServer.upsert({
    where: {
      resellerId_serverId_login: {
        resellerId: reseller.id,
        serverId: server.id,
        login: RESELLER_LOGIN,
      },
    },
    update: {
      valuePerCredit: '6.5000',
      active: true,
    },
    create: {
      resellerId: reseller.id,
      serverId: server.id,
      login: RESELLER_LOGIN,
      valuePerCredit: '6.5000',
      active: true,
    },
  });

  await prisma.settings.upsert({
    where: { adminId: admin.id },
    update: {
      companyName: 'Gestor J2',
      adminWhatsapp: '+55 11 99999-0000',
      whatsappProvider: 'evolution',
      evolutionApiUrl: 'https://evolution.gestorj2.local',
      evolutionInstance: 'gestor-j2-dev',
      evolutionApiKeyRef: 'EVOLUTION_API_KEY',
      pixKeys: [
        {
          type: 'email',
          key: ADMIN_EMAIL,
          label: 'Pix principal',
        },
      ],
    },
    create: {
      adminId: admin.id,
      companyName: 'Gestor J2',
      adminWhatsapp: '+55 11 99999-0000',
      whatsappProvider: 'evolution',
      evolutionApiUrl: 'https://evolution.gestorj2.local',
      evolutionInstance: 'gestor-j2-dev',
      evolutionApiKeyRef: 'EVOLUTION_API_KEY',
      pixKeys: [
        {
          type: 'email',
          key: ADMIN_EMAIL,
          label: 'Pix principal',
        },
      ],
    },
  });

  console.log('Seed inicial concluido.');
  console.log(`Admin operacional: ${ADMIN_EMAIL}`);
  console.log(`Conta de recuperacao: ${RECOVERY_EMAIL}`);
  console.log(`Revendedor demo: ${RESELLER_EMAIL}`);
}

main()
  .catch((error) => {
    console.error('Falha ao executar seed inicial:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


