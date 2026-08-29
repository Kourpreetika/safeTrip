import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";
import { asyncHandler } from "../middleware/error.ts";
import { requireAuth, type AuthedRequest } from "../middleware/auth.ts";

const router = Router();
router.use(requireAuth);

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(16).optional().or(z.literal("")),
});

router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = updateSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: body.name, phone: body.phone || null },
      select: { id: true, email: true, name: true, phone: true },
    });
    res.json({ user: updated });
  }),
);

export default router;
