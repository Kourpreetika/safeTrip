import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { api } from "../api/client";
import { PlaceSearch } from "../components/PlaceSearch";
import { MapView } from "../components/MapView";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../api/client";
import { reverseIndiaPlace, type Place } from "../lib/places";
import type { Contact, Journey } from "../types";

type RouteInfo = {
  coordinates: number[][];
  durationMin: number | null;
  distanceMeters: number | null;
  source?: string;
  hasTraffic?: boolean;
};

export function CreateJourneyPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [startAddress, setStartAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [start, setStart] = useState<{ lat: number; lng: number } | null>(null);
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [rideProvider, setRideProvider] = useState("Uber");
  const [rideId, setRideId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<{ contacts: Contact[] }>("/api/contacts").then((d) => {
      setContacts(d.contacts);
      setSelected(d.contacts.map((c) => c.id));
    });
  }, []);

  useEffect(() => {
    if (!start || !dest) {
      setRoute(null);
      return;
    }
    setRouteError(null);
    void api<RouteInfo>(
      `/api/geo/route?fromLat=${start.lat}&fromLng=${start.lng}&toLat=${dest.lat}&toLng=${dest.lng}`,
    )
      .then((r) => {
        setRoute(r);
        setRouteError(null);
      })
      .catch((err) => {
        setRoute(null);
        setRouteError(err instanceof ApiError ? err.message : "Could not calculate a route for these locations.");
      });
  }, [start, dest]);

  function applyPickup(place: Place | null) {
    if (!place) {
      setStart(null);
      return;
    }
    setStart({ lat: place.lat, lng: place.lng });
    setStartAddress(place.label);
    setGpsMsg(null);
  }

  function applyDrop(place: Place | null) {
    if (!place) {
      setDest(null);
      return;
    }
    setDest({ lat: place.lat, lng: place.lng });
    setDestAddress(place.label);
  }

  function swapLocations() {
    setStartAddress(destAddress);
    setDestAddress(startAddress);
    setStart(dest);
    setDest(start);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsMsg("GPS is not available in this browser. Search for a pickup instead.");
      return;
    }
    setGpsMsg("Reading your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const label = await reverseIndiaPlace(lat, lng);
        applyPickup({ label, title: "Current location", subtitle: label, lat, lng });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsMsg("Location permission denied. Allow Location for this site, or type a pickup area / PIN.");
        } else if (err.code === err.TIMEOUT) {
          setGpsMsg("Location request timed out. Turn on GPS, or search for a pickup.");
        } else {
          setGpsMsg("Could not read GPS. Search for a pickup instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!start || !dest) {
      toast("Select a pickup and a drop from the suggestion list.", "warn");
      return;
    }
    if (!route?.durationMin || !route.coordinates?.length) {
      toast(routeError ?? "Wait for the live ETA to load before starting.", "warn");
      return;
    }
    if (!rideId.trim()) {
      toast("Enter the ride ID.", "warn");
      return;
    }
    if (selected.length === 0) {
      toast("Select at least one trusted contact.", "warn");
      return;
    }
    setBusy(true);
    try {
      const created = await api<{ journey: Journey }>("/api/journeys", {
        method: "POST",
        body: JSON.stringify({
          startAddress,
          startLat: start.lat,
          startLng: start.lng,
          destAddress,
          destLat: dest.lat,
          destLng: dest.lng,
          vehicleNumber,
          driverName,
          rideProvider,
          rideId: rideId.trim(),
          estimatedDurationMin: route.durationMin as number,
          contactIds: selected,
          plannedRoute: route.coordinates,
          routeDistanceMeters: route.distanceMeters ?? undefined,
        }),
      });
      const started = await api<{
        journey: Journey;
        sms?: { configured: boolean; sent: number; failed: number };
      }>(`/api/journeys/${created.journey.id}/start`, { method: "POST" });
      toast("Journey started. Trusted contacts with a SafeTrip account were notified.");
      navigate(`/app/journey/${started.journey.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not start the journey.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Create Journey</h1>
      <p className="page-lead">Type a pickup and drop, then tap a suggestion — anywhere in India, including PIN codes.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="card relative space-y-4 p-5">
          <PlaceSearch
            label="Pickup"
            value={startAddress}
            onChange={setStartAddress}
            onSelect={applyPickup}
            locked={!!start}
            placeholder="Search pickup — area, landmark, or PIN"
            onUseCurrentLocation={useMyLocation}
          />
          <button
            type="button"
            className="absolute right-4 top-[4.4rem] z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm hover:bg-surface"
            onClick={swapLocations}
            title="Swap pickup and drop"
            aria-label="Swap pickup and drop"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
          <PlaceSearch
            label="Drop"
            value={destAddress}
            onChange={setDestAddress}
            onSelect={applyDrop}
            locked={!!dest}
            near={start}
            placeholder="Search drop — area, landmark, or PIN"
          />
          {gpsMsg && <p className="text-sm text-sos">{gpsMsg}</p>}
          {startAddress && !start && (
            <p className="text-xs text-muted">Tap a pickup from the list so we can pin it on the map.</p>
          )}
          {destAddress && !dest && (
            <p className="text-xs text-muted">Tap a drop from the list so we can pin it on the map.</p>
          )}
        </div>

        {start && dest && (
          <MapView
            className="h-56"
            journey={{
              startLat: start.lat,
              startLng: start.lng,
              destLat: dest.lat,
              destLng: dest.lng,
              plannedRoute: route?.coordinates ?? [],
              currentLat: start.lat,
              currentLng: start.lng,
              sosActive: false,
              offRoute: false,
            }}
          />
        )}
        {routeError && <p className="text-sm text-sos">{routeError}</p>}
        {route?.durationMin && (
          <p className="text-sm text-ink">
            Live ETA <span className="font-semibold">{route.durationMin} min</span>
            {route.hasTraffic ? " · includes current traffic" : " · based on the current road route"}
          </p>
        )}

        <div className="card grid gap-4 p-5 md:grid-cols-2">
          <Field label="Driver name" value={driverName} onChange={setDriverName} required />
          <Field label="Vehicle number" value={vehicleNumber} onChange={setVehicleNumber} required />
          <label>
            <span className="field-label">Ride service</span>
            <select
              className="input-field"
              value={rideProvider}
              onChange={(e) => setRideProvider(e.target.value)}
            >
              <option>Uber</option>
              <option>Rapido</option>
              <option>Ola</option>
              <option>Auto</option>
              <option>Other</option>
            </select>
          </label>
          <Field label="Ride ID" value={rideId} onChange={setRideId} required />
        </div>

        <div className="card p-5">
          <div className="text-sm font-medium text-ink">Trusted contacts</div>
          {contacts.length === 0 && (
            <div className="empty-state mt-3 py-6">
              <p>Add contacts first so someone can follow this trip.</p>
              <button type="button" className="link mt-2" onClick={() => navigate("/app/contacts")}>
                Open Contacts
              </button>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((id) => id !== c.id)))
                  }
                />
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-muted">{c.relationship || c.phone}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? "Starting…" : "Start journey"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        required={required}
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
