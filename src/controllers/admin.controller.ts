import { Request, Response, NextFunction } from "express";
import { getUsersMany } from "../services/user.service";
import { StatusCodes } from "http-status-codes";

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  const users = await getUsersMany();
  const userId = (req as any).userId ?? null;
  return res.status(StatusCodes.OK).json({
    message: "Retrieved all Users successfully.",
    userId,
    data: users,
  });
};

export { getAllUsers };
