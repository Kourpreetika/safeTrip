import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { asyncHandler } from "../middleware/error.ts";
import { requireAuth, type AuthedRequest } from "../middleware/auth.ts";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    res.json({
      notifications: notifications.map((n) => ({
        ...n,
        payload: n.payload ? JSON.parse(n.payload) : null,
      })),
    });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

export default router;
