"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon paths
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A component to auto-fit bounds when cases change
function MapController({ cases }: { cases: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (cases.length > 0) {
      const validCases = cases.filter(c => c.latitude && c.longitude);
      if (validCases.length > 0) {
        const bounds = L.latLngBounds(validCases.map(c => [c.latitude, c.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [cases, map]);

  return null;
}

export function DashboardMap({ cases = [] }: { cases: any[] }) {
  const [mounted, setMounted] = useState(false);
  const defaultCenter: [number, number] = [21.2514, 81.6296]; // Raipur, default

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full min-h-[300px] bg-bg-secondary animate-pulse flex items-center justify-center text-text-muted">Loading map...</div>;

  const validCases = cases.filter(c => c.latitude && c.longitude);

  return (
    <div className="w-full h-full min-h-[300px] z-0">
      <MapContainer 
        center={validCases.length > 0 ? [validCases[0].latitude, validCases[0].longitude] : defaultCenter} 
        zoom={12} 
        scrollWheelZoom={false}
        className="w-full h-full absolute inset-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {validCases.map(c => (
          <Marker 
            key={c.case_id} 
            position={[c.latitude, c.longitude]}
            icon={customIcon}
          >
            <Popup className="custom-popup">
              <div className="font-sans">
                <div className="font-bold text-sm mb-1">{c.case_id}</div>
                <div className="text-xs">{c.chief_complaint || 'Emergency'}</div>
                <div className="text-[10px] font-mono mt-1 text-brand-primary">{c.status}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapController cases={validCases} />
      </MapContainer>
    </div>
  );
}
