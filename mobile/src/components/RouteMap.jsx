import React, { useState, useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { Navigation, AlertCircle } from "lucide-react-native";

// Generate the HTML content for Leaflet map
const generateMapHTML = (depart, arrivee) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Route Map</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #map { width: 100%; height: 100%; }
    
    .loading-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      z-index: 1000;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e7ff;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: #4b5563;
      font-size: 14px;
    }
    
    .error-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fef2f2;
      z-index: 1000;
    }
    
    .error-text {
      color: #dc2626;
      font-size: 14px;
      text-align: center;
      padding: 20px;
    }
    
    .info-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      padding: 8px 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      z-index: 500;
      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
      display: none;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #374151;
      font-size: 13px;
      font-weight: 500;
    }
    
    .custom-marker-depart {
      background: #10B981;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    }
    
    .custom-marker-arrivee {
      background: #EF4444;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    }
    
    .marker-inner {
      transform: rotate(45deg);
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
    }
    
    .popup-content {
      text-align: center;
      padding: 4px 0;
    }
    
    .popup-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 2px;
    }
    
    .popup-city {
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading-container">
    <div class="loading-spinner"></div>
    <div class="loading-text">Chargement de la carte...</div>
  </div>
  
  <div id="error" class="error-container" style="display: none;">
    <div class="error-text"></div>
  </div>
  
  <div id="info-bar" class="info-bar">
    <div class="info-item">
      <span>📍</span>
      <span id="distance">--</span>
    </div>
    <div class="info-item">
      <span>🚌</span>
      <span id="duration">--</span>
    </div>
  </div>
  
  <div id="map"></div>

  <script>
    const DEPART = "${depart}";
    const ARRIVEE = "${arrivee}";
    
    // Custom icons
    function createIcon(isDepart) {
      return L.divIcon({
        className: 'custom-marker',
        html: '<div class="' + (isDepart ? 'custom-marker-depart' : 'custom-marker-arrivee') + '"><span class="marker-inner">●</span></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
      });
    }
    
    // Geocode a city using Nominatim
    async function geocodeCity(cityName) {
      try {
        const searchQuery = cityName + ', Benin';
        const response = await fetch(
          'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(searchQuery) + '&limit=1',
          { headers: { 'User-Agent': 'BusBenin-Mobile/1.0' } }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
        
        // Fallback without Benin
        const fallback = await fetch(
          'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(cityName) + '&limit=1',
          { headers: { 'User-Agent': 'BusBenin-Mobile/1.0' } }
        );
        const fallbackData = await fallback.json();
        
        if (fallbackData && fallbackData.length > 0) {
          return { lat: parseFloat(fallbackData[0].lat), lon: parseFloat(fallbackData[0].lon) };
        }
        
        return null;
      } catch (error) {
        console.error('Geocoding error:', error);
        return null;
      }
    }
    
    // Get route from OSRM
    async function getRoute(start, end) {
      try {
        const response = await fetch(
          'https://router.project-osrm.org/route/v1/driving/' + start.lon + ',' + start.lat + ';' + end.lon + ',' + end.lat + '?overview=full&geometries=geojson'
        );
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
            distance: route.distance,
            duration: route.duration
          };
        }
        return null;
      } catch (error) {
        console.error('Routing error:', error);
        return null;
      }
    }
    
    // Format distance
    function formatDistance(meters) {
      if (meters >= 1000) {
        return (meters / 1000).toFixed(1) + ' km';
      }
      return Math.round(meters) + ' m';
    }
    
    // Format duration
    function formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return hours + 'h ' + minutes + 'min';
      }
      return minutes + ' min';
    }
    
    // Show error
    function showError(message) {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = 'flex';
      document.querySelector('.error-text').textContent = message;
    }
    
    // Initialize map
    async function initMap() {
      try {
        // Geocode cities
        const departCoords = await geocodeCity(DEPART);
        
        // Wait 1s between requests (Nominatim policy)
        await new Promise(r => setTimeout(r, 1000));
        
        const arriveeCoords = await geocodeCity(ARRIVEE);
        
        if (!departCoords) {
          showError('Impossible de localiser "' + DEPART + '"');
          return;
        }
        
        if (!arriveeCoords) {
          showError('Impossible de localiser "' + ARRIVEE + '"');
          return;
        }
        
        // Get route
        const routeData = await getRoute(departCoords, arriveeCoords);
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
        
        // Create map centered on Benin
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: true
        }).setView([9.3077, 2.3158], 7);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Add departure marker
        L.marker([departCoords.lat, departCoords.lon], { icon: createIcon(true) })
          .addTo(map)
          .bindPopup('<div class="popup-content"><div class="popup-title">🟢 Départ</div><div class="popup-city">' + DEPART + '</div></div>');
        
        // Add arrival marker
        L.marker([arriveeCoords.lat, arriveeCoords.lon], { icon: createIcon(false) })
          .addTo(map)
          .bindPopup('<div class="popup-content"><div class="popup-title">🔴 Arrivée</div><div class="popup-city">' + ARRIVEE + '</div></div>');
        
        // Add route polyline
        if (routeData && routeData.coordinates) {
          L.polyline(routeData.coordinates, {
            color: '#6366F1',
            weight: 5,
            opacity: 0.8
          }).addTo(map);
          
          // Show info bar
          document.getElementById('info-bar').style.display = 'flex';
          document.getElementById('distance').textContent = formatDistance(routeData.distance);
          document.getElementById('duration').textContent = '~' + formatDuration(routeData.duration);
          
          // Send info to React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeInfo',
              distance: routeData.distance,
              duration: routeData.duration
            }));
          }
        }
        
        // Fit bounds
        const bounds = L.latLngBounds(
          [departCoords.lat, departCoords.lon],
          [arriveeCoords.lat, arriveeCoords.lon]
        );
        map.fitBounds(bounds, { padding: [30, 30] });
        
      } catch (error) {
        console.error('Map init error:', error);
        showError('Erreur lors du chargement de la carte');
      }
    }
    
    // Start initialization
    initMap();
  </script>
</body>
</html>
  `;
};

// Format duration to human readable
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};

// Format distance to human readable
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

export default function RouteMap({ depart, arrivee }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  const htmlContent = generateMapHTML(depart, arrivee);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "routeInfo") {
        setRouteInfo({
          distance: data.distance,
          duration: data.duration,
        });
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Route Info Header */}
      {/* {routeInfo && (
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Navigation size={14} color="#6366F1" />
            <Text style={styles.infoText}>
              {formatDistance(routeInfo.distance)}
            </Text>
          </View>
          <Text style={styles.infoDivider}>•</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoEmoji}>🚌</Text>
            <Text style={styles.infoText}>
              ~{formatDuration(routeInfo.duration)}
            </Text>
          </View>
        </View>
      )} */}

      {/* Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotDepart]} />
          <Text style={styles.legendText}>{depart}</Text>
        </View>
        <Text style={styles.legendArrow}>→</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotArrivee]} />
          <Text style={styles.legendText}>{arrivee}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(99, 102, 241, 0.15)",
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  infoEmoji: {
    fontSize: 14,
  },
  infoDivider: {
    color: "#9CA3AF",
    fontWeight: "600",
  },
  mapContainer: {
    height: 280,
    width: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotDepart: {
    backgroundColor: "#10B981",
  },
  legendDotArrivee: {
    backgroundColor: "#EF4444",
  },
  legendText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  legendArrow: {
    color: "#9CA3AF",
    fontWeight: "bold",
  },
});
