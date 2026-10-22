import React, { useCallback, forwardRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';

interface ActionBottomSheetProps {
  title?: string;
  children: React.ReactNode;
  snapPoints?: string[];
  onClose?: () => void;
}

export const ActionBottomSheet = forwardRef<BottomSheet, ActionBottomSheetProps>(
  ({ title, children, snapPoints = ['25%', '50%'], onClose }, ref) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const palette = discoveryAppearance(isDark);
    
    // Callbacks
    const handleSheetChanges = useCallback((index: number) => {
      if (index === -1 && onClose) {
        onClose();
      }
    }, [onClose]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.background, { backgroundColor: palette.elevated }]}
        handleIndicatorStyle={[styles.indicator, { backgroundColor: palette.muted }]}
      >
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          {title && <Text style={[styles.title, { color: palette.text }]}>{title}</Text>}
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

ActionBottomSheet.displayName = 'ActionBottomSheet';

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
});
