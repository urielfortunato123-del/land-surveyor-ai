import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Layers, Satellite, Map as MapIcon, Grid3X3 } from 'lucide-react';

export type MapStyle = 'satellite' | 'streets' | 'hybrid';

interface MapboxMapProps {
  accessToken: string;
  coordinates: [number, number][];
  segments: {
    index: number;
    name?: string;
    distance: number;
    bearing: string;
    color?: string;
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
  }[];
  center?: [number, number];
  zoom?: number;
  showLabels?: boolean;
  onMapReady?: (map: mapboxgl.Map) => void;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  accessToken,
  coordinates,
  segments,
  center,
  zoom = 16,
  showLabels = true,
  onMapReady,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');
  const [isLoaded, setIsLoaded] = useState(false);

  const styles: Record<MapStyle, string> = {
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    streets: 'mapbox://styles/mapbox/streets-v12',
    hybrid: 'mapbox://styles/mapbox/satellite-streets-v12',
  };

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    const mapCenter = center || (coordinates.length > 0 
      ? [
          coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length,
          coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length,
        ] as [number, number]
      : [-46.6333, -23.5505] as [number, number]);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: styles[mapStyle],
      center: mapCenter,
      zoom: zoom,
      pitch: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.current.on('load', () => {
      setIsLoaded(true);
      addPolygonLayer();
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setStyle(styles[mapStyle]);
      map.current.once('style.load', () => {
        addPolygonLayer();
      });
    }
  }, [mapStyle]);

  const addPolygonLayer = () => {
    if (!map.current || coordinates.length < 3) return;

    // Remove existing layers
    ['polygon-fill', 'polygon-outline', 'polygon-vertices', 'segment-labels'].forEach(id => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
    });
    ['polygon-source', 'vertices-source', 'labels-source'].forEach(id => {
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    // Add polygon
    const polygonCoords = [...coordinates];
    if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
        polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
      polygonCoords.push(polygonCoords[0]);
    }

    map.current.addSource('polygon-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
      },
    });

    map.current.addLayer({
      id: 'polygon-fill',
      type: 'fill',
      source: 'polygon-source',
      paint: {
        'fill-color': '#00B4A6',
        'fill-opacity': 0.2,
      },
    });

    map.current.addLayer({
      id: 'polygon-outline',
      type: 'line',
      source: 'polygon-source',
      paint: {
        'line-color': '#00B4A6',
        'line-width': 3,
      },
    });

    // Add vertices
    const vertexFeatures = coordinates.slice(0, -1).map((coord, i) => ({
      type: 'Feature' as const,
      properties: { 
        index: i + 1,
        name: segments[i]?.name || `P${i + 1}`,
        distance: segments[i]?.distance || 0,
        bearing: segments[i]?.bearing || '',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: coord,
      },
    }));

    map.current.addSource('vertices-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: vertexFeatures,
      },
    });

    map.current.addLayer({
      id: 'polygon-vertices',
      type: 'circle',
      source: 'vertices-source',
      paint: {
        'circle-radius': 8,
        'circle-color': '#1a365d',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    if (showLabels) {
      map.current.addLayer({
        id: 'segment-labels',
        type: 'symbol',
        source: 'vertices-source',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1a365d',
          'text-halo-width': 2,
        },
      });
    }
  };

  useEffect(() => {
    if (isLoaded) {
      addPolygonLayer();
    }
  }, [coordinates, segments, showLabels, isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {/* Layer Selector */}
      <div className="absolute top-4 left-4 z-10">
        <div className="glass-card rounded-lg p-1 flex gap-1">
          <Button
            variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapStyle('satellite')}
            className="gap-1"
          >
            <Satellite className="w-4 h-4" />
            <span className="hidden sm:inline">Satélite</span>
          </Button>
          <Button
            variant={mapStyle === 'streets' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapStyle('streets')}
            className="gap-1"
          >
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Mapa</span>
          </Button>
          <Button
            variant={mapStyle === 'hybrid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapStyle('hybrid')}
            className="gap-1"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Híbrido</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MapboxMap;
