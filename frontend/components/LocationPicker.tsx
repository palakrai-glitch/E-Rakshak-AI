"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Navigation, Search, AlertTriangle, X } from "lucide-react";

interface LocationInfo {
  address: string;
  latitude: number | null;
  longitude: number | null;
  city?: string;
  state?: string;
  source: "DEVICE_GPS" | "GEOCODED_AREA" | "MANUAL_PIN" | "NONE";
}

interface LocationPickerProps {
  onLocationSelect: (loc: LocationInfo) => void;
}

export default function LocationPicker({ onLocationSelect }: LocationPickerProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [currentLoc, setCurrentLoc] = useState<LocationInfo>({
    address: "",
    latitude: null,
    longitude: null,
    source: "NONE"
  });

  const handleUseDeviceLocation = () => {
    setIsLocating(true);
    setErrorMsg("");
    
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt reverse geocoding via Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const address = data.display_name || "Unknown Location";
          
          const loc: LocationInfo = { 
            address, 
            latitude, 
            longitude, 
            city: data.address?.city || data.address?.town,
            state: data.address?.state,
            source: "DEVICE_GPS" 
          };
          setCurrentLoc(loc);
          onLocationSelect(loc);
          setShowPopup(false);
        } catch (e) {
          const loc: LocationInfo = { address: "GPS Coordinates", latitude, longitude, source: "DEVICE_GPS" };
          setCurrentLoc(loc);
          onLocationSelect(loc);
          setShowPopup(false);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMsg("Location permission denied. Please search manually.");
          setManualMode(true);
        } else {
          setErrorMsg("Unable to retrieve location. Please try again or search manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const searchAddress = async () => {
    if (!searchQuery || searchQuery.length < 3) return;
    setIsSearching(true);
    setErrorMsg("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/location/geocode?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      setSearchResults(data.results || []);
      if (data.results?.length === 0) {
        setErrorMsg("No matching locations found.");
      }
    } catch (err) {
      setErrorMsg("Failed to search location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const loc: LocationInfo = {
      address: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      source: "GEOCODED_AREA"
    };
    setCurrentLoc(loc);
    onLocationSelect(loc);
    setShowPopup(false);
    setManualMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Current Location Display */}
      <div className="flex items-center justify-between p-4 bg-bg-secondary border border-border-strong rounded-lg shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
            <MapPin size={16} />
          </div>
          <div>
            <p className="text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Patient Location</p>
            {currentLoc.source !== "NONE" ? (
              <div>
                <p className="text-text-primary text-sm font-medium leading-snug">{currentLoc.address}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-text-secondary">
                  <span>Lat: {currentLoc.latitude?.toFixed(5)}</span>
                  <span>Lon: {currentLoc.longitude?.toFixed(5)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    {currentLoc.source.replace("_", " ")}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary italic text-sm">No location provided yet.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-md text-sm font-medium transition-colors whitespace-nowrap shadow-sm"
        >
          {currentLoc.source === "NONE" ? "Set Location" : "Change"}
        </button>
      </div>

      {/* Location Picker Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-border-strong rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <MapPin className="text-brand-primary" size={20} />
                  Locate Incident
                </h3>
                <button type="button" onClick={() => setShowPopup(false)} className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-bg-secondary transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {!manualMode ? (
                <div className="space-y-4">
                  <p className="text-text-secondary text-sm">
                    Allow E-Rakshak to access this device's location or search for an area manually.
                  </p>
                  
                  <div className="bg-status-warning/10 border border-status-warning/20 p-3 rounded-lg flex gap-3 mt-4">
                    <AlertTriangle className="text-status-warning shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-status-warning/90">
                      Your current location may differ from the actual patient. Confirm the address before submitting.
                    </p>
                  </div>

                  {errorMsg && <p className="text-status-danger text-sm font-medium">{errorMsg}</p>}

                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleUseDeviceLocation}
                      disabled={isLocating}
                      className="w-full bg-brand-primary hover:bg-brand-accent text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLocating ? (
                         <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white/30 border-t-white"></div>
                      ) : (
                        <Navigation size={18} />
                      )}
                      {isLocating ? "Acquiring GPS..." : "Share Current Device Location"}
                    </button>
                    
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-border-subtle"></div>
                      <span className="flex-shrink-0 mx-4 text-text-muted text-xs uppercase font-medium">Or</span>
                      <div className="flex-grow border-t border-border-subtle"></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setManualMode(true); setErrorMsg(""); }}
                      className="w-full bg-bg-secondary hover:bg-bg-elevated border border-border-strong text-text-primary font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Search size={18} className="text-text-muted" />
                      Search Address Manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-secondary text-sm mb-2">Search for an area, locality, or landmark.</p>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
                        placeholder="e.g. Shankar Nagar, Raipur"
                        className="w-full bg-bg-secondary border border-border-strong text-text-primary rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={searchAddress}
                      disabled={isSearching || searchQuery.length < 3}
                      className="bg-brand-primary hover:bg-brand-accent disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      {isSearching ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : "Search"}
                    </button>
                  </div>

                  {errorMsg && <p className="text-status-danger text-sm mt-2">{errorMsg}</p>}

                  {searchResults.length > 0 && (
                    <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectSearchResult(result)}
                          className="w-full text-left p-3 bg-bg-secondary hover:bg-bg-elevated border border-border-strong hover:border-brand-primary/50 rounded-lg transition-all group"
                        >
                          <p className="text-sm text-text-primary font-medium truncate group-hover:text-brand-primary transition-colors">{result.name}</p>
                          <p className="text-xs text-text-muted mt-1 capitalize flex items-center gap-2">
                            <span className="bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle">{result.type}</span> 
                            {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 flex justify-between mt-4">
                    <button
                      type="button"
                      onClick={() => setManualMode(false)}
                      className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-bg-secondary -ml-3"
                    >
                      &larr; Back Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
