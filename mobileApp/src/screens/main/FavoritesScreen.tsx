// src/screens/main/FavoritesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { dataService } from '../../services/DataService';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect } from '@react-navigation/native';

const DURATIONS = [30, 60, 90, 120, 150, 180];

const FavoritesScreen: React.FC = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [showDurationModal, setShowDurationModal] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState(30);

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const favs = await AuthService.getFavorites();

            const favActivities = await Promise.all(
                favs.map(async fav => {
                    const activity = dataService.getActivityById(fav.activityId);
                    return {
                        ...fav,
                        activity: activity || null,
                    };
                })
            );

            setFavorites(favActivities.filter(fav => fav.activity !== null));
        } catch (error) {
            console.error('Error loading favorites:', error);
            Alert.alert('Erreur', 'Impossible de charger les favoris');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadFavorites();
    };

    const handleRemoveFavorite = async (activityId: string, activityName: string) => {
        Alert.alert(
            'Retirer des favoris',
            `Voulez-vous retirer "${activityName}" de vos favoris ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Retirer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AuthService.removeFavorite(activityId);
                            await loadFavorites();
                            Alert.alert('Succès', 'Activité retirée des favoris');
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de retirer des favoris');
                        }
                    },
                },
            ]
        );
    };

    const handleAddToFavorites = async (activityId: string, activityName: string) => {
        try {
            await AuthService.addFavorite(activityId);
            await loadFavorites();
            // NE PAS envoyer de notification pour l'ajout
            console.log('⭐ Tâche ajoutée aux favoris (pas de notification)');
        } catch (error) {
            console.error('Error adding favorite:', error);
        }
    };

    const renderActivityItem = ({ item }: { item: any }) => (
        <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
                <View style={styles.activityIconContainer}>
                    <Ionicons name="star" size={24} color="#fbbf24" />
                </View>
                <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                        {item.activity?.Code_activite} - {item.activity?.Libelle_activite || 'Activité'}
                    </Text>
                    <View style={styles.activityMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="code" size={14} color="#64748b" />
                            <Text style={styles.metaText}>
                                {item.activity?.Code_activite || 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="layers" size={14} color="#64748b" />
                            <Text style={styles.metaText}>
                                Niv. {item.activity?.Niveau_activite || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.addedDate}>
                        Ajouté le {new Date(item.addedAt).toLocaleDateString('fr-FR')}
                    </Text>
                </View>
            </View>

            <View style={styles.activityActions}>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFavorite(
                        item.activityId,
                        item.activity?.Libelle_activite || 'cette activité'
                    )}
                    disabled={isLoading}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.removeButtonText}>Retirer</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Chargement des favoris...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Tâches favorites</Text>
                <Text style={styles.subtitle}>
                    {favorites.length} activité{favorites.length !== 1 ? 's' : ''} en favoris
                </Text>
            </View>

            {favorites.length > 0 ? (
                <FlatList
                    data={favorites}
                    renderItem={renderActivityItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#6366f1']}
                            tintColor="#6366f1"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="star-outline" size={64} color="#334155" />
                            <Text style={styles.emptyText}>Aucune tâche favorite</Text>
                            <Text style={styles.emptySubtext}>
                                Ajoutez des tâches depuis la liste des activités
                            </Text>
                        </View>
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="star-outline" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>Aucun favori</Text>
                    <Text style={styles.emptyDescription}>
                        Vous n'avez pas encore ajouté d'activités favorites
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        backgroundColor: '#1e293b',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: '#94a3b8',
        fontSize: 16,
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    activityCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    activityHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    activityIconContainer: {
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
        lineHeight: 22,
    },
    activityMeta: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 4,
    },
    addedDate: {
        fontSize: 11,
        color: '#475569',
        fontStyle: 'italic',
    },
    activityActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 16,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    removeButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#f8fafc',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
});

export default FavoritesScreen;