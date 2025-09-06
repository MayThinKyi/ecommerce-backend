import { errorCode } from "./../config/errorCode";
import express, { NextFunction, Request, Response } from "express";
import app from "./app";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { limiter } from "./middlewares/rateLimiter";
import helmet from "helmet";
import { AppRoutes } from "./routes/index.route";
import cron from "node-cron";
import { createOrUpdateSetting, getSetting } from "./services/setting.service";

var whitelist = ["http://localhost:3000", "http://localhost:5173"];
var corsOptions = {
  origin: function (
    origin: any,
    callback: (err: Error | null, origin?: any) => void
  ) {
    // Allow requests with no origin ( like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies or authorization header
};

app
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(compression())
  .use(cors(corsOptions))
  .use(morgan("dev"))
  .use(cookieParser())
  .use(limiter)
  .use(helmet())
  .use((req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    next();
  })
  .use("/api/v1", AppRoutes)
  .use((error: any, req: Request, res: Response, next: NextFunction) => {
    const status = error.status ?? 500;
    const message = error.message ?? "Internal Server Error";
    const code = error.code ?? errorCode.internal_server;
    return res.status(status).json({
      message,
      code,
    });
  });

// cron.schedule("* 5 * * *") ==> it means every 5 AM
cron.schedule("* * * * *", async () => {
  console.log("running a task every minute for testing purpose...");
  const value = await getSetting("maintenance");
  if (value?.value === "true") {
    await createOrUpdateSetting("maintenance", "false");
    console.log("Maintenance mode turn off successfully.");
  }
});
