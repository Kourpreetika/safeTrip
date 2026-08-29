import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.ts";
import { asyncHandler } from "../middleware/error.ts";
import { requireAuth, type AuthedRequest } from "../middleware/auth.ts";
import { createJourney, journeyInclude, serializeJourney, startJourney } from "../services/journeyService.ts";
import { completeJourney, recordLocation } from "../services/locationService.ts";
import { cancelSos, mapsLink, triggerSos } from "../services/sosService.ts";
import { config } from "../config.ts";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  startAddress: z.string().trim().min(3).max(200),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  destAddress: z.string().trim().min(3).max(200),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
  vehicleNumber: z.string().trim().min(4).max(20),
  driverName: z.string().trim().min(2).max(80),
  rideProvider: z.string().trim().max(40).optional(),
  rideId: z.string().trim().max(40).optional(),
  estimatedDurationMin: z.number().int().min(1).max(24 * 60),
  contactIds: z.array(z.string().min(1)).min(1),
  plannedRoute: z.array(z.tuple([z.number(), z.number()])).min(2),
  routeDistanceMeters: z.number().positive().optional(),
});

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speedMps: z.number().optional(),
  heading: z.number().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const journeys = await prisma.journey.findMany({
      where: { userId: user.id },
      include: journeyInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ journeys: journeys.map(serializeJourney) });
  }),
);

router.get(
  "/incoming",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const me = await prisma.user.findUnique({ where: { id: user.id } });
    if (!me) {
      res.json({ journeys: [] });
      return;
    }
    const links = await prisma.journeyContact.findMany({
      where: {
        contact: { email: me.email },
        journey: { status: { in: ["active"] } },
      },
      include: { journey: { include: journeyInclude } },
    });
    res.json({
      journeys: links
        .filter((l) => l.journey.userId !== user.id)
        .map((l) => serializeJourney(l.journey)),
    });
  }),
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const [total, completed, sosCount, active] = await Promise.all([
      prisma.journey.count({ where: { userId: user.id } }),
      prisma.journey.count({ where: { userId: user.id, status: "completed" } }),
      prisma.sosEvent.count({ where: { journey: { userId: user.id } } }),
      prisma.journey.findFirst({
        where: { userId: user.id, status: "active" },
        include: journeyInclude,
      }),
    ]);
    const withRoute = await prisma.journey.findMany({
      where: { userId: user.id, status: "completed" },
      select: { routeDistanceMeters: true, offRoute: true },
    });
    const kmTravelled = withRoute.reduce((sum, j) => sum + (j.routeDistanceMeters ?? 0), 0) / 1000;
    const deviationCount = withRoute.filter((j) => j.offRoute).length;
    res.json({
      total,
      completed,
      sosCount,
      kmTravelled: Math.round(kmTravelled * 10) / 10,
      deviationCount,
      active: active ? serializeJourney(active) : null,
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = createSchema.parse(req.body);
    const journey = await createJourney({ userId: user.id, ...body });
    res.status(201).json({ journey: serializeJourney(journey) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const journey = await prisma.journey.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: journeyInclude,
    });
    if (!journey) {
      res.status(404).json({ error: "Journey not found." });
      return;
    }
    res.json({ journey: serializeJourney(journey) });
  }),
);

router.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const journey = await startJourney({ journeyId: req.params.id, userId: user.id });
    const trackUrl = `${config.clientOrigin}/track/${journey.shareToken}`;
    res.json({
      journey: serializeJourney(journey),
      share: {
        trackUrl,
        whatsappText: encodeURIComponent(
          `${journey.user.name} started a SafeTrip journey.\n${journey.startAddress} → ${journey.destAddress}\nDriver: ${journey.driverName}\nVehicle: ${journey.vehicleNumber}\nLive location: ${trackUrl}`,
        ),
      },
    });
  }),
);

router.post(
  "/:id/end",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const journey = await completeJourney({ journeyId: req.params.id, userId: user.id, reason: "manual" });
    const full = await prisma.journey.findUniqueOrThrow({
      where: { id: journey.id },
      include: journeyInclude,
    });
    res.json({ journey: serializeJourney(full) });
  }),
);

router.post(
  "/:id/locations",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = locationSchema.parse(req.body);
    const result = await recordLocation({
      journeyId: req.params.id,
      userId: user.id,
      ...body,
    });
    res.json({
      arrived: result.arrived,
      justDeviated: result.justDeviated,
      journey: {
        id: result.journey.id,
        status: result.journey.status,
        etaMinutes: result.journey.etaMinutes,
        etaSource: result.journey.etaSource,
        offRoute: result.journey.offRoute,
        sosActive: result.journey.sosActive,
        currentLat: result.journey.currentLat,
        currentLng: result.journey.currentLng,
        plannedRoute: result.journey.plannedRouteJson
          ? (JSON.parse(result.journey.plannedRouteJson) as number[][])
          : undefined,
      },
    });
  }),
);

router.get(
  "/:id/locations",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const journey = await prisma.journey.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!journey) {
      res.status(404).json({ error: "Journey not found." });
      return;
    }
    const locations = await prisma.locationUpdate.findMany({
      where: { journeyId: journey.id },
      orderBy: { recordedAt: "asc" },
      take: 2000,
    });
    res.json({ locations });
  }),
);

router.post(
  "/:id/sos",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(req.body);
    const result = await triggerSos({
      journeyId: req.params.id,
      userId: user.id,
      lat: body.lat,
      lng: body.lng,
    });
    res.json({
      ok: true,
      sos: result.sos,
      mapsLink: mapsLink(body.lat, body.lng),
    });
  }),
);

router.post(
  "/:id/sos/cancel",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    await cancelSos({ journeyId: req.params.id, userId: user.id });
    res.json({ ok: true });
  }),
);

export default router;
