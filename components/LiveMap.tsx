import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';

MapLibreGL.setAccessToken(null);

interface Props {
  routePoints: [number, number][];
  lineColor?: string;
  liveMode?: boolean;
}

export function LiveMap({ routePoints, lineColor = '#fc4c02', liveMode = false }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const routeLine = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: routePoints,
        },
      },
    ],
  };

  useEffect(() => {
    if (liveMode || !mapReady || routePoints.length < 2 || !cameraRef.current) return;

    const lons = routePoints.map((p) => p[0]);
    const lats = routePoints.map((p) => p[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Add padding
    const padLon = (maxLon - minLon) * 0.15 || 0.005;
    const padLat = (maxLat - minLat) * 0.15 || 0.005;

    cameraRef.current.fitBounds(
      [minLon - padLon, minLat - padLat],
      [maxLon + padLon, maxLat + padLat],
      50,
      300,
    );
  }, [mapReady, routePoints, liveMode]);

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        {liveMode ? (
          <>
            <MapLibreGL.Camera
              ref={cameraRef}
              followUserLocation={true}
              followZoomLevel={16}
              followUserMode={MapLibreGL.UserTrackingMode.Follow}
            />
            <MapLibreGL.UserLocation visible={true} showsUserHeadingIndicator={false} />
          </>
        ) : (
          <MapLibreGL.Camera
            ref={cameraRef}
            zoomLevel={routePoints.length >= 2 ? 13 : 12}
            centerCoordinate={
              routePoints.length > 0
                ? routePoints[Math.floor(routePoints.length / 2)]
                : [0, 0]
            }
            animationDuration={0}
          />
        )}

        {routePoints.length >= 2 && (
          <MapLibreGL.ShapeSource id="routeSource" shape={routeLine as any}>
            <MapLibreGL.LineLayer
              id="routeLayer"
              style={{
                lineColor: lineColor,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Start dot */}
        {routePoints.length >= 1 && (
          <MapLibreGL.ShapeSource
            id="startDot"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: routePoints[0] },
            }}
          >
            <MapLibreGL.CircleLayer
              id="startCircle"
              style={{ circleRadius: 7, circleColor: '#3fb950', circleStrokeWidth: 2, circleStrokeColor: '#fff' }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* End dot */}
        {routePoints.length >= 2 && (
          <MapLibreGL.ShapeSource
            id="endDot"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: routePoints[routePoints.length - 1] },
            }}
          >
            <MapLibreGL.CircleLayer
              id="endCircle"
              style={{ circleRadius: 7, circleColor: '#f85149', circleStrokeWidth: 2, circleStrokeColor: '#fff' }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* No-route placeholder */}
      {routePoints.length < 2 && !liveMode && (
        <View style={styles.noRouteOverlay}>
          <Text style={styles.noRouteText}>No route recorded</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0d1117',
  },
  map: {
    flex: 1,
  },
  noRouteOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,17,23,0.7)',
  },
  noRouteText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '500',
  },
});
