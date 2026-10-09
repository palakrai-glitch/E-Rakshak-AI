"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix missing marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const createIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const patientIcon = createIcon('red');
const hospitalOpenIcon = createIcon('green');
const hospitalClosedIcon = createIcon('grey');
const hospitalSelectedIcon = createIcon('gold');
const hospitalHighLoadIcon = createIcon('orange');
const hospitalSpecializedIcon = createIcon('violet');
const ambulanceAvailableIcon = createIcon('blue');
const ambulanceBusyIcon = createIcon('grey');
const ambulanceSelectedIcon = createIcon('yellow');

// Component to recenter/zoom map to bounds or center
function MapController({ center, geoJson }: { center: [number, number], geoJson?: any }) {
  const map = useMap();
  useEffect(() => {
    if (geoJson) {
      const geoJsonLayer = L.geoJSON(geoJson);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        map.setView(center);
      }
    } else {
      map.setView(center);
    }
  }, [center, geoJson, map]);
  return null;
}

export default function MapComponent({ data, geoJson }: { data: any, geoJson?: any }) {
  // Raipur center as default fallback
  const RAIPUR_CENTER: [number, number] = [21.2514, 81.6296];

  if (!data) return <div className="h-[600px] w-full flex items-center justify-center text-slate-400">Loading map data...</div>;

  const caseLat = data.case?.latitude ?? RAIPUR_CENTER[0];
  const caseLon = data.case?.longitude ?? RAIPUR_CENTER[1];
  const caseLoc: [number, number] = [caseLat, caseLon];
  
  const hospitals = data.hospitals || [];
  const ambulances = data.ambulances || [];
  
  const recommendedHospId = data.orchestration?.recommended_pathway?.hospital?.resource_id;
  const recommendedAmbId = data.orchestration?.recommended_pathway?.ambulance?.resource_id;
  
  const recommendedPathway = data.orchestration?.recommended_pathway;
  
  // Extract route coordinates if available
  let routeCoords: [number, number][] = [];
  if (recommendedPathway?.route_geometry?.coordinates) {
    // GeoJSON uses [lon, lat], Leaflet wants [lat, lon]
    routeCoords = recommendedPathway.route_geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  }

  return (
    <div style={{ height: "600px", width: "100%", borderRadius: "0.5rem", overflow: "hidden", zIndex: 0, position: "relative" }}>
      <MapContainer center={caseLoc} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={caseLoc} geoJson={geoJson} />

        {/* Raipur Boundary */}
        {geoJson && (
          <GeoJSON 
            data={geoJson} 
            style={{ color: '#06b6d4', weight: 2, fillOpacity: 0.1, dashArray: '5, 5' }} 
          />
        )}

        {/* Patient Marker */}
        <Marker position={caseLoc} icon={patientIcon}>
          <Popup>
            <strong>Emergency Patient</strong><br />
            Case: {data.case?.case_id || 'N/A'}
          </Popup>
        </Marker>

        {/* Hospital Markers */}
        {hospitals.map((hosp: any) => {
          const isSelected = hosp.hospital_id === recommendedHospId;
          
          let icon = hospitalOpenIcon;
          if (isSelected) icon = hospitalSelectedIcon;
          else if (hosp.status === "CLOSED") icon = hospitalClosedIcon;
          else if (hosp.status === "HIGH_LOAD") icon = hospitalHighLoadIcon;
          else if (hosp.status === "SPECIALIZED") icon = hospitalSpecializedIcon;

          return (
            <Marker key={hosp.hospital_id} position={[hosp.latitude, hosp.longitude]} icon={icon}>
              <Popup className="min-w-[250px]">
                <div className="text-sm">
                  <strong className="text-base text-slate-800">{hosp.name || hosp.hospital_id}</strong>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-slate-600">
                    <div><strong>Status:</strong> {hosp.status}</div>
                    <div><strong>Load:</strong> {hosp.current_load_percent}%</div>
                    <div><strong>Beds:</strong> {hosp.available_beds}</div>
                    <div><strong>ICU:</strong> {hosp.icu_available}</div>
                  </div>
                  <div className="mt-2 border-t pt-1 text-slate-600">
                    <div><strong>Emergency:</strong> {hosp.emergency ? "Yes" : "No"}</div>
                    <div><strong>Trauma:</strong> {hosp.trauma ? "Yes" : "No"}</div>
                    <div><strong>Oxygen:</strong> {hosp.oxygen_available ? "Yes" : "No"}</div>
                  </div>
                  {hosp.specialties && hosp.specialties.length > 0 && (
                    <div className="mt-2 border-t pt-1">
                      <strong>Specialties:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hosp.specialties.map((spec: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{spec}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {isSelected && recommendedPathway?.hospital?.distance_km && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <strong>Route ETA:</strong> {recommendedPathway.hospital.eta_minutes} min<br/>
                      <span className="text-xs text-slate-500">Distance: {recommendedPathway.hospital.distance_km} km</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulance Markers */}
        {ambulances.map((amb: any) => {
          const isSelected = amb.ambulance_id === recommendedAmbId;
          const isBusy = amb.status === "BUSY" || amb.status === "MAINTENANCE";
          let icon = ambulanceAvailableIcon;
          if (isSelected) icon = ambulanceSelectedIcon;
          else if (isBusy) icon = ambulanceBusyIcon;

          return (
            <Marker key={amb.ambulance_id} position={[amb.current_latitude ?? amb.latitude, amb.current_longitude ?? amb.longitude]} icon={icon}>
              <Popup>
                <div className="text-sm">
                  <strong className="text-base text-slate-800">{amb.ambulance_id}</strong>
                  {amb.data_type === "SYNTHETIC_DEMO" && (
                    <span className="ml-2 inline-block bg-amber-100 text-amber-700 border border-amber-200 text-[10px] px-1 rounded font-mono">DEMO</span>
                  )}
                  <br />
                  <div className="mt-1 text-slate-600">
                    <div><strong>Vehicle:</strong> {amb.vehicle_number || "N/A"}</div>
                    <div><strong>Type:</strong> {amb.type} ({amb.crew_type})</div>
                    <div><strong>Status:</strong> {amb.status}</div>
                    {amb.base_hospital && (
                      <div className="mt-1 pt-1 border-t"><strong>Base:</strong> {amb.base_hospital.name}</div>
                    )}
                  </div>
                  {isSelected && recommendedPathway?.ambulance?.distance_km && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <strong>Route ETA:</strong> {recommendedPathway.ambulance.eta_minutes} min<br/>
                      <span className="text-xs text-slate-500">Distance: {recommendedPathway.ambulance.distance_km} km</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="blue" weight={5} opacity={0.6} />
        )}
      </MapContainer>
      
      {/* Map Attribution Overlay */}
      <div className="absolute bottom-1 left-1 z-[1000] bg-white/90 px-2 py-1 rounded shadow text-[10px] text-slate-600 pointer-events-none">
        Hospital locations: OpenStreetMap / public geospatial sources. Emergency resource values are synthetic demo data.
      </div>
    </div>
  );
}
