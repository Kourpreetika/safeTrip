import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(here, "../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

/** Origins must match the browser Origin header exactly — no trailing slash. */
function parseOrigins(raw: string | undefined): string[] {
  const value = raw?.trim() ? raw : "http://localhost:5173";
  return [...new Set(value.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean))];
}

const clientOrigins = parseOrigins(process.env.CLIENT_ORIGIN);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const incoming = origin.replace(/\/+$/, "");
  if (clientOrigins.includes(incoming)) return true;
  let hostname = "";
  try {
    hostname = new URL(incoming).hostname;
  } catch {
    return false;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname === "safe-trip-omega.vercel.app") return true;
  return hostname.endsWith(".vercel.app") && hostname.startsWith("safe-trip");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins,
  clientOrigin: clientOrigins[0] ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  nodeEnv: process.env.NODE_ENV ?? "development",
  appContact: process.env.APP_CONTACT ?? "safetrip@localhost",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  smsProvider: (process.env.SMS_PROVIDER ?? "none").toLowerCase(),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  msg91AuthKey: process.env.MSG91_AUTH_KEY ?? "",
  msg91SenderId: process.env.MSG91_SENDER_ID ?? "SAFTRP",
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID ?? "",
};
