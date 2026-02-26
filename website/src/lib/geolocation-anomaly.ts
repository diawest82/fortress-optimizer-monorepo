// Geolocation Anomaly Detection
// Detects unusual login locations based on geographic distance and time

export interface LoginLocation {
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  timestamp: Date;
}

// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isAnomalousLocation(
  currentLocation: LoginLocation,
  previousLocations: LoginLocation[]
): boolean {
  if (previousLocations.length === 0) return false;

  // Get the most recent login
  const lastLocation = previousLocations[previousLocations.length - 1];

  // Calculate time difference in hours
  const timeDiffHours =
    (currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime()) / (1000 * 60 * 60);

  // Calculate distance in km
  const distance = calculateDistance(
    lastLocation.latitude,
    lastLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  // Maximum speed humans can travel (km/h) - use 900 km/h for plane speed
  const maxSpeed = 900;
  const maxPossibleDistance = timeDiffHours * maxSpeed;

  // If distance is impossible given travel time, it's anomalous
  if (distance > maxPossibleDistance && timeDiffHours > 0) {
    return true;
  }

  // If same country but very different city, might still be anomalous
  if (
    lastLocation.country === currentLocation.country &&
    distance > 1000 &&
    timeDiffHours < 6
  ) {
    return true;
  }

  return false;
}

export function getAnomalyReason(
  currentLocation: LoginLocation,
  previousLocations: LoginLocation[]
): string | null {
  if (previousLocations.length === 0) return null;

  const lastLocation = previousLocations[previousLocations.length - 1];
  const timeDiffHours =
    (currentLocation.timestamp.getTime() - lastLocation.timestamp.getTime()) / (1000 * 60 * 60);
  const distance = calculateDistance(
    lastLocation.latitude,
    lastLocation.longitude,
    currentLocation.latitude,
    currentLocation.longitude
  );

  if (distance > timeDiffHours * 900) {
    return `Impossible travel: ${distance.toFixed(0)}km in ${timeDiffHours.toFixed(1)} hours`;
  }

  if (
    lastLocation.country !== currentLocation.country &&
    timeDiffHours < 12
  ) {
    return `International travel in ${timeDiffHours.toFixed(1)} hours`;
  }

  return null;
}
