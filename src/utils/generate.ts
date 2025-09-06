import { randomBytes } from "crypto";

const generateOTP = () => {
  return (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 100000;
};

const generateToken = () => {
  return randomBytes(32).toString("hex");
};

export { generateOTP, generateToken };
