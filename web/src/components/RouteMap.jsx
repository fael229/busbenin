import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2, AlertCircle } from "lucide-react";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons for departure and arrival
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">●</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const departIcon = createCustomIcon("#10B981"); // Green for departure
const arriveeIcon = createCustomIcon("#EF4444"); // Red for arrival

// Component to fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

// Geocode a city name using Nominatim (free OpenStreetMap geocoding)
async function geocodeCity(cityName) {
  try {
    // Add ", Benin" to improve geocoding accuracy for Beninese cities
    const searchQuery = `${cityName}, Benin`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "BusBenin/1.0 (contact@busbenin.com)", // Required by Nominatim
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }

    // Fallback: try without ", Benin"
    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cityName
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "BusBenin/1.0 (contact@busbenin.com)",
        },
      }
    );

    const fallbackData = await fallbackResponse.json();

    if (fallbackData && fallbackData.length > 0) {
      return {
        lat: parseFloat(fallbackData[0].lat),
        lon: parseFloat(fallbackData[0].lon),
        displayName: fallbackData[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Get route between two points using OSRM (free routing)
async function getRoute(start, end) {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`
    );

    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON coordinates [lon, lat] to Leaflet format [lat, lon]
      const coordinates = route.geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]);

      return {
        coordinates,
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
      };
    }

    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

// Format duration to human readable
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

// Format distance to human readable
function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export default function RouteMap({ depart, arrivee }) {
  const [departCoords, setDepartCoords] = useState(null);
  const [arriveeCoords, setArriveeCoords] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default center on Benin
  const defaultCenter = [9.3077, 2.3158];
  const defaultZoom = 7;

  useEffect(() => {
    async function loadMapData() {
      setLoading(true);
      setError(null);

      try {
        // Geocode both cities (with small delay between requests to be nice to Nominatim)
        const departResult = await geocodeCity(depart);

        // Wait 1 second between requests (Nominatim fair use policy)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const arriveeResult = await geocodeCity(arrivee);

        if (!departResult) {
          setError(`Impossible de localiser "${depart}"`);
          setLoading(false);
          return;
        }

        if (!arriveeResult) {
          setError(`Impossible de localiser "${arrivee}"`);
          setLoading(false);
          return;
        }

        setDepartCoords(departResult);
        setArriveeCoords(arriveeResult);

        // Get route between the two points
        const route = await getRoute(departResult, arriveeResult);
        setRouteData(route);
      } catch (err) {
        console.error("Error loading map data:", err);
        setError("Erreur lors du chargement de la carte");
      } finally {
        setLoading(false);
      }
    }

    if (depart && arrivee) {
      loadMapData();
    }
  }, [depart, arrivee]);

  // Calculate bounds for the map
  const bounds = useMemo(() => {
    if (departCoords && arriveeCoords) {
      return [
        [departCoords.lat, departCoords.lon],
        [arriveeCoords.lat, arriveeCoords.lon],
      ];
    }
    return null;
  }, [departCoords, arriveeCoords]);

  if (loading) {
    return (
      <div className="route-map-container route-map-loading">
        <div className="route-map-loading-content">
          <Loader2 className="route-map-spinner" />
          <p>Chargement de la carte...</p>
          <p className="route-map-loading-hint">
            Géocodage de {depart} et {arrivee}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-map-container route-map-error">
        <div className="route-map-error-content">
          <AlertCircle className="route-map-error-icon" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!departCoords || !arriveeCoords) {
    return null;
  }

  return (
    <div className="route-map-wrapper">
      {/* Route info bar */}
      {routeData && (
        <div className="route-map-info">
          <div className="route-map-info-item">
            <Navigation className="route-map-info-icon" />
            <span>{formatDistance(routeData.distance)}</span>
          </div>
          <div className="route-map-info-divider">•</div>
          <div className="route-map-info-item">
            <span>🚌</span>
            <span>~{formatDuration(routeData.duration)}</span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div className="route-map-container">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="route-map"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds to show both markers */}
          <FitBounds bounds={bounds} />

          {/* Departure marker */}
          <Marker
            position={[departCoords.lat, departCoords.lon]}
            icon={departIcon}
          >
            <Popup>
              <div className="route-map-popup">
                <strong>🟢 Départ</strong>
                <p>{depart}</p>
              </div>
            </Popup>
          </Marker>

          {/* Arrival marker */}
          <Marker
            position={[arriveeCoords.lat, arriveeCoords.lon]}
            icon={arriveeIcon}
          >
            <Popup>
              <div className="route-map-popup">
                <strong>🔴 Arrivée</strong>
                <p>{arrivee}</p>
              </div>
            </Popup>
          </Marker>

          {/* Route polyline */}
          {routeData && routeData.coordinates && (
            <Polyline
              positions={routeData.coordinates}
              pathOptions={{
                color: "#6366F1",
                weight: 5,
                opacity: 0.8,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="route-map-legend">
        <div className="route-map-legend-item">
          <span className="route-map-legend-dot route-map-legend-dot-depart"></span>
          <span>{depart}</span>
        </div>
        <div className="route-map-legend-arrow">→</div>
        <div className="route-map-legend-item">
          <span className="route-map-legend-dot route-map-legend-dot-arrivee"></span>
          <span>{arrivee}</span>
        </div>
      </div>
    </div>
  );
}
