import { prisma } from "../lib/prisma.ts";
import { getIO } from "../socket.ts";

export type NotificationType =
  | "JOURNEY_STARTED"
  | "JOURNEY_COMPLETED"
  | "ROUTE_DEVIATION"
  | "SOS_TRIGGERED"
  | "SOS_CANCELLED";

export async function notifyUsers(
  userIds: string[],
  data: { type: NotificationType; title: string; body: string; payload?: unknown },
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      payload: data.payload ? JSON.stringify(data.payload) : null,
    })),
  });
  const io = getIO();
  for (const userId of unique) {
    io.to(`user:${userId}`).emit("notification", data);
  }
}

/** If a contact's email matches a registered user, send them an in-app notification. */
export async function findRegisteredContactUserIds(emails: (string | null | undefined)[]): Promise<string[]> {
  const cleaned = emails.map((e) => e?.trim().toLowerCase()).filter((e): e is string => Boolean(e));
  if (cleaned.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { email: { in: cleaned } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
