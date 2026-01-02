import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapLayer = 'standard' | 'satellite' | 'terrain';

interface OSMMapProps {
  coordinates: [number, number][];
  segments?: {
    index: number;
    name?: string;
    distance: number;
    bearing: string;
  }[];
  center?: [number, number];
  zoom?: number;
  showLabels?: boolean;
  markerOnly?: boolean;
}

const layerConfigs: Record<MapLayer, { url: string; attribution: string; maxZoom: number }> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};

const OSMMap: React.FC<OSMMapProps> = ({
  coordinates,
  segments = [],
  center,
  zoom = 16,
  showLabels = true,
  markerOnly = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('standard');

  // Handle layer change without recreating map
  const changeLayer = (layer: MapLayer) => {
    if (!mapInstance.current) return;
    
    // Remove current tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    
    // Add new tile layer
    const config = layerConfigs[layer];
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(mapInstance.current);
    
    setActiveLayer(layer);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Clean up existing map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Calculate center
    const mapCenter = center || (coordinates.length > 0
      ? [
          coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length,
          coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length,
        ] as [number, number]
      : [-23.5505, -46.6333] as [number, number]);

    // Initialize map
    mapInstance.current = L.map(mapContainer.current, {
      center: mapCenter,
      zoom: zoom,
      zoomControl: true,
    });

    // Add initial tile layer
    const config = layerConfigs[activeLayer];
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(mapInstance.current);

    // If markerOnly, just add a marker at center
    if (markerOnly && center) {
      L.circleMarker(center, {
        radius: 12,
        color: '#00B4A6',
        fillColor: '#00B4A6',
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(mapInstance.current);
      
      return () => {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }

    // Add polygon if coordinates exist
    if (coordinates.length >= 3) {
      const polygonCoords = [...coordinates];
      
      // Ensure polygon is closed
      if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
          polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
        polygonCoords.push(polygonCoords[0]);
      }

      // Add polygon with better visibility for satellite
      L.polygon(polygonCoords, {
        color: '#FFD700',
        fillColor: '#00B4A6',
        fillOpacity: 0.25,
        weight: 3,
      }).addTo(mapInstance.current);

      // Add vertex markers
      if (showLabels) {
        coordinates.slice(0, -1).forEach((coord, i) => {
          const marker = L.circleMarker(coord, {
            radius: 8,
            color: '#FFD700',
            fillColor: '#1a365d',
            fillOpacity: 1,
            weight: 2,
          }).addTo(mapInstance.current!);

          // Add tooltip with point name
          const name = segments[i]?.name || `P${i + 1}`;
          marker.bindTooltip(name, {
            permanent: true,
            direction: 'top',
            offset: [0, -10],
            className: 'osm-tooltip',
          });

          // Add popup with details
          if (segments[i]) {
            marker.bindPopup(`
              <div style="font-size: 12px;">
                <strong>Ponto ${i + 1}</strong><br/>
                <span style="color: #666;">Rumo:</span> ${segments[i].bearing}<br/>
                <span style="color: #666;">Dist:</span> ${segments[i].distance}m
              </div>
            `);
          }
        });
      }

      // Fit bounds to polygon
      const bounds = L.latLngBounds(coordinates);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [coordinates, segments, center, zoom, showLabels, markerOnly]);

  return (
    <>
      <style>{`
        .osm-tooltip {
          background: #1a365d;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          font-size: 11px;
          padding: 4px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .osm-tooltip::before {
          border-top-color: #1a365d !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .layer-control {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          display: flex;
          gap: 4px;
          background: white;
          padding: 4px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .layer-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #666;
        }
        .layer-btn:hover {
          background: #f0f0f0;
        }
        .layer-btn.active {
          background: #1a365d;
          color: white;
        }
      `}</style>
      <div className="relative w-full h-full">
        <div className="layer-control">
          <button
            className={`layer-btn ${activeLayer === 'standard' ? 'active' : ''}`}
            onClick={() => changeLayer('standard')}
          >
            Mapa
          </button>
          <button
            className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => changeLayer('satellite')}
          >
            Satélite
          </button>
          <button
            className={`layer-btn ${activeLayer === 'terrain' ? 'active' : ''}`}
            onClick={() => changeLayer('terrain')}
          >
            Terreno
          </button>
        </div>
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </>
  );
};

export default OSMMap;
