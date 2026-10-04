import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { isAllowedOrigin } from "./config.ts";
import { isSmsConfigured, resolvedSmsProvider } from "./services/smsService.ts";
import { errorHandler } from "./middleware/error.ts";
import authRoutes from "./routes/auth.ts";
import contactRoutes from "./routes/contacts.ts";
import journeyRoutes from "./routes/journeys.ts";
import geoRoutes from "./routes/geo.ts";
import trackRoutes from "./routes/track.ts";
import notificationRoutes from "./routes/notifications.ts";
import userRoutes from "./routes/users.ts";

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "safetrip-api",
      smsConfigured: isSmsConfigured(),
      smsProvider: resolvedSmsProvider(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/journeys", journeyRoutes);
  app.use("/api/geo", geoRoutes);
  app.use("/api/track", trackRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);

  app.use(errorHandler);
  return app;
}
