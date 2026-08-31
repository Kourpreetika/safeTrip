import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { prisma } from "../lib/prisma.ts";

export type AuthUser = { id: string; email: string; name: string };

export type AuthedRequest = Request & { user: AuthUser };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }
    (req as AuthedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie("tm_token", token, {
    httpOnly: true,
    // Cross-site cookies (Vercel site → Render API) need SameSite=None; Secure.
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    secure: config.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("tm_token", { path: "/" });
}

function readToken(req: Request): string | null {
  const cookie = req.cookies?.tm_token as string | undefined;
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}
