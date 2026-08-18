import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { Activity } from '../db/schema';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(date: Date): string {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MovementWidget({ streak = 0, lastActivity }: { streak?: number, lastActivity?: Activity | null }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'movement-tracker://goals?showStreak=true' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#161b22',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={streak > 0 ? '🔥' : '🧊'}
        style={{ fontSize: 32 }}
      />
      <TextWidget
        text={`${streak} Day Streak`}
        style={{
          fontSize: 18,
          color: '#ffffff',
          fontWeight: 'bold',
          marginTop: 8,
        }}
      />
      <TextWidget
        text={streak > 0 ? "You're on fire!" : "Run to keep it alive!"}
        style={{
          fontSize: 14,
          color: '#8b949e',
          marginTop: 4,
          marginBottom: lastActivity ? 16 : 0,
        }}
      />
      
      {lastActivity && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: 'match_parent',
            backgroundColor: '#21262d',
            padding: 12,
            borderRadius: 12,
          }}
        >
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget text="Last Activity" style={{ fontSize: 12, color: '#8b949e' }} />
            <TextWidget text={formatDate(lastActivity.startedAt)} style={{ fontSize: 14, color: '#ffffff', fontWeight: 'bold', marginTop: 2 }} />
          </FlexWidget>
          
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <TextWidget 
              text={`${(lastActivity.distanceM / 1000).toFixed(2)} km`} 
              style={{ fontSize: 16, color: '#3fb950', fontWeight: 'bold' }} 
            />
            <TextWidget 
              text={formatDuration(lastActivity.movingTimeS)} 
              style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }} 
            />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
