import { prisma } from "../lib/prisma.ts";
import { getIO } from "../socket.ts";
import { normalizeIndianMobile } from "../lib/phone.ts";

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

/** Match a trusted contact to a SafeTrip account by email or Indian mobile. */
export async function findRegisteredContactUserIds(
  emails: (string | null | undefined)[],
  phones: (string | null | undefined)[] = [],
): Promise<string[]> {
  const cleanedEmails = emails.map((e) => e?.trim().toLowerCase()).filter((e): e is string => Boolean(e));
  const cleanedPhones = [
    ...new Set(phones.map((p) => (p ? normalizeIndianMobile(p) : null)).filter((p): p is string => Boolean(p))),
  ];
  if (cleanedEmails.length === 0 && cleanedPhones.length === 0) return [];
  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(cleanedEmails.length ? [{ email: { in: cleanedEmails } }] : []),
        ...(cleanedPhones.length ? [{ phone: { in: cleanedPhones } }] : []),
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function notifyJourneyContacts(
  travelerUserId: string,
  contacts: Array<{ contact: { email?: string | null; phone?: string | null } }>,
  data: { type: NotificationType; title: string; body: string; payload?: unknown },
) {
  const ids = (
    await findRegisteredContactUserIds(
      contacts.map((c) => c.contact.email),
      contacts.map((c) => c.contact.phone),
    )
  ).filter((id) => id !== travelerUserId);
  await notifyUsers(ids, data);
}
