import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { getDb } from '../db/client';
import { getAllPointsForHeatmap } from '../db/queries/points';
import { buildActivityRoutes, routesToGeoJSON } from '../features/heatmap/heatmapBuilder';
import type { Activity } from '../db/schema';

MapLibreGL.setAccessToken(null);

const GH = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceElevated: '#1c2128',
  border: '#30363d',
  text: '#c9d1d9',
  muted: '#8b949e',
  green: '#2ea043',
  greenBright: '#3fb950',
};

type ActivityTypeFilter = Activity['type'] | 'all';
type TimeRangeFilter = '30d' | '6m' | 'all';

const TYPE_FILTERS: { label: string; value: ActivityTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '🏃 Run', value: 'running' },
  { label: '🚶 Walk', value: 'walking' },
  { label: '🚴 Cycle', value: 'cycling' },
  { label: '🥾 Hike', value: 'hiking' },
];

const TIME_FILTERS: { label: string; value: TimeRangeFilter }[] = [
  { label: '30 days', value: '30d' },
  { label: '6 months', value: '6m' },
  { label: 'All-time', value: 'all' },
];

function getCutoffDate(range: TimeRangeFilter): Date | undefined {
  if (range === 'all') return undefined;
  const now = new Date();
  if (range === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (range === '6m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d;
  }
  return undefined;
}

export function RouteHeatmapMap() {
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [routeCount, setRouteCount] = useState(0);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(null);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const rawPoints = await getAllPointsForHeatmap(db, {
        activityType: typeFilter,
        cutoffDate: getCutoffDate(timeFilter),
      });
      const routes = buildActivityRoutes(rawPoints);
      setRouteCount(routes.length);
      setGeoJson(routesToGeoJSON(routes));
    } catch (err) {
      console.error('[RouteHeatmapMap] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, timeFilter]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, typeFilter === f.value && styles.filterChipActive]}
              onPress={() => setTypeFilter(f.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: typeFilter === f.value }}
            >
              <Text style={[styles.filterChipText, typeFilter === f.value && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {TIME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, timeFilter === f.value && styles.filterChipActive]}
              onPress={() => setTimeFilter(f.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: timeFilter === f.value }}
            >
              <Text style={[styles.filterChipText, timeFilter === f.value && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={styles.map}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          compassEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              zoomLevel: 10,
            }}
          />

          {geoJson && geoJson.features.length > 0 && (
            <MapLibreGL.ShapeSource
              id="routes-source"
              shape={geoJson}
              tolerance={1}
            >
              <MapLibreGL.LineLayer
                id="routes-glow"
                style={{
                  lineColor: '#3fb950',
                  lineWidth: 4,
                  lineOpacity: 0.12,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <MapLibreGL.LineLayer
                id="routes-line"
                style={{
                  lineColor: '#3fb950',
                  lineWidth: 1.5,
                  lineOpacity: 0.55,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}
        </MapLibreGL.MapView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GH.greenBright} />
            <Text style={styles.loadingText}>Loading routes…</Text>
          </View>
        )}

        {!loading && routeCount === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No routes yet</Text>
            <Text style={styles.emptySubtitle}>
              Record an activity to see your tracks here.
            </Text>
          </View>
        )}

        {!loading && routeCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{routeCount} routes</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GH.bg,
  },
  filterBar: {
    backgroundColor: GH.surface,
    borderBottomWidth: 1,
    borderBottomColor: GH.border,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GH.border,
    backgroundColor: GH.bg,
  },
  filterChipActive: {
    backgroundColor: GH.green,
    borderColor: GH.greenBright,
  },
  filterChipText: { fontSize: 12, color: GH.muted, fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff' },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: GH.border,
    marginHorizontal: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,17,23,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: GH.muted,
    fontWeight: '500',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,17,23,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GH.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: GH.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  countBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(22,27,34,0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GH.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GH.greenBright,
  },
});
