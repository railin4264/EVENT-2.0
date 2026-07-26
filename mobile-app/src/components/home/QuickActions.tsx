import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface QuickActionsProps {
  onActionPress: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionPress }) => {
  const handlePress = async (action: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onActionPress(action);
  };

  const actions = [
    { id: 'create', label: 'Crear Evento', icon: 'flash-outline' as const, bg: '#EEF2FF', iconBg: '#6366F1' },
    { id: 'search', label: 'Buscar', icon: 'search-outline' as const, bg: '#ECFDF5', iconBg: '#10B981' },
    { id: 'explore', label: 'Explorar', icon: 'compass-outline' as const, bg: '#FEF3C7', iconBg: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.quickAction, { backgroundColor: action.bg }]}
          onPress={() => handlePress(action.id)}
          activeOpacity={0.8}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: action.iconBg }]}>
            <Ionicons name={action.icon} size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 8,
    minWidth: 90,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
