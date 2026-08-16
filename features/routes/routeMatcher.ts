import type { Point } from '../../db/schema';

export interface Endpoint {
  lat: number;
  lon: number;
}

export interface RouteEndpoints {
  start: Endpoint;
  end: Endpoint;
}

export function haversineM(a: Endpoint, b: Endpoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function extractEndpoints(points: Pick<Point, 'lat' | 'lon' | 'isFilteredOutlier'>[]): RouteEndpoints | null {
  const valid = points.filter((p) => !p.isFilteredOutlier);
  if (valid.length < 2) return null;
  return {
    start: { lat: valid[0].lat, lon: valid[0].lon },
    end: { lat: valid[valid.length - 1].lat, lon: valid[valid.length - 1].lon },
  };
}

export function buildCanonicalPolyline(
  points: Pick<Point, 'lat' | 'lon' | 'isFilteredOutlier'>[],
  maxPoints = 100,
): string {
  const valid = points.filter((p) => !p.isFilteredOutlier);
  if (valid.length === 0) return '';

  const step = Math.max(1, Math.floor(valid.length / maxPoints));
  const sampled: typeof valid = [];
  for (let i = 0; i < valid.length; i += step) {
    sampled.push(valid[i]);
  }
  if (sampled[sampled.length - 1] !== valid[valid.length - 1]) {
    sampled.push(valid[valid.length - 1]);
  }

  return sampled.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join(';');
}

export interface RouteCandidate {
  id: string;
  canonicalPolyline: string;
}

export function matchRoute(
  endpoints: RouteEndpoints,
  candidates: RouteCandidate[],
  thresholdM = 150,
): string | null {
  for (const candidate of candidates) {
    const parts = candidate.canonicalPolyline.split(';');
    if (parts.length < 2) continue;

    const [candidateStartLat, candidateStartLon] = parts[0].split(',').map(Number);
    const [candidateEndLat, candidateEndLon] = parts[parts.length - 1].split(',').map(Number);

    const candidateStart: Endpoint = { lat: candidateStartLat, lon: candidateStartLon };
    const candidateEnd: Endpoint = { lat: candidateEndLat, lon: candidateEndLon };

    const startDist = haversineM(endpoints.start, candidateStart);
    const endDist = haversineM(endpoints.end, candidateEnd);

    if (startDist <= thresholdM && endDist <= thresholdM) {
      return candidate.id;
    }
  }
  return null;
}
