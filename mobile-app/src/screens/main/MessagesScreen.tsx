import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import chatService from '@/services/ChatService';
import type { Chat } from '@/types';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [conversations, setConversations] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getChats(1, 50);
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'No se pudieron cargar las conversaciones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchQuery.trim()) {
      filtered = filtered.filter(conversation => {
        const isGroup = conversation.type === 'group' || conversation.type === 'tribe';
        if (isGroup) {
          return conversation.participants.some(p =>
            p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
        } else {
          const other = conversation.participants.find(p =>
            p.id !== user?.id && p._id !== user?._id
          );
          return (
            other?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            other?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            other?.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
      });
    }

    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(c => c.unreadCount > 0);
        break;
      case 'groups':
        filtered = filtered.filter(c => c.type === 'group' || c.type === 'tribe');
        break;
      default:
        break;
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [conversations, searchQuery, activeFilter, user?.id, user?._id]);

  const getConversationTitle = (conversation: Chat) => {
    const isGroup = conversation.type === 'group' || conversation.type === 'tribe';
    if (isGroup) {
      return conversation.participants.map(p => p.firstName).join(', ') || 'Grupo';
    }
    const other = conversation.participants.find(p =>
      p.id !== user?.id && p._id !== user?._id
    );
    return other ? `${other.firstName} ${other.lastName}` : 'Usuario';
  };

  const getChatId = (conversation: Chat) => {
    return conversation.id || (conversation as any)._id || '';
  };

  const isGroup = (conversation: Chat) =>
    conversation.type === 'group' || conversation.type === 'tribe';

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const filters: { key: 'all' | 'unread' | 'groups'; label: string; icon: string }[] = [
    { key: 'all', label: 'Todos', icon: 'chatbubbles-outline' },
    { key: 'unread', label: 'No leidos', icon: 'ellipse' },
    { key: 'groups', label: 'Grupos', icon: 'people-outline' },
  ];

  const SkeletonItem = () => (
    <View style={styles.skeletonItem}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSub} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0C0B10' }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1a1825', '#0C0B10']}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Mensajes</Text>
            {totalUnread > 0 && (
              <View style={styles.totalUnreadBadge}>
                <Text style={styles.totalUnreadText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => router.push('/new-chat')}
          >
            <Ionicons name="create-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                activeFilter === f.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Ionicons
                name={f.icon as any}
                size={14}
                color={activeFilter === f.key ? '#ffffff' : '#3b82f6'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
              {f.key === 'unread' && conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {conversations.filter(c => c.unreadCount > 0).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <ScrollView style={{ flex: 1 }}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonItem key={i} />)}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Sin resultados' : 'No tienes conversaciones aun'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Prueba con otros terminos de busqueda'
                  : 'Inicia una conversacion para comenzar'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/new-chat')}
                >
                  <Text style={styles.emptyButtonText}>Iniciar chat</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredConversations.map(conversation => (
              <TouchableOpacity
                key={getChatId(conversation)}
                style={styles.conversationItem}
                onPress={() => router.push('/chat/' + getChatId(conversation))}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: isGroup(conversation) ? '#8b5cf6' : '#3b82f6' },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getConversationTitle(conversation).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {isGroup(conversation) && (
                    <View style={styles.groupBadge}>
                      <Ionicons name="people" size={10} color="#ffffff" />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.convContent}>
                  <View style={styles.convHeader}>
                    <Text
                      style={[
                        styles.convTitle,
                        conversation.unreadCount > 0 && styles.convTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {getConversationTitle(conversation)}
                    </Text>
                    {conversation.lastMessage && (
                      <Text style={styles.convTime}>
                        {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                          addSuffix: false,
                          locale: es,
                        })}
                      </Text>
                    )}
                  </View>

                  <View style={styles.convFooter}>
                    {conversation.lastMessage ? (
                      <Text
                        style={[
                          styles.lastMsg,
                          conversation.unreadCount > 0 && styles.lastMsgUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {conversation.lastMessage.sender?.id === user?.id ||
                        conversation.lastMessage.sender?._id === user?._id
                          ? 'Tu: '
                          : ''}
                        {conversation.lastMessage.content}
                      </Text>
                    ) : (
                      <Text style={styles.lastMsg}>Sin mensajes aun</Text>
                    )}

                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalUnreadBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  totalUnreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  newChatButton: {
    padding: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
  },
  filterRow: {
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 5,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '60%',
  },
  skeletonSub: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '80%',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#0C0B10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convContent: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  convTitleUnread: {
    fontWeight: '700',
  },
  convTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  convFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
    marginRight: 8,
  },
  lastMsgUnread: {
    color: '#ffffff',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
