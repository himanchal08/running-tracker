import { StyleSheet, View } from 'react-native';
import { useState, useEffect } from 'react';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useRecordingStore } from '../store/recordingStore';

MapLibreGL.setAccessToken(null);

interface Props {
  routePoints: [number, number][]; 
  lineColor?: string;
}

export function LiveMap({ routePoints, lineColor = '#fc4c02' }: Props) {
  const status = useRecordingStore((s) => s.status);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkPerm = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (mounted) setHasPermission(status === 'granted');
      } catch (err) {
        // ignore
      }
    };
    checkPerm();
    return () => {
      mounted = false;
    };
  }, []);

  const shouldFollowUser = hasPermission || status === 'recording';
  const routeLine = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routePoints,
        },
      },
    ],
  };

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >
        {shouldFollowUser ? (
          <>
            <MapLibreGL.Camera
              followUserLocation={true}
              followZoomLevel={16}
              followUserMode={MapLibreGL.UserTrackingMode.FollowWithCourse}
            />
            <MapLibreGL.UserLocation 
              visible={true} 
              showsUserHeadingIndicator={true}
            />
          </>
        ) : (
          <MapLibreGL.Camera
            zoomLevel={2}
            centerCoordinate={[-98.5795, 39.8283]} 
          />
        )}

        {routePoints.length > 1 && (
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
      </MapLibreGL.MapView>
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
});
