import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey } from "../types";

type Props = {
  journey: Pick<
    Journey,
    | "startLat"
    | "startLng"
    | "destLat"
    | "destLng"
    | "plannedRoute"
    | "currentLat"
    | "currentLng"
    | "sosActive"
    | "offRoute"
  >;
  className?: string;
};

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function Fit({ journey }: { journey: Props["journey"] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [
      [journey.startLat, journey.startLng],
      [journey.destLat, journey.destLng],
    ];
    if (journey.currentLat && journey.currentLng) pts.push([journey.currentLat, journey.currentLng]);
    map.fitBounds(L.latLngBounds(pts), { padding: [28, 28] });
  }, [map, journey.startLat, journey.startLng, journey.destLat, journey.destLng]);
  return null;
}

function divIcon(html: string) {
  return L.divIcon({ className: "", html, iconSize: [18, 18], iconAnchor: [9, 9] });
}

export function MapView({ journey, className = "h-72" }: Props) {
  const route = useMemo(
    () => (journey.plannedRoute?.length ? journey.plannedRoute.map(([lat, lng]) => [lat, lng] as [number, number]) : []),
    [journey.plannedRoute],
  );
  const here = journey.currentLat && journey.currentLng ? { lat: journey.currentLat, lng: journey.currentLng } : null;
  const center: [number, number] = here ? [here.lat, here.lng] : [journey.startLat, journey.startLng];

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line ${className}`}>
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit journey={journey} />
        {here && <Recenter lat={here.lat} lng={here.lng} />}
        {route.length > 1 && (
          <Polyline positions={route} pathOptions={{ color: journey.offRoute ? "#DC2626" : "#1A1A1A", weight: 5, opacity: 0.85 }} />
        )}
        <Marker
          position={[journey.startLat, journey.startLng]}
          icon={divIcon(`<div class="pin" style="background:#F7C948"></div>`)}
        />
        <Marker
          position={[journey.destLat, journey.destLng]}
          icon={divIcon(`<div class="pin" style="background:#1A1A1A"></div>`)}
        />
        {here && (
          <Marker
            position={[here.lat, here.lng]}
            icon={divIcon(`<div class="pulse-dot ${journey.sosActive ? "sos" : ""}"></div>`)}
          />
        )}
      </MapContainer>
      <ul className="pointer-events-none absolute bottom-7 left-2 z-[1000] space-y-1 rounded-xl border border-line bg-white px-2.5 py-2 text-[11px] leading-none text-ink">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Start
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Destination
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${journey.sosActive ? "bg-sos" : "bg-primary"}`} /> Current
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-0.5 w-3 ${journey.offRoute ? "bg-sos" : "bg-ink"}`} /> Route
        </li>
      </ul>
    </div>
  );
}
