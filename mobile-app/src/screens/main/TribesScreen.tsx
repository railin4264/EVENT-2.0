import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTribes } from '@/hooks/useTribes';
import tribesService, { Tribe, TRIBE_CATEGORIES } from '@/services/tribesService';
import TribeCard from '@/components/TribeCard';

export default function TribesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [joining, setJoining] = useState<string | null>(null);

  const {
    tribes,
    loading,
    error,
    pagination,
    loadMore,
    refresh,
  } = useTribes({
    category: selectedCategory,
    search: searchQuery,
    limit: 20,
  });

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCategorySelect = useCallback((category: string | undefined) => {
    setSelectedCategory(category);
  }, []);

  const handleTribePress = useCallback((tribe: Tribe) => {
    router.push('/tribe/' + tribe._id);
  }, [router]);

  const handleJoinTribe = useCallback(async (tribeId: string) => {
    try {
      setJoining(tribeId);
      const response = await tribesService.joinTribe(tribeId);
      
      if (response.success) {
        Alert.alert('¡Éxito!', response.message);
        refresh(); // Refresh the list to update membership status
      } else {
        Alert.alert('Error', 'No se pudo unir a la tribu');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al unirse a la tribu');
    } finally {
      setJoining(null);
    }
  }, [refresh]);

  const handleCreateTribe = useCallback(() => {
    router.push('/create-tribe');
  }, [router]);

  const renderTribeCard = useCallback(({ item }: { item: Tribe }) => (
    <TribeCard
      tribe={item}
      onPress={handleTribePress}
      onJoin={handleJoinTribe}
      compact={viewMode === 'list'}
    />
  ), [handleTribePress, handleJoinTribe, viewMode]);

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesContainer}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          { backgroundColor: !selectedCategory ? theme.colors.primary : theme.colors.surfaceVariant },
        ]}
        onPress={() => handleCategorySelect(undefined)}
      >
        <Text
          style={[
            styles.categoryChipText,
            { color: !selectedCategory ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
          ]}
        >
          Todas
        </Text>
      </TouchableOpacity>
      
      {TRIBE_CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.value}
          style={[
            styles.categoryChip,
            {
              backgroundColor: selectedCategory === category.value
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
            },
          ]}
          onPress={() => handleCategorySelect(category.value)}
        >
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
          <Text
            style={[
              styles.categoryChipText,
              {
                color: selectedCategory === category.value
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.onSurfaceVariant}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurfaceVariant }]}
          placeholder="Buscar tribus..."
          placeholderTextColor={theme.colors.outline}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'grid' && { backgroundColor: theme.colors.primaryContainer },
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === 'grid' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'list' && { backgroundColor: theme.colors.primaryContainer },
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'list' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateTribe}
        >
          <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
          <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>
            Crear
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Results Info */}
      <View style={styles.resultsInfo}>
        <Text style={[styles.resultsText, { color: theme.colors.onSurfaceVariant }]}>
          {tribes.length} tribu{tribes.length !== 1 ? 's' : ''} encontrada{tribes.length !== 1 ? 's' : ''}
        </Text>
        {selectedCategory && (
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => handleCategorySelect(undefined)}
          >
            <Text style={[styles.clearFilterText, { color: theme.colors.primary }]}>
              Limpiar filtros
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="people-outline"
        size={64}
        color={theme.colors.outline}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        {searchQuery || selectedCategory ? 'No se encontraron tribus' : 'No hay tribus disponibles'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery || selectedCategory
          ? 'Intenta cambiar los filtros de búsqueda'
          : '¡Sé el primero en crear una tribu!'}
      </Text>
      {!searchQuery && !selectedCategory && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateTribe}
        >
          <Text style={[styles.emptyButtonText, { color: theme.colors.onPrimary }]}>
            Crear Primera Tribu
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={theme.colors.error}
        style={styles.errorIcon}
      />
      <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
        Error al cargar tribus
      </Text>
      <Text style={[styles.errorSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        onPress={refresh}
      >
        <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
          Reintentar
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (error && tribes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {renderError()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={tribes}
        renderItem={renderTribeCard}
        keyExtractor={(item) => item._id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when changing view mode
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={tribes.length === 0 ? styles.emptyContainer : styles.listContainer}
        columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
        refreshControl={
          <RefreshControl
            refreshing={loading && tribes.length === 0}
            onRefresh={refresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && tribes.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchIcon: {
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingRight: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFilter: {
    padding: 4,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

























