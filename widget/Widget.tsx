import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function MovementWidget({ streak = 0 }: { streak?: number }) {
  return (
    <FlexWidget
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
        }}
      />
    </FlexWidget>
  );
}
