import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

function phonesMatch(stored: string | null | undefined, incoming: string): boolean {
  if (!stored) return false;
  const a = stored.replace(/\D/g, "").slice(-10);
  const b = incoming.replace(/\D/g, "").slice(-10);
  return a.length === 10 && a === b;
}

export async function resetPassword(params: {
  email: string;
  password: string;
  phone: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: params.email } });
  if (!user || !phonesMatch(user.phone, params.phone)) {
    const err = new Error("Could not reset the password. Use the email and 10-digit mobile number from registration.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(params.password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}
