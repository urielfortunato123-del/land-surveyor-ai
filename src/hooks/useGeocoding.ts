import { useState, useCallback } from 'react';

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export const useGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodingResult | null> => {
    if (!address.trim()) {
      setError('Endereço não fornecido');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Nominatim (OpenStreetMap) for geocoding - free and no API key required
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'GeoMatricula/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro na geocodificação');
      }

      const data = await response.json();

      if (data.length === 0) {
        setError('Endereço não encontrado');
        return null;
      }

      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name
      };
    } catch (err) {
      setError('Erro ao buscar localização');
      console.error('Geocoding error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { geocodeAddress, isLoading, error };
};
