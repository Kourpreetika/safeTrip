import { Router } from "express";
import { prisma } from "../lib/prisma.ts";

const router = Router();

/**
 * Public tracking page. Anyone with the share token can open the map
 * without logging in (for example a shared tracking link). We only send journey
 * and location fields, not the traveller's email or other contacts' numbers.
 */
router.get("/:token", async (req, res) => {
  const journey = await prisma.journey.findUnique({
    where: { shareToken: req.params.token },
    include: {
      user: { select: { name: true } },
      locations: { orderBy: { recordedAt: "desc" }, take: 80 },
    },
  });
  if (!journey) {
    res.status(404).json({ error: "This tracking link is invalid or has expired." });
    return;
  }
  res.json({
    journey: {
      id: journey.id,
      status: journey.status,
      sosActive: journey.sosActive,
      shareToken: journey.shareToken,
      userName: journey.user.name,
      startAddress: journey.startAddress,
      destAddress: journey.destAddress,
      destLat: journey.destLat,
      destLng: journey.destLng,
      startLat: journey.startLat,
      startLng: journey.startLng,
      vehicleNumber: journey.vehicleNumber,
      driverName: journey.driverName,
      rideId: journey.rideId,
      currentLat: journey.currentLat,
      currentLng: journey.currentLng,
      etaMinutes: journey.etaMinutes,
      etaSource: journey.etaSource,
      offRoute: journey.offRoute,
      hadRouteDeviation: journey.hadRouteDeviation,
      plannedRoute: journey.plannedRouteJson ? JSON.parse(journey.plannedRouteJson) : [],
      startedAt: journey.startedAt,
      completedAt: journey.completedAt,
    },
    trail: journey.locations
      .slice()
      .reverse()
      .map((l) => ({ lat: l.lat, lng: l.lng, recordedAt: l.recordedAt })),
  });
});

export default router;
