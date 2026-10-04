import { prisma } from "../lib/prisma.ts";
import { getIO } from "../socket.ts";
import { DEVIATION_STREAK_REQUIRED, isAtDestination, isOffRoute, type LatLng } from "../lib/geo.ts";
import { notifyJourneyContacts } from "./notificationService.ts";
import { fetchLiveRoute } from "./routingService.ts";
import { formatTripSms, sendSmsToNumbers, shouldSendScheduledSms, isSmsConfigured, emptySmsResult, type SmsSendResult } from "./smsService.ts";
import { config } from "../config.ts";

function parseRoute(json: string | null): LatLng[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as number[][];
    return raw.map(([lat, lng]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

const ROUTE_REFRESH_MS = 45_000;
const OFF_ROUTE_REFRESH_MS = 20_000;

async function maybeRefreshRoute(params: {
  point: LatLng;
  dest: LatLng;
  lastRouteRefreshAt: Date | null;
  currentRoute: LatLng[];
  offRoute: boolean;
  currentDistance?: number | null;
}): Promise<{ tried: boolean; live: Awaited<ReturnType<typeof fetchLiveRoute>> | null; replacePath: boolean }> {
  const since = params.lastRouteRefreshAt ? Date.now() - params.lastRouteRefreshAt.getTime() : Number.POSITIVE_INFINITY;
  const due = since >= (params.offRoute ? OFF_ROUTE_REFRESH_MS : ROUTE_REFRESH_MS);
  if (!due && params.lastRouteRefreshAt) return { tried: false, live: null, replacePath: false };

  const live = await fetchLiveRoute(params.point.lat, params.point.lng, params.dest.lat, params.dest.lng);
  if (!live) return { tried: true, live: null, replacePath: false };

  const replacePath =
    params.offRoute ||
    params.currentRoute.length < 2 ||
    (params.currentDistance != null && live.distanceMeters < params.currentDistance * 0.88);

  return { tried: true, live, replacePath };
}

export async function sendJourneySms(params: {
  journey: {
    id: string;
    shareToken: string;
    startAddress: string;
    destAddress: string;
    driverName?: string | null;
    vehicleNumber?: string | null;
    rideProvider?: string | null;
    rideId?: string | null;
    etaMinutes: number | null;
    currentLat: number | null;
    currentLng: number | null;
    user: { name: string };
    contacts: Array<{ contact: { phone: string } }>;
  };
  status: string;
  force: boolean;
}): Promise<SmsSendResult> {
  const phones = params.journey.contacts.map((row) => row.contact.phone).filter(Boolean);
  if (!isSmsConfigured()) {
    return emptySmsResult({
      configured: false,
      failed: phones.length,
      errors: ["Add Twilio trial keys on the API (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)."],
    });
  }
  const last = await prisma.journey.findUnique({
    where: { id: params.journey.id },
    select: { lastSmsAt: true, etaMinutes: true },
  });
  if (!params.force && last?.lastSmsAt && !shouldSendScheduledSms(last.lastSmsAt, last.etaMinutes)) {
    return emptySmsResult({ configured: true });
  }
  const trackUrl = `${config.clientOrigin.replace(/\/+$/, "")}/track/${params.journey.shareToken}`;
  const body = formatTripSms({
    userName: params.journey.user.name,
    status: params.status,
    startAddress: params.journey.startAddress,
    destAddress: params.journey.destAddress,
    driverName: params.journey.driverName,
    vehicleNumber: params.journey.vehicleNumber,
    rideProvider: params.journey.rideProvider,
    rideId: params.journey.rideId,
    etaMinutes: params.journey.etaMinutes,
    lat: params.journey.currentLat,
    lng: params.journey.currentLng,
    trackUrl,
  });
  const result = await sendSmsToNumbers(phones, body);
  if (result.sent > 0) {
    await prisma.journey.update({
      where: { id: params.journey.id },
      data: { lastSmsAt: new Date() },
    });
  }
  return result;
}

export async function recordLocation(params: {
  journeyId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speedMps?: number;
  heading?: number;
}) {
  const journey = await prisma.journey.findFirst({
    where: { id: params.journeyId, userId: params.userId },
    include: {
      user: { select: { name: true, id: true } },
      contacts: { include: { contact: true } },
    },
  });
  if (!journey) {
    const err = new Error("Journey not found.");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (journey.status !== "active") {
    const err = new Error("This journey is not active.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const point: LatLng = { lat: params.lat, lng: params.lng };
  const route = parseRoute(journey.plannedRouteJson);
  const dest = { lat: journey.destLat, lng: journey.destLng };

  let offRouteStreak = journey.offRouteStreak;
  let offRoute = journey.offRoute;
  const currentlyOffRoute = isOffRoute(point, route);
  if (currentlyOffRoute) {
    offRouteStreak += 1;
  } else {
    offRouteStreak = 0;
    offRoute = false;
  }
  const justDeviated = !journey.offRoute && offRouteStreak >= DEVIATION_STREAK_REQUIRED;
  if (justDeviated) offRoute = true;
  const hadRouteDeviation = journey.hadRouteDeviation || justDeviated || offRoute;

  const arrived = isAtDestination(point, dest);

  const refresh = arrived
    ? { tried: false, live: null as Awaited<ReturnType<typeof fetchLiveRoute>> | null, replacePath: false }
    : await maybeRefreshRoute({
        point,
        dest,
        lastRouteRefreshAt: journey.lastRouteRefreshAt,
        currentRoute: route,
        offRoute: offRoute || currentlyOffRoute,
        currentDistance: journey.routeDistanceMeters,
      });

  const live = refresh.live;
  const etaMinutes = live?.durationMin ?? journey.etaMinutes;
  const etaSource = live?.source ?? journey.etaSource;
  const plannedRouteJson =
    live && refresh.replacePath ? JSON.stringify(live.coordinates) : journey.plannedRouteJson;
  const routeDistanceMeters = live?.distanceMeters ?? journey.routeDistanceMeters;

  await prisma.locationUpdate.create({
    data: {
      journeyId: journey.id,
      lat: params.lat,
      lng: params.lng,
      accuracy: params.accuracy,
      speedMps: params.speedMps,
      heading: params.heading,
      source: "gps",
    },
  });

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      currentLat: params.lat,
      currentLng: params.lng,
      etaMinutes,
      etaSource,
      plannedRouteJson,
      routeDistanceMeters,
      lastRouteRefreshAt: refresh.tried ? new Date() : journey.lastRouteRefreshAt,
      offRoute,
      hadRouteDeviation,
      offRouteStreak,
      ...(arrived ? { status: "completed", completedAt: new Date(), sosActive: false } : {}),
    },
  });

  const payload = {
    journeyId: journey.id,
    lat: params.lat,
    lng: params.lng,
    etaMinutes: updated.etaMinutes,
    etaSource: updated.etaSource,
    offRoute,
    sosActive: journey.sosActive,
    status: updated.status,
    plannedRoute: plannedRouteJson ? (JSON.parse(plannedRouteJson) as number[][]) : [],
  };

  getIO().to(`track:${journey.shareToken}`).emit("location:update", payload);
  getIO().to(`journey:${journey.id}`).emit("location:update", payload);

  if (justDeviated) {
    await notifyJourneyContacts(params.userId, journey.contacts, {
      type: "ROUTE_DEVIATION",
      title: `${journey.user.name} may be off the planned route`,
      body: `The trip toward ${journey.destAddress} left the planned path.`,
      payload: { journeyId: journey.id, shareToken: journey.shareToken, lat: params.lat, lng: params.lng },
    });
    getIO().to(`track:${journey.shareToken}`).emit("route:deviation", payload);
  }

  if (arrived) {
    await notifyJourneyContacts(params.userId, journey.contacts, {
      type: "JOURNEY_COMPLETED",
      title: `${journey.user.name} reached the destination`,
      body: `The journey to ${journey.destAddress} is complete.`,
      payload: { journeyId: journey.id, shareToken: journey.shareToken },
    });
    getIO().to(`track:${journey.shareToken}`).emit("journey:completed", payload);
    await sendJourneySms({
      journey: { ...journey, etaMinutes: 0, currentLat: params.lat, currentLng: params.lng },
      status: "Arrived",
      force: true,
    });
  } else {
    await sendJourneySms({
      journey: { ...journey, etaMinutes: updated.etaMinutes, currentLat: params.lat, currentLng: params.lng },
      status: journey.sosActive ? "SOS" : offRoute ? "Off route" : "On the way",
      force: justDeviated,
    });
  }

  return { journey: updated, arrived, justDeviated };
}

export async function completeJourney(params: { journeyId: string; userId: string; reason: "manual" | "arrival" }) {
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
  if (journey.status !== "active") return journey;

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: { status: "completed", completedAt: new Date(), sosActive: false },
  });

  await notifyJourneyContacts(params.userId, journey.contacts, {
    type: "JOURNEY_COMPLETED",
    title: `${journey.user.name} ended the journey`,
    body:
      params.reason === "arrival"
        ? `Arrived at ${journey.destAddress}.`
        : `${journey.user.name} marked the journey as complete.`,
    payload: { journeyId: journey.id, shareToken: journey.shareToken },
  });

  getIO().to(`track:${journey.shareToken}`).emit("journey:completed", { journeyId: journey.id });
  await sendJourneySms({
    journey: {
      ...journey,
      etaMinutes: 0,
      currentLat: journey.currentLat,
      currentLng: journey.currentLng,
    },
    status: "Journey ended",
    force: true,
  });
  return updated;
}
