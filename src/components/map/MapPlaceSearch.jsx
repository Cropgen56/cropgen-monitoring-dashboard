import React, { useEffect, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  autocompletePlaces,
  getPlace,
  isPlacesSearchEnabled,
  newPlacesSessionToken,
} from "../../api/placesApi";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

const PIN_ICON = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#79c24a;border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.45)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

/**
 * Google Places search box overlaid on a react-leaflet map (Maharashtra only).
 * Must render inside <MapContainer>. Renders nothing when no API key is configured.
 * `onPlaceSelect(place)` fires after the map moves to a chosen place.
 */
export default function MapPlaceSearch({ onPlaceSelect }) {
  const map = useMap();
  const boxRef = useRef(null);
  const sessionRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);

  // Typing / scrolling in the box must not pan or zoom the map.
  useEffect(() => {
    if (!boxRef.current) return;
    L.DomEvent.disableClickPropagation(boxRef.current);
    L.DomEvent.disableScrollPropagation(boxRef.current);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS || q === picked?.name) {
      setResults([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      sessionRef.current ??= newPlacesSessionToken();
      setLoading(true);
      setError("");
      try {
        const rows = await autocompletePlaces(q, { sessionToken: sessionRef.current, signal: ctrl.signal });
        setResults(rows);
        setActive(rows.length ? 0 : -1);
        setOpen(true);
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, picked]);

  const choose = async (row) => {
    setOpen(false);
    setLoading(true);
    setError("");
    try {
      const place = await getPlace(row.placeId, { sessionToken: sessionRef.current });
      sessionRef.current = null;
      setPicked(place);
      setQuery(place.name || row.mainText);
      if (place.viewport) map.flyToBounds(place.viewport, { maxZoom: 16, duration: 1.2 });
      else map.flyTo([place.lat, place.lng], 15, { duration: 1.2 });
      onPlaceSelect?.(place);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setPicked(null);
    setError("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") return setOpen(false);
    if (!open || !results.length) return undefined;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    }
    return undefined;
  };

  if (!isPlacesSearchEnabled) return null;

  return (
    <>
      <div
        ref={boxRef}
        className="absolute left-14 right-3 top-3 z-[1000] sm:right-auto sm:w-[min(360px,calc(100%-4.5rem))]"
      >
        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0d1117]/92 px-3 py-2 shadow-lg shadow-black/40 backdrop-blur-sm focus-within:border-cg-accent/60">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cg-accent" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search village, town or place in Maharashtra"
            aria-label="Search places on the map"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white placeholder:text-gray-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={clear} aria-label="Clear search" className="text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1 rounded-md bg-red-950/90 px-3 py-1.5 text-[11px] text-red-100">{error}</p>
        )}

        {open && query.trim().length >= MIN_CHARS && !picked && (
          <ul
            role="listbox"
            className="custom-scrollbar mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117]/95 py-1 shadow-xl shadow-black/50 backdrop-blur-sm"
          >
            {results.length === 0 && !loading && (
              <li className="px-3 py-2 text-[11px] text-gray-500">No places found in Maharashtra</li>
            )}
            {results.map((r, i) => (
              <li key={r.placeId} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                    i === active ? "bg-cg-accent/15" : ""
                  }`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cg-accent/80" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-white">{r.mainText}</span>
                    <span className="block truncate text-[10px] text-gray-500">{r.secondaryText}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picked && (
        <Marker position={[picked.lat, picked.lng]} icon={PIN_ICON}>
          <Popup>
            <div className="text-xs text-gray-900">
              <strong>{picked.name}</strong>
              <br />
              {picked.address}
              {picked.district && (
                <>
                  <br />
                  District: {picked.district}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
