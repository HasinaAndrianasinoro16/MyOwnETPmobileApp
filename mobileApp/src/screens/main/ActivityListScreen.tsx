// src/screens/main/ActivityListScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../services/DataService';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect } from '@react-navigation/native';

// Composant FilterButton séparé
const FilterButton = React.memo(({
                                     level,
                                     isActive,
                                     onPress
                                 }: {
    level: string;
    isActive: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[
            styles.filterButton,
            isActive && styles.filterButtonActive,
        ]}
        onPress={onPress}>
        <Text style={[
            styles.filterText,
            isActive && styles.filterTextActive,
        ]}>
            {level === 'all' ? 'Tous' : `Niveau ${level}`}
        </Text>
    </TouchableOpacity>
));

// Composant ActivityItem séparé
const ActivityItem = React.memo(({
                                     item,
                                     isFavorite,
                                     onToggleFavorite
                                 }: {
    item: any;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
}) => (
    <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
            <View style={styles.activityIconContainer}>
                <Ionicons name="document-text" size={24} color="#6366f1" />
            </View>
            <View style={styles.activityInfo}>
                <Text style={styles.activityTitle} numberOfLines={2}>
                    {item.Libelle_activite}
                </Text>
                <View style={styles.activityMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="pricetag-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{item.Code_activite}</Text>
                    </View>
                    {item.Niveau_activite && (
                        <View style={styles.metaItem}>
                            <Ionicons name="layers-outline" size={14} color="#64748b" />
                            <Text style={styles.metaText}>Niv. {item.Niveau_activite}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>

        <View style={styles.activityActions}>
            <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => onToggleFavorite(item.Id_activite)}>
                <Ionicons
                    name={isFavorite ? "star" : "star-outline"}
                    size={24}
                    color={isFavorite ? "#fbbf24" : "#94a3b8"}
                />
            </TouchableOpacity>
            <View style={styles.activityCode}>
                <Text style={styles.codeText}>{item.Id_activite}</Text>
            </View>
        </View>
    </View>
));

const ActivityListScreen: React.FC = () => {
    const [activities, setActivities] = useState<any[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [levels, setLevels] = useState<string[]>(['all']);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    // Charger les activités
    const loadActivities = useCallback(async () => {
        try {
            setIsLoading(true);
            const allActivities = dataService.getAllActivities();
            setActivities(allActivities);
            setFilteredActivities(allActivities);
        } catch (error) {
            console.error('Error loading activities:', error);
            Alert.alert('Erreur', 'Impossible de charger les activités');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Charger les favoris
    const loadFavorites = useCallback(async () => {
        try {
            const favs = await AuthService.getFavorites();
            const favoriteIds = new Set(favs.map(fav => fav.activityId));
            setFavorites(favoriteIds);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }, []);

    // Initial load
    useFocusEffect(
        useCallback(() => {
            loadActivities();
            loadFavorites();
        }, [loadActivities, loadFavorites])
    );

    // Calcul des niveaux uniques
    useEffect(() => {
        if (activities.length > 0) {
            const levelsSet = new Set(activities.map(act => act.Niveau_activite).filter(Boolean));
            const uniqueLevels = ['all', ...Array.from(levelsSet).sort()];
            setLevels(uniqueLevels);
        }
    }, [activities]);

    // Fonction de filtrage
    const filterActivities = useCallback((activitiesList: any[], search: string, level: string) => {
        let filtered = [...activitiesList];

        if (search.trim()) {
            const term = search.toLowerCase().trim();
            filtered = filtered.filter(activity =>
                activity.Libelle_activite.toLowerCase().includes(term) ||
                activity.Code_activite.toLowerCase().includes(term)
            );
        }

        if (level !== 'all') {
            filtered = filtered.filter(activity => activity.Niveau_activite === level);
        }

        return filtered;
    }, []);

    // Gestion de la recherche avec debounce
    const handleSearch = useCallback((text: string) => {
        setSearchTerm(text);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            const filtered = filterActivities(activities, text, selectedLevel);
            setFilteredActivities(filtered);
        }, 300);
    }, [activities, selectedLevel, filterActivities]);

    // Gestion du filtre par niveau
    const handleFilterByLevel = useCallback((level: string) => {
        setSelectedLevel(level);
        const filtered = filterActivities(activities, searchTerm, level);
        setFilteredActivities(filtered);
    }, [activities, searchTerm, filterActivities]);

    // Refresh
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadActivities();
        loadFavorites();
    }, [loadActivities, loadFavorites]);

    // Toggle favorite
    const handleToggleFavorite = useCallback(async (activityId: string) => {
        try {
            const newFavorites = new Set(favorites);
            if (newFavorites.has(activityId)) {
                await AuthService.removeFavorite(activityId);
                newFavorites.delete(activityId);
            } else {
                await AuthService.addFavorite(activityId);
                newFavorites.add(activityId);
                console.log('⭐ Activité ajoutée aux favoris (pas de notification)');
            }
            setFavorites(newFavorites);
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }, [favorites]);

    // Render item
    const renderActivityItem = useCallback(({ item }: { item: any }) => (
        <ActivityItem
            item={item}
            isFavorite={favorites.has(item.Id_activite)}
            onToggleFavorite={handleToggleFavorite}
        />
    ), [favorites, handleToggleFavorite]);

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Chargement des activités...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Liste des activités</Text>
                    <Text style={styles.subtitle}>
                        {filteredActivities.length} activité{filteredActivities.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.input}
                        placeholder="Rechercher une activité..."
                        value={searchTerm}
                        onChangeText={handleSearch}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchTerm ? (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Filtres par niveau */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                {levels.map(level => (
                    <FilterButton
                        key={level}
                        level={level}
                        isActive={selectedLevel === level}
                        onPress={() => handleFilterByLevel(level)}
                    />
                ))}
            </ScrollView>

            {/* Liste des activités */}
            {filteredActivities.length > 0 ? (
                <FlatList
                    data={filteredActivities}
                    renderItem={renderActivityItem}
                    keyExtractor={item => item.Id_activite}
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
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>
                        {activities.length === 0 ? 'Aucune activité' : 'Aucun résultat'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                        {activities.length === 0
                            ? 'Les activités n\'ont pas pu être chargées'
                            : 'Aucune activité ne correspond à votre recherche'}
                    </Text>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => {
                            handleSearch('');
                            handleFilterByLevel('all');
                        }}>
                        <Text style={styles.clearButtonText}>Réinitialiser les filtres</Text>
                    </TouchableOpacity>
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
        marginBottom: 4,
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
    searchContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#f8fafc',
        padding: 0,
    },
    filterContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    filterText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '600',
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
        marginBottom: 12,
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
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 4,
    },
    activityActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
    },
    favoriteButton: {
        padding: 8,
    },
    activityCode: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    codeText: {
        fontSize: 12,
        color: '#6366f1',
        fontWeight: '600',
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
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    clearButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ActivityListScreen;