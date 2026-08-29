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

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
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
