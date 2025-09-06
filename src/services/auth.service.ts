import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const getUserByPhone = (phone: string) => {
  return prisma.user.findUnique({
    where: { phone },
  });
};

const getUserById = (id: number) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

const getOTPByPhone = (phone: string) => {
  return prisma.otp.findUnique({
    where: { phone },
  });
};

const createOTP = (otpData: any) => {
  return prisma.otp.create({
    data: otpData,
  });
};

const updateOTP = (otpId: number, otpData: any) => {
  return prisma.otp.update({
    where: { id: otpId },
    data: otpData,
  });
};

const createUser = (userData: any) => {
  return prisma.user.create({
    data: userData,
  });
};

const updateUser = (userId: number, userData: any) => {
  return prisma.user.update({
    where: { id: userId },
    data: userData,
  });
};

export {
  getUserByPhone,
  getUserById,
  getOTPByPhone,
  createOTP,
  updateOTP,
  createUser,
  updateUser,
};
