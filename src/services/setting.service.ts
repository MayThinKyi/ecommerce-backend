import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const getSetting = (key: string) => {
  return prisma.setting.findUnique({
    where: { key },
  });
};

const createOrUpdateSetting = (key: string, value: string) => {
  return prisma.setting.upsert({
    where: { key },
    update: { key, value },
    create: { key, value },
  });
};

export { getSetting, createOrUpdateSetting };
