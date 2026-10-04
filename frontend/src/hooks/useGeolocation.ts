import { useEffect, useRef, useState } from "react";

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy?: number;
  speedMps?: number | null;
  heading?: number | null;
};

const HIGH_ACCURACY: PositionOptions = { enableHighAccuracy: true, maximumAge: 60_000, timeout: 25_000 };
const LOW_ACCURACY: PositionOptions = { enableHighAccuracy: false, maximumAge: 120_000, timeout: 20_000 };

export function useGeolocation(enabled: boolean, intervalMs = 8000) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const hasFix = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError(
        "This browser does not support GPS. Open SafeTrip in Chrome, Safari, or Firefox and allow Location when asked.",
      );
      return;
    }

    const onOk = (pos: GeolocationPosition) => {
      hasFix.current = true;
      setError(null);
      setFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speedMps: pos.coords.speed,
        heading: pos.coords.heading,
      });
    };

    const onErr = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT && hasFix.current) return;
      if (err.code === err.PERMISSION_DENIED) {
        setError(
          "Location permission was denied. Click the lock or info icon next to the address bar, allow Location, then refresh this page.",
        );
      } else if (err.code === err.TIMEOUT) {
        setError(
          "Waiting for GPS. Keep this page open, turn on location services, and stay near a window if you can.",
        );
        navigator.geolocation.getCurrentPosition(onOk, () => undefined, LOW_ACCURACY);
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setError(
          "GPS is unavailable right now. Turn on location services for this device and browser, then keep this page open.",
        );
      } else {
        setError(
          "Could not read your location. Allow Location for this site in browser settings, then refresh.",
        );
      }
    };

    navigator.geolocation.getCurrentPosition(onOk, () => {
      navigator.geolocation.getCurrentPosition(onOk, onErr, LOW_ACCURACY);
    }, HIGH_ACCURACY);

    watchRef.current = navigator.geolocation.watchPosition(onOk, onErr, {
      ...HIGH_ACCURACY,
      maximumAge: Math.max(intervalMs, 15_000),
    });
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [enabled, intervalMs]);

  return { fix, error };
}
