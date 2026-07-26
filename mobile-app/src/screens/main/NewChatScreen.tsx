import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import chatService from '@/services/ChatService';
import userService from '@/services/UserService';
import { useTheme } from '@/contexts/ThemeContext';

export default function NewChatScreen() {
  const { theme } = useTheme();
    const router = useRouter();
    const { user } = useAuth();
    const styles = getStyles(theme);

    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [creatingChat, setCreatingChat] = useState(false);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setUsers([]);
            return;
        }

        try {
            setLoading(true);
            const response = await userService.searchUsers(text, 1, 20);
            if (response && response.data) {
                // Filter out the current user
                setUsers(response.data.filter(u => u.id !== user?.id && u._id !== user?._id));
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = async (selectedUser: User) => {
        if (creatingChat) return;

        try {
            setCreatingChat(true);
            const targetId = selectedUser.id || selectedUser._id;
            if (!targetId) throw new Error('Usuario seleccionado no válido');

            const response = await chatService.createChat({
                type: 'direct',
                participants: [targetId],
            });

            if (response.success && response.data) {
                router.replace('/chat/' + response.data.id);
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            Alert.alert('Error', 'No se pudo iniciar la conversación. Inténtalo de nuevo.');
        } finally {
            setCreatingChat(false);
        }
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleUserSelect(item)}
            disabled={creatingChat}
        >
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                        {item.firstName?.charAt(0) || item.username?.charAt(0) || '?'}
                    </Text>
                </View>
            )}
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.userHandle}>@{item.username}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar usuarios..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id || (item as any)._id}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        searchQuery.trim() ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={48} color="#C7C7CC" />
                                <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={48} color="#C7C7CC" />
                                <Text style={styles.emptyText}>Busca un usuario para iniciar un chat</Text>
                            </View>
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        paddingVertical: 8,
    },
    clearButton: {
        padding: 4,
    },
    listContent: {
        flexGrow: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: theme.colors.background,
        fontSize: 20,
        fontWeight: 'bold',
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    userHandle: {
        fontSize: 14,
        color: '#8E8E93',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
});
