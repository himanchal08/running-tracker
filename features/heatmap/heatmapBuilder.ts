import type { HeatmapPoint } from '../../db/queries/points';

export interface ActivityRoute {
  activityId: string;
  coordinates: [number, number][];
}

export function buildActivityRoutes(
  allPoints: HeatmapPoint[],
  keepEveryN = 3,
): ActivityRoute[] {
  const routeMap = new Map<string, [number, number][]>();

  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i];
    const existing = routeMap.get(p.activityId);
    if (!existing) {
      routeMap.set(p.activityId, [[p.lon, p.lat]]);
    } else {
      if (existing.length === 1 || (existing.length - 1) % keepEveryN === 0) {
        existing.push([p.lon, p.lat]);
      }
    }
  }

  const routes: ActivityRoute[] = [];
  for (const [activityId, coordinates] of routeMap.entries()) {
    if (coordinates.length >= 2) {
      routes.push({ activityId, coordinates });
    }
  }
  return routes;
}

export function routesToGeoJSON(routes: ActivityRoute[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features: routes.map((r) => ({
      type: 'Feature',
      id: r.activityId,
      geometry: {
        type: 'LineString',
        coordinates: r.coordinates,
      },
      properties: {
        activityId: r.activityId,
      },
    })),
  };
}
