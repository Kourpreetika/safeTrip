import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";
import { asyncHandler } from "../middleware/error.ts";
import { requireAuth, type AuthedRequest } from "../middleware/auth.ts";
import { indianMobileSchemaMessage, normalizeIndianMobile } from "../lib/phone.ts";

const router = Router();
router.use(requireAuth);

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().toLowerCase().optional().or(z.literal("")),
  relationship: z.string().trim().max(40).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const contacts = await prisma.trustedContact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const phones = [...new Set(contacts.map((c) => c.phone))];
    const emails = [...new Set(contacts.map((c) => c.email).filter((e): e is string => Boolean(e)))];
    const accounts =
      phones.length === 0 && emails.length === 0
        ? []
        : await prisma.user.findMany({
            where: {
              id: { not: user.id },
              OR: [
                ...(phones.length ? [{ phone: { in: phones } }] : []),
                ...(emails.length ? [{ email: { in: emails } }] : []),
              ],
            },
            select: { phone: true, email: true },
          });
    res.json({
      contacts: contacts.map((c) => ({
        ...c,
        alertsEnabled: accounts.some((a) => a.phone === c.phone || (c.email != null && a.email === c.email)),
        telegramLinked: Boolean(c.telegramChatId),
      })),
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = contactSchema.parse(req.body);
    const phone = normalizeIndianMobile(body.phone);
    if (!phone) {
      res.status(400).json({ error: indianMobileSchemaMessage() });
      return;
    }
    const contact = await prisma.trustedContact.create({
      data: {
        userId: user.id,
        name: body.name,
        phone,
        email: body.email || null,
        relationship: body.relationship,
      },
    });
    res.status(201).json({ contact });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = contactSchema.parse(req.body);
    const phone = normalizeIndianMobile(body.phone);
    if (!phone) {
      res.status(400).json({ error: indianMobileSchemaMessage() });
      return;
    }
    const existing = await prisma.trustedContact.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Contact not found." });
      return;
    }
    const contact = await prisma.trustedContact.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        phone,
        email: body.email || null,
        relationship: body.relationship,
      },
    });
    res.json({ contact });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const existing = await prisma.trustedContact.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Contact not found." });
      return;
    }
    await prisma.trustedContact.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

export default router;
