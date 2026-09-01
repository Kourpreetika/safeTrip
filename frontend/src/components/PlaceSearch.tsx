import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { searchIndiaPlaces, type Place } from "../lib/places";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (place: Place | null) => void;
  placeholder?: string;
  variant?: "pickup" | "drop";
  locked?: boolean;
  near?: { lat: number; lng: number } | null;
  onUseCurrentLocation?: () => void;
};

export function PlaceSearch({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  variant = "drop",
  locked = false,
  near,
  onUseCurrentLocation,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const selectedLabel = useRef(value);

  useEffect(() => {
    if (locked) selectedLabel.current = value;
  }, [locked, value]);

  useEffect(() => {
    const q = value.trim();
    if (q === selectedLabel.current) {
      setResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      void searchIndiaPlaces(q, near ?? undefined)
        .then((places) => {
          setResults(places);
          setActive(0);
          setSearchError(places.length === 0 ? "No matching places in India. Try an area, landmark, or 6-digit PIN." : null);
        })
        .catch(() => {
          setResults([]);
          setSearchError("Location search is unavailable. Try again.");
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [value, near?.lat, near?.lng]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(place: Place) {
    selectedLabel.current = place.label;
    onChange(place.label);
    onSelect(place);
    setOpen(false);
    setResults([]);
    setSearchError(null);
  }

  function onType(next: string) {
    if (next !== selectedLabel.current) onSelect(null);
    onChange(next);
    setOpen(true);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const place = results[active];
      if (place) pick(place);
    }
  }

  const showMenu = open && (loading || results.length > 0 || !!searchError || !!onUseCurrentLocation);

  return (
    <div ref={rootRef} className="relative">
      <span className="field-label">{label}</span>
      <div className="relative">
        <span
          className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 ${
            variant === "pickup" ? "border-header bg-primary" : "border-header bg-header"
          }`}
        />
        <input
          value={value}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input-field pl-9 pr-10"
          autoComplete="off"
          role="combobox"
          aria-expanded={showMenu}
          aria-autocomplete="list"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        ) : locked ? (
          <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
        ) : null}
      </div>
      {showMenu && (
        <ul className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-card">
          {onUseCurrentLocation && value.trim().length < 3 && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-surface"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onUseCurrentLocation();
                  setOpen(false);
                }}
              >
                <LocateFixed className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-medium">Use current location</span>
                  <span className="block text-xs text-muted">GPS pickup, like a cab app</span>
                </span>
              </button>
            </li>
          )}
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${r.label}`}>
              <button
                type="button"
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-surface ${i === active ? "bg-surface" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(r)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <span>
                  <span className="block text-sm font-medium text-ink">{r.title}</span>
                  {r.subtitle ? <span className="block text-xs text-muted">{r.subtitle}</span> : null}
                </span>
              </button>
            </li>
          ))}
          {searchError && results.length === 0 && !loading && (
            <li className="px-3 py-2 text-xs text-sos">{searchError}</li>
          )}
        </ul>
      )}
    </div>
  );
}
