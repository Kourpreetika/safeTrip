import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { MapView } from "../components/MapView";
import { useSocket } from "../hooks/useSocket";
import { GuestShell } from "../components/Layout";
import type { Journey } from "../types";
import { etaDisplay } from "../lib/eta";

type TrackPayload = { journey: Journey; trail: { lat: number; lng: number }[] };

export function PublicTrackPage() {
  const { token } = useParams();
  const [data, setData] = useState<TrackPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useSocket({
    shareToken: token,
    onLocation: (p) =>
      setData((d) =>
        d
          ? {
              ...d,
              journey: {
                ...d.journey,
                currentLat: p.lat as number,
                currentLng: p.lng as number,
                etaMinutes: (p.etaMinutes as number | null) ?? d.journey.etaMinutes,
                etaSource: (p.etaSource as string | null) ?? d.journey.etaSource,
                offRoute: Boolean(p.offRoute),
                sosActive: Boolean(p.sosActive),
                status: String(p.status ?? d.journey.status),
              },
            }
          : d,
      ),
    onSos: (active) => setData((d) => (d ? { ...d, journey: { ...d.journey, sosActive: active } } : d)),
    onCompleted: () => setData((d) => (d ? { ...d, journey: { ...d.journey, status: "completed" } } : d)),
  });

  async function load() {
    if (!token) return;
    try {
      const d = await api<TrackPayload>(`/api/track/${token}`);
      setData(d);
      setError(null);
    } catch {
      setError("This tracking link is invalid or the journey was removed.");
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => {
    const onUpdate = () => void load();
    window.addEventListener("focus", onUpdate);
    return () => window.removeEventListener("focus", onUpdate);
  }, [token]);

  if (error) {
    return (
      <GuestShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="empty-state">
            <p className="font-medium text-ink">Tracking link not found</p>
            <p className="mt-2">{error}</p>
          </div>
        </div>
      </GuestShell>
    );
  }

  if (!data) {
    return (
      <GuestShell>
        <div className="grid place-items-center px-4 py-20 text-sm text-muted">Loading live location…</div>
      </GuestShell>
    );
  }

  const j = data.journey;

  return (
    <GuestShell>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{j.userName ?? j.user?.name} is travelling</h1>
            <p className="page-lead">
              {j.startAddress} → {j.destAddress}
            </p>
          </div>
          <span className={`status-pill uppercase ${j.sosActive ? "bg-sos text-white" : "bg-primary text-ink"}`}>
            {j.sosActive ? "SOS" : j.status}
          </span>
        </div>
        <MapView journey={j} className="mt-4 h-80" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Info label="ETA" value={etaDisplay(j.etaMinutes)} />
          <Info label="Driver" value={j.driverName} />
          <Info label="Vehicle" value={j.vehicleNumber} />
        </div>
        {j.rideId && <p className="mt-3 text-sm text-muted">Ride ID {j.rideId}</p>}
        {j.offRoute && <p className="mt-3 font-medium text-sos">Possible route deviation detected.</p>}
        {j.sosActive && (
          <p className="mt-4 rounded-xl bg-sos px-4 py-3 text-sm text-white">SOS is active. Location updates are more frequent.</p>
        )}
        {j.status === "completed" && (
          <p className="mt-4 rounded-xl bg-ink px-4 py-3 text-sm text-white">This journey is complete.</p>
        )}
      </main>
    </GuestShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
