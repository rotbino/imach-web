"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

/*
 * MapView — نقشه‌ی داخلیِ LocationPicker؛ فقط سمت کلاینت و از طریق
 * next/dynamic با ssr:false بار می‌شود (Leaflet به window نیاز دارد).
 * نشانگر با divIcon ساخته می‌شود تا به asset های باندلر وابسته نباشد.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

// پین نارنجی برند — SVG داخل خودِ آیکون
const pinIcon = L.divIcon({
  className: "imach-map-pin",
  html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.4 12.1 25.4 12.6 26a.5.5 0 0 0 .8 0C15.9 39.4 28 23.4 28 14 28 6.8 22.2 1 15 1z" fill="#f97316" stroke="#ffffff" stroke-width="1.5"/><circle cx="15" cy="14" r="5" fill="#ffffff"/></svg>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

/** هر کلیک روی نقشه = برداشت نقطه */
function ClickCatcher({ onPick }: { onPick: (p: GeoPoint) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

/** وقتی نقطه‌ی شروع عوض می‌شود (باز شدن دیالوگ / نتیجه‌ی اجازه‌ی لوکیشن) نقشه دنبالش می‌رود */
function Follow({ center }: { center: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center, map]);
  return null;
}

/** نقشه داخل دیالوگ با انیمیشن باز می‌شود — بعد از جا افتادن، اندازه تازه بگیر */
function SizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function MapView({
  center,
  position,
  onPick,
  onDrag,
}: {
  center: GeoPoint;
  position: GeoPoint | null;
  onPick: (p: GeoPoint) => void;
  onDrag: (p: GeoPoint) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom
      className="h-72 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onPick={onPick} />
      <Follow center={center} />
      <SizeFix />
      {position && (
        <Marker
          position={[position.lat, position.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onDrag({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
