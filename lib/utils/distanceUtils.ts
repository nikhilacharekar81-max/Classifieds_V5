export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface PopularArea {
  city: string;
  area: string;
  latitude: number;
  longitude: number;
}

export const POPULAR_INDIAN_AREAS: PopularArea[] = [
  { city: 'Mumbai', area: 'Bandra West', latitude: 19.0596, longitude: 72.8295 },
  { city: 'Mumbai', area: 'Andheri East', latitude: 19.1136, longitude: 72.8697 },
  { city: 'Mumbai', area: 'Colaba', latitude: 18.9067, longitude: 72.8147 },
  { city: 'Delhi', area: 'Connaught Place', latitude: 28.6280, longitude: 77.2090 },
  { city: 'Delhi', area: 'Saket', latitude: 28.5244, longitude: 77.2154 },
  { city: 'Bangalore', area: 'Indiranagar', latitude: 12.9716, longitude: 77.6412 },
  { city: 'Bangalore', area: 'Koramangala', latitude: 12.9352, longitude: 77.6245 },
  { city: 'Pune', area: 'Koregaon Park', latitude: 18.5362, longitude: 73.8940 },
  { city: 'Hyderabad', area: 'Banjara Hills', latitude: 17.4156, longitude: 78.4347 },
  { city: 'Chennai', area: 'T. Nagar', latitude: 13.0418, longitude: 80.2341 },
];
