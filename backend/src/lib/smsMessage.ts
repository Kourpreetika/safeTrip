function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function mapsSmsLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function formatTripSms(params: {
  userName: string;
  status: string;
  startAddress: string;
  destAddress: string;
  driverName?: string | null;
  vehicleNumber?: string | null;
  rideProvider?: string | null;
  rideId?: string | null;
  etaMinutes: number | null;
  lat: number | null;
  lng: number | null;
  trackUrl: string;
}): string {
  const eta = params.etaMinutes != null ? `${params.etaMinutes} min` : "updating";
  const maps = mapsSmsLink(params.lat, params.lng);
  const rideBits = [params.rideProvider, params.rideId ? `ID ${params.rideId}` : null].filter(Boolean).join(" · ");
  const lines = [
    `SafeTrip: ${params.userName} — ${params.status}`,
    `From: ${clip(params.startAddress)}`,
    `To: ${clip(params.destAddress)}`,
    params.driverName || params.vehicleNumber
      ? `Driver: ${params.driverName ?? "—"} · ${params.vehicleNumber ?? "—"}`
      : null,
    rideBits ? `Ride: ${rideBits}` : null,
    `ETA: ${eta}`,
    maps ? `Maps: ${maps}` : null,
    `Track: ${params.trackUrl}`,
  ];
  return lines.filter(Boolean).join("\n");
}
