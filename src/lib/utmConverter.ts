/**
 * UTM to Lat/Lng converter
 * Based on the formulas from the U.S. Geological Survey
 */

interface UTMCoordinates {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

interface LatLng {
  lat: number;
  lng: number;
}

// WGS84 ellipsoid constants
const a = 6378137; // Semi-major axis
const e = 0.081819191; // First eccentricity
const e1sq = 0.006739497; // e'^2
const k0 = 0.9996; // Scale factor

/**
 * Convert UTM coordinates to latitude/longitude
 */
export function utmToLatLng(utm: UTMCoordinates): LatLng {
  const { easting, northing, zone, hemisphere } = utm;
  
  // Remove false easting and northing
  const x = easting - 500000;
  const y = hemisphere === 'S' ? northing - 10000000 : northing;
  
  // Calculate the meridian
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  
  // Calculate footprint latitude
  const M = y / k0;
  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));
  
  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
  
  const phi1 = mu + 
    (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
    (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
    (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu);
  
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(phi1), 2));
  const T1 = Math.pow(Math.tan(phi1), 2);
  const C1 = e1sq * Math.pow(Math.cos(phi1), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2) * Math.pow(Math.sin(phi1), 2), 1.5);
  const D = x / (N1 * k0);
  
  // Calculate latitude
  let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
    Math.pow(D, 2) / 2 - 
    (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) * Math.pow(D, 4) / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e1sq - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
  );
  
  // Calculate longitude
  let lng = lonOrigin + (
    D - 
    (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e1sq + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120
  ) / Math.cos(phi1);
  
  // Convert to degrees
  lat = lat * (180 / Math.PI);
  lng = lng * (180 / Math.PI);
  
  return { lat, lng };
}

/**
 * Infer UTM zone from longitude
 */
export function getUTMZoneFromLng(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

/**
 * Infer UTM zone from Brazilian state
 */
export function getUTMZoneFromState(state: string): number {
  const stateZones: Record<string, number> = {
    // Zone 18
    'AC': 18,
    // Zone 19
    'AM': 20, // Amazonas spans multiple zones, default to 20
    // Zone 20
    'RR': 20,
    // Zone 21
    'RO': 21,
    'PA': 22, // Pará spans multiple zones
    'AP': 22,
    // Zone 22
    'MT': 21, // Mato Grosso spans 21-22
    'TO': 22,
    'MA': 23,
    // Zone 23
    'PI': 23,
    'CE': 24,
    'RN': 25,
    'PB': 25,
    'PE': 25,
    'AL': 25,
    'SE': 24,
    'BA': 24,
    'GO': 22,
    'DF': 23,
    'MG': 23,
    'MS': 21,
    // Zone 23 (São Paulo and surroundings)
    'SP': 23,
    'RJ': 23,
    'ES': 24,
    'PR': 22,
    'SC': 22,
    'RS': 22,
  };
  
  return stateZones[state.toUpperCase()] || 23; // Default to zone 23 (most of Southeast Brazil)
}

/**
 * Convert UTM coordinates from extracted data to lat/lng
 */
export function convertExtractedUTMToLatLng(
  utmData: { zone?: number | null; hemisphere?: 'N' | 'S'; firstVertex?: { n: number; e: number } | null } | null,
  fallbackState?: string
): LatLng | null {
  if (!utmData?.firstVertex) {
    console.log('UTM: No firstVertex data');
    return null;
  }
  
  const { n, e } = utmData.firstVertex;
  
  // Validate UTM coordinates are reasonable for Brazil
  // Easting should be between 100,000 and 900,000
  // Northing in Southern Hemisphere should be between 7,000,000 and 10,000,000
  if (e < 100000 || e > 900000 || n < 1000000 || n > 10000000) {
    console.log('UTM: Invalid coordinates range', { e, n });
    return null;
  }
  
  const zone = utmData.zone || (fallbackState ? getUTMZoneFromState(fallbackState) : 23);
  const hemisphere = utmData.hemisphere || 'S'; // Brazil is in the Southern Hemisphere
  
  console.log('UTM: Converting', { e, n, zone, hemisphere });
  
  const result = utmToLatLng({
    easting: e,
    northing: n,
    zone,
    hemisphere,
  });
  
  // Validate result is within Brazil bounds approximately
  // Lat: -33.75 to 5.27, Lng: -73.99 to -28.84
  if (result.lat < -35 || result.lat > 6 || result.lng < -75 || result.lng > -28) {
    console.log('UTM: Result outside Brazil bounds', result);
    return null;
  }
  
  console.log('UTM: Conversion result', result);
  return result;
}
