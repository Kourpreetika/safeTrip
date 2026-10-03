import { prisma } from "../lib/prisma.ts";
import { getIO } from "../socket.ts";
import { notifyJourneyContacts } from "./notificationService.ts";
import { sendJourneySms } from "./locationService.ts";

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export async function triggerSos(params: {
  journeyId: string;
  userId: string;
  lat: number;
  lng: number;
}) {
  const journey = await prisma.journey.findFirst({
    where: { id: params.journeyId, userId: params.userId },
    include: {
      user: { select: { name: true } },
      contacts: { include: { contact: true } },
    },
  });
  if (!journey || journey.status !== "active") {
    const err = new Error("Start a journey before sending an SOS.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  // Record the SOS with the current coordinates, then tell contacts (in-app + socket).
  const sos = await prisma.sosEvent.create({
    data: {
      journeyId: journey.id,
      lat: params.lat,
      lng: params.lng,
    },
  });

  await prisma.journey.update({
    where: { id: journey.id },
    data: { sosActive: true, currentLat: params.lat, currentLng: params.lng },
  });

  const link = mapsLink(params.lat, params.lng);
  const body = [
    `${journey.user.name} triggered SOS`,
    `Driver: ${journey.driverName}`,
    `Vehicle: ${journey.vehicleNumber}`,
    journey.rideId ? `Ride ID: ${journey.rideId}` : null,
    `From: ${journey.startAddress}`,
    `To: ${journey.destAddress}`,
    `Location: ${link}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = {
    journeyId: journey.id,
    shareToken: journey.shareToken,
    lat: params.lat,
    lng: params.lng,
    mapsLink: link,
    driverName: journey.driverName,
    vehicleNumber: journey.vehicleNumber,
    rideId: journey.rideId,
    startAddress: journey.startAddress,
    destAddress: journey.destAddress,
    userName: journey.user.name,
  };

  await notifyJourneyContacts(params.userId, journey.contacts, {
    type: "SOS_TRIGGERED",
    title: `SOS from ${journey.user.name}`,
    body,
    payload,
  });

  getIO().to(`track:${journey.shareToken}`).emit("sos:triggered", payload);
  getIO().to(`journey:${journey.id}`).emit("sos:triggered", payload);

  const sms = await sendJourneySms({
    journey: {
      ...journey,
      etaMinutes: journey.etaMinutes,
      currentLat: params.lat,
      currentLng: params.lng,
    },
    status: "SOS — needs help now",
    force: true,
  });

  return { sos, payload, sms };
}

export async function cancelSos(params: { journeyId: string; userId: string }) {
  const journey = await prisma.journey.findFirst({
    where: { id: params.journeyId, userId: params.userId },
    include: {
      user: { select: { name: true } },
      contacts: { include: { contact: true } },
    },
  });
  if (!journey) {
    const err = new Error("Journey not found.");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  await prisma.sosEvent.updateMany({
    where: { journeyId: journey.id, status: "active" },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  await prisma.journey.update({
    where: { id: journey.id },
    data: { sosActive: false },
  });

  await notifyJourneyContacts(params.userId, journey.contacts, {
    type: "SOS_CANCELLED",
    title: `SOS cancelled by ${journey.user.name}`,
    body: "The emergency alert was cancelled. The journey is still being tracked.",
    payload: { journeyId: journey.id, shareToken: journey.shareToken },
  });

  getIO().to(`track:${journey.shareToken}`).emit("sos:cancelled", { journeyId: journey.id });
  getIO().to(`journey:${journey.id}`).emit("sos:cancelled", { journeyId: journey.id });
}
