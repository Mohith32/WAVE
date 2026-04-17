import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../utils/theme';

function SkeletonBox({ width, height, borderRadius = 8, style }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: theme.colors.surfaceMuted },
        style,
      ]}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <View style={s.container}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={s.row}>
          <SkeletonBox width={54} height={54} borderRadius={27} />
          <View style={s.rowContent}>
            <SkeletonBox width={140} height={14} borderRadius={7} style={{ marginBottom: 8 }} />
            <SkeletonBox width={200} height={11} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function GroupListSkeleton() {
  return (
    <View style={s.container}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={s.row}>
          <SkeletonBox width={54} height={54} borderRadius={27} />
          <View style={s.rowContent}>
            <SkeletonBox width={120} height={14} borderRadius={7} style={{ marginBottom: 8 }} />
            <SkeletonBox width={180} height={11} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowContent: { flex: 1, marginLeft: 14 },
});

export default memo(SkeletonBox);
