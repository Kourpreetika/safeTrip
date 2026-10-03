import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.ts";
import { getIO } from "../socket.ts";
import { notifyJourneyContacts } from "./notificationService.ts";
import { config } from "../config.ts";
import { sendJourneySms } from "./locationService.ts";
import { isSmsConfigured, type SmsSendResult } from "./smsService.ts";

export async function createJourney(params: {
  userId: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  vehicleNumber: string;
  driverName: string;
  rideProvider?: string;
  rideId: string;
  estimatedDurationMin: number;
  contactIds: string[];
  plannedRoute: number[][];
  routeDistanceMeters?: number;
}) {
  const owned = await prisma.trustedContact.findMany({
    where: { userId: params.userId, id: { in: params.contactIds } },
    select: { id: true },
  });
  if (owned.length !== params.contactIds.length) {
    const err = new Error("One or more trusted contacts are invalid.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  return prisma.journey.create({
    data: {
      userId: params.userId,
      startAddress: params.startAddress,
      startLat: params.startLat,
      startLng: params.startLng,
      destAddress: params.destAddress,
      destLat: params.destLat,
      destLng: params.destLng,
      vehicleNumber: params.vehicleNumber.trim().toUpperCase(),
      driverName: params.driverName.trim(),
      rideProvider: params.rideProvider,
      rideId: params.rideId,
      estimatedDurationMin: params.estimatedDurationMin,
      // Random token used in /track/:token so contacts can open the map without login.
      shareToken: nanoid(24),
      plannedRouteJson: JSON.stringify(params.plannedRoute),
      routeDistanceMeters: params.routeDistanceMeters,
      contacts: {
        create: params.contactIds.map((contactId) => ({ contactId })),
      },
    },
    include: journeyInclude,
  });
}

export const journeyInclude = {
  contacts: { include: { contact: true } },
  sosEvents: { orderBy: { triggeredAt: "desc" as const }, take: 5 },
  user: { select: { id: true, name: true, phone: true } },
};

export async function startJourney(params: { journeyId: string; userId: string }): Promise<{
  journey: Awaited<ReturnType<typeof createJourney>>;
  sms: SmsSendResult;
}> {
  const journey = await prisma.journey.findFirst({
    where: { id: params.journeyId, userId: params.userId },
    include: journeyInclude,
  });
  if (!journey) {
    const err = new Error("Journey not found.");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (journey.status === "active") {
    return { journey, sms: { configured: isSmsConfigured(), sent: 0, failed: 0 } };
  }

  const otherActive = await prisma.journey.findFirst({
    where: { userId: params.userId, status: "active", id: { not: journey.id } },
  });
  if (otherActive) {
    const err = new Error("End your current journey before starting a new one.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      status: "active",
      startedAt: new Date(),
      currentLat: journey.startLat,
      currentLng: journey.startLng,
      etaMinutes: journey.estimatedDurationMin,
    },
    include: journeyInclude,
  });

  const trackUrl = `${config.clientOrigin.replace(/\/+$/, "")}/track/${updated.shareToken}`;
  await notifyJourneyContacts(params.userId, updated.contacts, {
    type: "JOURNEY_STARTED",
    title: `${journey.user.name} started a journey`,
    body: `${journey.startAddress} → ${journey.destAddress}. Vehicle ${updated.vehicleNumber}. Live track: ${trackUrl}`,
    payload: {
      journeyId: updated.id,
      shareToken: updated.shareToken,
      driverName: updated.driverName,
      vehicleNumber: updated.vehicleNumber,
      rideId: updated.rideId,
    },
  });

  getIO().to(`track:${updated.shareToken}`).emit("journey:started", {
    journeyId: updated.id,
    shareToken: updated.shareToken,
  });

  const sms = await sendJourneySms({
    journey: updated,
    status: "Trip started",
    force: true,
  });

  return { journey: updated, sms };
}

export function serializeJourney(journey: Awaited<ReturnType<typeof createJourney>>) {
  return {
    id: journey.id,
    status: journey.status,
    sosActive: journey.sosActive,
    shareToken: journey.shareToken,
    startAddress: journey.startAddress,
    startLat: journey.startLat,
    startLng: journey.startLng,
    destAddress: journey.destAddress,
    destLat: journey.destLat,
    destLng: journey.destLng,
    vehicleNumber: journey.vehicleNumber,
    driverName: journey.driverName,
    rideProvider: journey.rideProvider,
    rideId: journey.rideId,
    estimatedDurationMin: journey.estimatedDurationMin,
    etaMinutes: journey.etaMinutes,
    etaSource: journey.etaSource,
    currentLat: journey.currentLat,
    currentLng: journey.currentLng,
    offRoute: journey.offRoute,
    hadRouteDeviation: journey.hadRouteDeviation,
    plannedRoute: journey.plannedRouteJson ? (JSON.parse(journey.plannedRouteJson) as number[][]) : [],
    routeDistanceMeters: journey.routeDistanceMeters,
    startedAt: journey.startedAt,
    completedAt: journey.completedAt,
    createdAt: journey.createdAt,
    user: journey.user,
    contacts: journey.contacts.map((c) => ({
      id: c.contact.id,
      name: c.contact.name,
      phone: c.contact.phone,
      email: c.contact.email,
      relationship: c.contact.relationship,
    })),
    sosEvents: journey.sosEvents,
  };
}
