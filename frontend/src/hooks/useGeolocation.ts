import { useEffect, useRef, useState } from "react";

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy?: number;
  speedMps?: number | null;
  heading?: number | null;
};

export function useGeolocation(enabled: boolean, intervalMs = 8000) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError(
        "This browser does not support GPS. Open SafeTrip in Chrome, Safari, or Firefox and allow Location when asked.",
      );
      return;
    }
    const onOk = (pos: GeolocationPosition) => {
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
      if (err.code === err.PERMISSION_DENIED) {
        setError(
          "Location permission was denied. Click the lock or info icon next to the address bar, allow Location, then refresh this page.",
        );
      } else if (err.code === err.TIMEOUT) {
        setError(
          "Location request timed out. Turn on GPS / location services, make sure you have a signal, then refresh.",
        );
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setError(
          "GPS is unavailable right now. Turn on location services for this device and browser, then refresh.",
        );
      } else {
        setError(
          "Could not read your location. Allow Location for this site in browser settings, then refresh.",
        );
      }
    };
    watchRef.current = navigator.geolocation.watchPosition(onOk, onErr, {
      enableHighAccuracy: true,
      maximumAge: intervalMs,
      timeout: 12000,
    });
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [enabled, intervalMs]);

  return { fix, error };
}
