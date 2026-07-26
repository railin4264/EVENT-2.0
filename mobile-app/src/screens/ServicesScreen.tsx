import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');

interface ServiceCategory {
    _id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
    colors: string[];
    image: string;
    identifier: string;
}

export default function ServicesScreen() {
    const { theme, isDark } = useTheme();
    const styles = getStyles(theme);

    const { data: services = [], isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await api.get('/services');
            return response.data.data;
        }
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Servicios</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Todo lo que necesitas para tu evento
                    </Text>
                </View>

                {/* Featured Service (Mock AI Assistant) */}
                <View style={styles.featuredContainer}>
                    <LinearGradient
                        colors={theme.gradients.primary as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.aiCard}
                    >
                        <View style={styles.aiContent}>
                            <View style={styles.aiIconContainer}>
                                <Ionicons name="sparkles" size={24} color="#fff" />
                            </View>
                            <View style={styles.aiTextContainer}>
                                <Text style={styles.aiTitle}>AI Concierge</Text>
                                <Text style={styles.aiDescription}>Planifica tu noche perfecta con IA</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.aiButton}
                                onPress={() => router.push('/chat/ai-concierge' as any)}
                            >
                                <Text style={styles.aiButtonText}>Chat</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Services Grid */}
                <View style={styles.gridContainer}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20, width: '100%' }} />
                    ) : (
                        services.map((service: ServiceCategory) => (
                            <TouchableOpacity
                                key={service._id}
                                style={[styles.serviceCard, { backgroundColor: theme.colors.surface }]}
                                onPress={() => router.push({ pathname: '/services-detail', params: { identifier: service.identifier } } as any)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: service.image }} style={styles.serviceImage} />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                                        style={styles.imageOverlay}
                                    />
                                    <View style={[styles.iconContainer, { backgroundColor: service.colors[0] }]}>
                                        <Ionicons name={service.icon} size={20} color="#fff" />
                                    </View>
                                </View>

                                <View style={styles.cardContent}>
                                    <Text style={[styles.serviceName, { color: theme.colors.text }]}>
                                        {service.name}
                                    </Text>
                                    <Text style={[styles.serviceDescription, { color: theme.colors.textSecondary }]}>
                                        {service.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Promotions Section */}
                <View style={styles.promoSection}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Promociones Exclusivas
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll}>
                        {services.slice(0, 5).map((service: ServiceCategory) => (
                            <TouchableOpacity
                                key={service._id}
                                style={[styles.promoCard, { backgroundColor: theme.colors.surface }]}
                                onPress={() => router.push({ pathname: '/services-detail', params: { identifier: service.identifier } } as any)}
                                activeOpacity={0.85}
                            >
                                {service.image ? (
                                    <Image source={{ uri: service.image }} style={styles.promoImage} />
                                ) : (
                                    <View style={[styles.promoImage, { backgroundColor: service.colors?.[0] || theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                                        <Ionicons name={service.icon || 'star'} size={36} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.promoContent}>
                                    <Text style={[styles.promoTitle, { color: theme.colors.text }]} numberOfLines={1}>{service.name}</Text>
                                    <Text style={[styles.promoDiscount, { color: theme.colors.primary }]} numberOfLines={1}>{service.description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    featuredContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    aiCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    aiContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    aiIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    aiTextContainer: {
        flex: 1,
    },
    aiTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.background,
        marginBottom: 4,
    },
    aiDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    aiButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 20,
    },
    aiButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 12,
    },
    gridContainer: {
        paddingHorizontal: 24,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
    },
    serviceCard: {
        width: (width - 48 - 16) / 2, // 2 columns
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
        elevation: 2,
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 16,
    },
    imageContainer: {
        height: 120,
        position: 'relative',
    },
    serviceImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    iconContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    cardContent: {
        padding: 12,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    serviceDescription: {
        fontSize: 12,
    },
    promoSection: {
        marginTop: 8,
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    promoScroll: {
        paddingLeft: 24,
    },
    promoCard: {
        width: 240,
        borderRadius: 16,
        marginRight: 16,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    promoImage: {
        width: 80,
        height: 80,
        resizeMode: 'cover',
    },
    promoContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    promoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    promoDiscount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
