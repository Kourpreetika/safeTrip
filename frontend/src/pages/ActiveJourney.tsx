import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MapView } from "../components/MapView";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../api/client";
import type { Journey } from "../types";
import { etaCaption, etaDisplay } from "../lib/eta";
import { smsNotice, type SmsResult } from "../lib/smsStatus";

export function ActiveJourneyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [confirmSos, setConfirmSos] = useState(false);
  const lastPosted = useRef(0);
  const startSms = (location.state as { sms?: SmsResult } | null)?.sms;
  const [smsBanner, setSmsBanner] = useState<string | null>(() =>
    startSms ? smsNotice("Journey started.", startSms).message : null,
  );

  const live = journey?.status === "active";
  const interval = journey?.sosActive ? 3000 : 8000;
  const { fix, error: gpsError } = useGeolocation(Boolean(live), interval);
  useSocket({
    shareToken: journey?.shareToken,
    journeyId: journey?.id,
    onLocation: (p) =>
      setJourney((j) =>
        j
          ? {
              ...j,
              currentLat: p.lat as number,
              currentLng: p.lng as number,
              etaMinutes: (p.etaMinutes as number | null) ?? j.etaMinutes,
              etaSource: (p.etaSource as string | null) ?? j.etaSource,
              offRoute: Boolean(p.offRoute),
              sosActive: Boolean(p.sosActive),
              status: String(p.status ?? j.status),
              plannedRoute: Array.isArray(p.plannedRoute) ? (p.plannedRoute as number[][]) : j.plannedRoute,
            }
          : j,
      ),
    onSos: (active) => setJourney((j) => (j ? { ...j, sosActive: active } : j)),
    onCompleted: () => void load(),
  });

  async function load() {
    if (!id) return;
    const d = await api<{ journey: Journey }>(`/api/journeys/${id}`);
    setJourney(d.journey);
    if (d.journey.status === "completed") toast("Journey completed.");
  }

  useEffect(() => {
    void load().catch((err) => toast(err instanceof ApiError ? err.message : "Could not load journey.", "err"));
  }, [id]);

  useEffect(() => {
    if (!live || !fix || !id) return;
    const now = Date.now();
    if (now - lastPosted.current < interval - 200) return;
    lastPosted.current = now;
    void postLocation({
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      speedMps: fix.speedMps ?? undefined,
      heading: fix.heading ?? undefined,
    });
  }, [fix, live, id, interval]);

  async function postLocation(body: Record<string, unknown>) {
    if (!id) return;
    try {
      const d = await api<{ arrived: boolean; justDeviated: boolean; journey: Partial<Journey> }>(`/api/journeys/${id}/locations`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setJourney((j) => (j ? { ...j, ...d.journey } : j));
      if (d.justDeviated) toast("You appear to be off the planned route. Contacts were notified.", "warn");
      if (d.arrived) {
        toast("You reached the destination. Contacts were notified.");
        await load();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) toast("Location not sent — check your connection.", "warn");
    }
  }

  async function triggerSos() {
    if (!id || !journey) return;
    const lat = fix?.lat ?? journey.currentLat;
    const lng = fix?.lng ?? journey.currentLng;
    if (lat == null || lng == null) {
      toast("Cannot send SOS without your location. Allow location access and wait for a position, then try again.", "err");
      return;
    }
    try {
      const result = await api<{ sms?: { configured?: boolean; provider?: string; sent?: number; failed?: number; errors?: string[] } }>(
        `/api/journeys/${id}/sos`,
        {
          method: "POST",
          body: JSON.stringify({ lat, lng }),
        },
      );
      setConfirmSos(false);
      const sent = result.sms?.sent ?? 0;
      if (sent > 0) {
        toast(`SOS sent. Telegram went to ${sent} trusted contact${sent === 1 ? "" : "s"}.`, "err");
      } else if (!result.sms?.configured) {
        toast("SOS sent in SafeTrip. Telegram is not configured on the API.", "err");
      } else {
        toast(
          `SOS sent in SafeTrip. Telegram did not send. ${result.sms?.errors?.[0] ?? "Ask contacts to message @SafeTripAlertBot."}`,
          "err",
        );
      }
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not send SOS.", "err");
    }
  }

  async function cancelSos() {
    if (!id) return;
    await api(`/api/journeys/${id}/sos/cancel`, { method: "POST" });
    await load();
    toast("SOS cancelled.");
  }

  async function endJourney() {
    if (!id) return;
    await api(`/api/journeys/${id}/end`, { method: "POST" });
    toast("Journey ended. Contacts were notified.");
    navigate("/app/history");
  }

  if (!journey) return <div className="py-20 text-center text-sm text-muted">Loading journey…</div>;

  const progress =
    journey.etaMinutes && journey.estimatedDurationMin
      ? Math.min(99, Math.max(5, Math.round((1 - journey.etaMinutes / Math.max(journey.estimatedDurationMin, 1)) * 100)))
      : journey.status === "completed"
        ? 100
        : 8;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Active Journey</h1>
        <span
          className={`status-pill uppercase ${
            journey.sosActive ? "bg-sos text-white" : journey.status === "active" ? "bg-primary text-ink" : "bg-gray-200 text-gray-700"
          }`}
        >
          {journey.sosActive ? "SOS" : journey.status}
        </span>
      </div>

      <MapView journey={journey} className="mt-4 h-72 md:h-96" />

      {smsBanner && (
        <p className="mt-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink">
          {smsBanner}
          <button type="button" className="ml-2 text-muted underline" onClick={() => setSmsBanner(null)}>
            Dismiss
          </button>
        </p>
      )}

      {gpsError && live && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">{gpsError}</p>
      )}

      <div className="card mt-4 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-muted">ETA</div>
            <div className="text-3xl font-semibold text-ink">{etaDisplay(journey.etaMinutes)}</div>
            {etaCaption(journey.etaSource) && (
              <div className="mt-1 text-xs text-muted">{etaCaption(journey.etaSource)}</div>
            )}
          </div>
          <div className="text-right text-sm text-muted">
            {journey.offRoute ? <span className="font-medium text-sos">Off planned route</span> : "On planned route"}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-4 text-sm">
          <span className="text-muted">Current location: </span>
          {journey.currentLat != null && journey.currentLng != null
            ? `${journey.currentLat.toFixed(4)}, ${journey.currentLng.toFixed(4)}`
            : "Waiting for GPS…"}
        </p>
        <p className="text-sm">
          <span className="text-muted">Destination: </span>
          {journey.destAddress}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <div className="text-sm text-muted">Driver</div>
          <div className="mt-1 text-lg font-semibold">{journey.driverName}</div>
          <div>{journey.vehicleNumber}</div>
          <div className="text-gray-500">
            {journey.rideProvider}
            {journey.rideId ? ` · ${journey.rideId}` : ""}
          </div>
        </div>
        <div className="card p-4 text-sm">
          <div className="text-sm text-muted">Trusted contacts</div>
          <ul className="mt-2 space-y-1">
            {journey.contacts.map((c) => (
              <li key={c.id}>
                {c.name}
                <span className="text-muted"> · {c.phone}</span>
                {c.telegramLinked ? <span className="text-muted"> · Telegram</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {journey.status === "active" && (
        <>
          <section className="mt-6 rounded-xl border border-red-200 bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-ink">Emergency</h2>
            <p className="mt-1 text-sm text-muted">
              SOS alerts your trusted contacts in SafeTrip and on Telegram (@SafeTripAlertBot) with your live location, driver name, and vehicle number.
            </p>
            <button type="button" onClick={() => setConfirmSos(true)} className="btn-sos mt-4 w-full">
              SOS
            </button>
          </section>

          <button type="button" onClick={endJourney} className="btn-dark mt-4 w-full py-3">
            End journey
          </button>
        </>
      )}

      {journey.status === "completed" && (
        <button type="button" onClick={() => navigate("/app/history")} className="btn-dark mt-6 w-full py-3">
          View history
        </button>
      )}

      {confirmSos && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold">Send SOS?</h2>
            <p className="mt-2 text-sm text-muted">
              Your trusted contacts will get an alert in SafeTrip with your live location, driver, and vehicle.
            </p>
            <button type="button" onClick={() => void triggerSos()} className="btn-sos mt-5 w-full py-3 text-base">
              Send SOS
            </button>
            <button type="button" onClick={() => setConfirmSos(false)} className="mt-2 w-full py-2 text-sm text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {journey.sosActive && (
        <div className="sos-overlay fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center text-white">
          <h2 className="text-4xl font-bold">SOS is active</h2>
          <p className="mt-3 max-w-md text-white/90">
            Location is being shared more frequently. Your trusted contacts were alerted in SafeTrip.
          </p>
          <button type="button" onClick={() => void cancelSos()} className="mt-8 rounded-xl bg-white px-6 py-3 font-semibold text-sos hover:bg-surface">
            Cancel SOS (sent by mistake)
          </button>
        </div>
      )}
    </div>
  );
}
