import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

type Place = { label: string; lat: number; lng: number };

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (place: Place) => void;
  placeholder?: string;
};

export function PlaceSearch({ label, value, onChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = value.trim();
    const pin = /^\d{6}$/.test(q);
    if (!pin && q.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const t = setTimeout(() => {
      void api<{ results: Place[] }>(`/api/geo/search?q=${encodeURIComponent(q)}`)
        .then((d) => {
          setResults(d.results);
          setSearchError(null);
          if (d.results.length === 0) setSearchError("No matching places in India. Try a PIN code or a fuller address.");
        })
        .catch((err) => {
          setResults([]);
          setSearchError(err instanceof ApiError ? err.message : "Location search is unavailable. Try again.");
        });
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <label className="relative block">
      <span className="field-label">{label}</span>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field"
        autoComplete="off"
      />
      {searchError && !open && <p className="mt-1 text-xs text-muted">{searchError}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-card">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lng}-${r.label}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface"
                onClick={() => {
                  onSelect(r);
                  onChange(r.label);
                  setOpen(false);
                  setSearchError(null);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && searchError && results.length === 0 && (
        <p className="mt-1 text-xs text-sos">{searchError}</p>
      )}
    </label>
  );
}
