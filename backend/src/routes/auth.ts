import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";
import { asyncHandler } from "../middleware/error.ts";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken, type AuthedRequest } from "../middleware/auth.ts";
import { indianMobileSchemaMessage, normalizeIndianMobile } from "../lib/phone.ts";

const router = Router();

const requiredPhone = z
  .string()
  .trim()
  .min(1, indianMobileSchemaMessage())
  .refine((value) => normalizeIndianMobile(value) !== null, indianMobileSchemaMessage())
  .transform((value) => normalizeIndianMobile(value) as string);

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72)
    .regex(/[A-Za-z]/, "Password must include a letter.")
    .regex(/\d/, "Password must include a number."),
  phone: requiredPhone,
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) {
      res.status(409).json({ error: "An account with this email already exists. Log in with that email instead." });
      return;
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash, phone: body.phone },
      select: { id: true, email: true, name: true, phone: true },
    });
    setAuthCookie(res, signToken(user.id));
    res.status(201).json({ user });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    setAuthCookie(res, signToken(user.id));
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
  }),
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });
    res.json({ user: full });
  }),
);

export default router;
