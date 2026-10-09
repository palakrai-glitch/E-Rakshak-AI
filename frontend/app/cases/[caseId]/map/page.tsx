"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWebSocket } from "@/lib/websocket";
import { Loader2, Activity, Map as MapIcon, Route, Ambulance, Building2 } from "lucide-react";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-bg-elevated animate-pulse rounded-lg flex flex-col items-center justify-center border border-border-strong">
      <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
      <span className="text-text-muted font-medium">Initializing GIS Layers...</span>
    </div>
  )
});

const getWsUrl = (caseId: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const wsBaseUrl = apiUrl.replace(/^http/, "ws");
  return `${wsBaseUrl}/ws/cases/${caseId}`;
};

function MapContent() {
  const params = useParams();
  const caseId = params?.caseId as string;
  const [mapData, setMapData] = useState<any>(null);
  const [raipurGeoJson, setRaipurGeoJson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.event === "RESOURCE_STATUS_CHANGED") {
        const { resource_type, resource_id, new_status } = data.data;
        setMapData((prev: any) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (resource_type === "hospital") {
            next.hospitals = next.hospitals.map((h: any) => 
              h.hospital_id === resource_id ? { ...h, status: new_status } : h
            );
          } else if (resource_type === "ambulance") {
            next.ambulances = next.ambulances.map((a: any) => 
              a.ambulance_id === resource_id ? { ...a, status: new_status } : a
            );
          }
          return next;
        });
    } else if (data.event === "PATHWAY_CHANGED") {
      setMapData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            orchestration: data.orchestration
          };
      });
    } else if (data.event === "AMBULANCE_LOCATION_UPDATED") {
      const { ambulance_id, latitude, longitude } = data.data;
      setMapData((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.ambulances = next.ambulances.map((a: any) => 
          a.ambulance_id === ambulance_id ? { ...a, current_latitude: latitude, current_longitude: longitude } : a
        );
        return next;
      });
    }
  }, []);

  const { connectionState, sendMessage } = useWebSocket({
    url: getWsUrl(caseId),
    onMessage: handleWebSocketMessage
  });

  useEffect(() => {
    async function fetchMapData() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      try {
        const [mapRes, geoBoundRes, geoHospRes, geoResRes] = await Promise.allSettled([
          fetch(`${apiUrl}/api/location/cases/${caseId}/map`),
          fetch(`/api/gis/raipur.geojson`),
          fetch(`/api/gis/raipur_hospitals.geojson`),
          fetch(`/api/gis/hospital_resources.geojson`)
        ]);
        
        let fetchedMapData = null;
        let mergedGeoHospitals: any[] = [];

        if (mapRes.status === 'fulfilled' && mapRes.value.ok) {
          fetchedMapData = await mapRes.value.json();
          setMapData(fetchedMapData);
        }
        
        if (geoBoundRes.status === 'fulfilled' && geoBoundRes.value.ok) {
          const geoData = await geoBoundRes.value.json();
          setRaipurGeoJson(geoData);
        }

        if (geoHospRes.status === 'fulfilled' && geoHospRes.value.ok && geoResRes.status === 'fulfilled' && geoResRes.value.ok) {
          const hospGeo = await geoHospRes.value.json();
          const resGeo = await geoResRes.value.json();
          
          const resourceMap = new Map();
          resGeo.features.forEach((f: any) => {
            resourceMap.set(f.properties.hospital_id, f.properties);
          });

          mergedGeoHospitals = hospGeo.features.map((f: any) => {
            const hid = f.properties.hospital_id;
            const res = resourceMap.get(hid) || {};
            
            let currentStatus = res.status;
            if (fetchedMapData) {
               const mapHosp = fetchedMapData.hospitals?.find((h: any) => h.hospital_id === hid);
               if (mapHosp) {
                  currentStatus = mapHosp.status;
               }
            }

            return {
              hospital_id: hid,
              name: f.properties.name,
              latitude: f.geometry.coordinates[1],
              longitude: f.geometry.coordinates[0],
              ...res,
              status: currentStatus
            };
          });
          
          setMapData((prev: any) => {
            const safePrev = prev || { case: null, hospitals: [], ambulances: [], orchestration: null };
            return {
              ...safePrev,
              hospitals: mergedGeoHospitals.length > 0 ? mergedGeoHospitals : safePrev.hospitals
            };
          });
        }
      } catch (err) {
        console.error("Failed to fetch map data", err);
      } finally {
        setMapData((prev: any) => {
          if (prev) return prev;
          return { case: null, hospitals: [], ambulances: [], orchestration: null };
        });
        setLoading(false);
      }
    }
    fetchMapData();
  }, [caseId]);

  useEffect(() => {
    if (connectionState === "CONNECTED" && mapData?.orchestration?.recommended_pathway) {
      sendMessage({
        type: "SET_PATHWAY_ID",
        pathway_id: mapData.orchestration.recommended_pathway.pathway_id
      });
    }
  }, [connectionState, mapData?.orchestration?.recommended_pathway?.pathway_id, sendMessage]);

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <MapIcon className="text-brand-primary" />
                Live Command Map
              </h1>
              {connectionState === 'CONNECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-xs font-semibold tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
                  </span>
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-semibold tracking-wide">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-danger"></span>
                  OFFLINE
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm font-medium">Tracking resource orchestration for Case <span className="font-mono text-brand-secondary">{caseId}</span></p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/cases/${caseId}/orchestration`}
              className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Back to Case Board
            </Link>
          </div>
        </div>
        
        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* GIS Map Panel */}
          <div className="lg:col-span-3 glass-panel p-1 rounded-xl overflow-hidden shadow-lg h-[600px] md:h-[700px] relative z-10 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-bg-elevated rounded-lg">
                <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
              </div>
            ) : (
              <div className="flex-1 rounded-lg overflow-hidden border border-border-subtle bg-bg-surface">
                <MapComponent data={mapData} geoJson={raipurGeoJson} />
              </div>
            )}
          </div>
          
          {/* Side Panel */}
          <div className="space-y-6 flex flex-col h-full max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
            
            {/* Pathway Info */}
            {mapData?.orchestration?.recommended_pathway && (
              <div className="glass-panel p-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-[13px] font-bold uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                  <Route size={16} className="text-brand-secondary" />
                  Active Pathway
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-strong transition-colors hover:border-brand-primary/50">
                    <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
                      <Ambulance size={14} className="text-status-info" />
                      Ambulance ETA
                    </div>
                    <div className="text-2xl font-bold text-text-primary mb-1">
                      {mapData.orchestration.recommended_pathway.ambulance.eta_minutes !== null ? 
                        `${mapData.orchestration.recommended_pathway.ambulance.eta_minutes} min` : 
                        "Estimating..."}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      Routing Distance: <span className="text-text-primary">{mapData.orchestration.recommended_pathway.ambulance.distance_km} km</span>
                    </div>
                  </div>
                  
                  <div className="bg-bg-secondary p-3.5 rounded-lg border border-border-strong transition-colors hover:border-brand-primary/50">
                    <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
                      <Building2 size={14} className="text-brand-primary" />
                      Hospital Transit
                    </div>
                    <div className="text-2xl font-bold text-text-primary mb-1">
                      {mapData.orchestration.recommended_pathway.hospital.eta_minutes !== null ? 
                        `${mapData.orchestration.recommended_pathway.hospital.eta_minutes} min` : 
                        "Estimating..."}
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                      Routing Distance: <span className="text-text-primary">{mapData.orchestration.recommended_pathway.hospital.distance_km} km</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Map Legend */}
            <div className="glass-panel p-5 mt-auto">
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-text-muted mb-4 border-b border-border-subtle pb-3">GIS Legend</h3>
              <ul className="space-y-3 text-sm font-medium">
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full bg-status-danger border border-white/20 shadow-sm"></span> 
                  Incident Location
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full bg-status-success border border-white/20 shadow-sm"></span> 
                  Available Hospital
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full bg-status-warning border border-white/20 shadow-sm"></span> 
                  Target Hospital
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full bg-status-info border border-white/20 shadow-sm"></span> 
                  Available Ambulance
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#8B7CFF] border border-white/20 shadow-sm"></span> 
                  Dispatched Ambulance
                </li>
                <li className="flex items-center gap-3 text-text-secondary pt-2">
                  <div className="w-4 h-1 bg-brand-primary rounded-full"></div> 
                  Calculated Route
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] bg-bg-main flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-secondary font-medium">Connecting to GIS Engine...</p>
      </div>
    }>
      <MapContent />
    </React.Suspense>
  );
}
