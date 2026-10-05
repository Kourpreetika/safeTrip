import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { api, ApiError } from "../api/client";
import { PlaceSearch } from "../components/PlaceSearch";
import { MapView } from "../components/MapView";
import { useToast } from "../context/ToastContext";
import { reverseIndiaPlace, type Place } from "../lib/places";
import type { Contact, Journey } from "../types";
import { smsNotice, type SmsResult } from "../lib/smsStatus";

type RouteInfo = {
  coordinates: number[][];
  durationMin: number | null;
  distanceMeters: number | null;
  source?: string;
  hasTraffic?: boolean;
};

export function CreateJourneyPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
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
      if (!draftId) setSelected(d.contacts.map((c) => c.id));
    });
  }, [draftId]);

  useEffect(() => {
    if (!draftId) return;
    void api<{ journey: Journey }>(`/api/journeys/${draftId}`)
      .then((d) => {
        const j = d.journey;
        if (j.status !== "draft") {
          toast("This journey is no longer a draft.", "warn");
          navigate(j.status === "active" ? `/app/journey/${j.id}` : "/app");
          return;
        }
        setStartAddress(j.startAddress);
        setDestAddress(j.destAddress);
        setStart({ lat: j.startLat, lng: j.startLng });
        setDest({ lat: j.destLat, lng: j.destLng });
        setDriverName(j.driverName);
        setVehicleNumber(j.vehicleNumber);
        setRideProvider(j.rideProvider || "Uber");
        setRideId(j.rideId || "");
        setSelected(j.contacts.map((c) => c.id));
        if (j.plannedRoute?.length) {
          setRoute({
            coordinates: j.plannedRoute,
            durationMin: j.estimatedDurationMin,
            distanceMeters: j.routeDistanceMeters ?? null,
            source: j.etaSource ?? undefined,
          });
        }
      })
      .catch(() => {
        toast("Could not open that draft.", "err");
        navigate("/app");
      });
  }, [draftId]);

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
    const apply = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const label = await reverseIndiaPlace(lat, lng);
      applyPickup({ label, title: "Current location", subtitle: label, lat, lng });
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => void apply(pos),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => void apply(pos),
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsMsg("Location permission denied. Allow Location for this site, or type a pickup area / PIN.");
            } else {
              setGpsMsg("Could not read GPS yet. Type a pickup area / PIN, or try Use my current location again.");
            }
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
        );
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 60000 },
    );
  }

  async function persist() {
    const body = {
      startAddress,
      startLat: start!.lat,
      startLng: start!.lng,
      destAddress,
      destLat: dest!.lat,
      destLng: dest!.lng,
      vehicleNumber,
      driverName,
      rideProvider,
      rideId: rideId.trim(),
      estimatedDurationMin: route!.durationMin as number,
      contactIds: selected,
      plannedRoute: route!.coordinates,
      routeDistanceMeters: route!.distanceMeters ?? undefined,
    };
    if (draftId) {
      const updated = await api<{ journey: Journey }>(`/api/journeys/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return updated.journey;
    }
    const created = await api<{ journey: Journey }>("/api/journeys", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSearchParams({ draft: created.journey.id }, { replace: true });
    return created.journey;
  }

  function validate() {
    if (!start || !dest) {
      toast("Select a pickup and a drop from the suggestion list.", "warn");
      return false;
    }
    if (!route?.durationMin || !route.coordinates?.length) {
      toast(routeError ?? "Wait for the live ETA to load before saving or starting.", "warn");
      return false;
    }
    if (!rideId.trim()) {
      toast("Enter the ride ID.", "warn");
      return false;
    }
    if (selected.length === 0) {
      toast("Select at least one trusted contact from your saved list.", "warn");
      return false;
    }
    return true;
  }

  async function onSaveDraft() {
    if (!validate()) return;
    setBusy(true);
    try {
      await persist();
      toast("Draft saved. After you end any active trip, open this draft from the dashboard to start.");
      navigate("/app");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not save the draft.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const journey = await persist();
      const started = await api<{
        journey: Journey;
        sms?: SmsResult;
      }>(`/api/journeys/${journey.id}/start`, { method: "POST" });
      const notice = smsNotice("Journey started.", started.sms);
      toast(notice.message, notice.kind);
      navigate(`/app/journey/${started.journey.id}`, { state: { sms: started.sms } });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not start the journey.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">{draftId ? "Start saved draft" : "Create Journey"}</h1>
      <p className="page-lead">
        {draftId
          ? "Tick or untick trusted contacts from your saved list, then start. You do not add contacts again."
          : "Type a pickup and drop, then tap a suggestion — anywhere in India, including PIN codes."}
      </p>
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
          <p className="mt-1 text-xs text-muted">
            These are people you already saved. Select or deselect who should be notified this trip.
          </p>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} className="btn-secondary w-full py-3" onClick={() => void onSaveDraft()}>
            {busy ? "Please wait…" : "Save draft"}
          </button>
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? "Starting…" : "Start journey"}
          </button>
        </div>
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
