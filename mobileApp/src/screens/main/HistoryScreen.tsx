// src/screens/main/HistoryScreen.tsx
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
    TextInput,
    ActivityIndicator,
    RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { AuthService } from '../../services/AuthService';
import { dataService } from '../../services/DataService';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const HistoryScreen: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterDate, setFilterDate] = useState<string>('');
    const [filterPeriod, setFilterPeriod] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const loadHistory = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const history = await AuthService.getHistory();

            const formattedActivities = await Promise.all(
                history.map(async (log) => {
                    const activity = dataService.getActivityById(log.Id_activite);
                    return {
                        ...log,
                        activity: activity || null,
                        formattedDate: new Date(log.Date_activite).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }),
                        formattedTime: new Date(log.Date_activite).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        period: `${new Date(log.Date_activite).getMonth() + 1}/${new Date(log.Date_activite).getFullYear().toString().slice(2)}`,
                    };
                })
            );

            // Trier par date (plus récent en premier)
            formattedActivities.sort((a, b) =>
                new Date(b.Date_activite).getTime() - new Date(a.Date_activite).getTime()
            );

            setActivities(formattedActivities);
            setFilteredActivities(formattedActivities);
        } catch (error) {
            console.error('Error loading history:', error);
            Alert.alert('Erreur', 'Impossible de charger l\'historique');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadHistory();
    };

    const handleDateConfirm = (date: Date) => {
        const formattedDate = date.toISOString().split('T')[0];
        setFilterDate(formattedDate);
        setShowDatePicker(false);
    };

    const handlePeriodConfirm = (date: Date) => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(2);
        setFilterPeriod(`${month}/${year}`);
        setShowPeriodPicker(false);
    };

    const applyFilters = () => {
        let filtered = activities;

        if (filterDate) {
            filtered = filtered.filter(act =>
                act.Date_activite.startsWith(filterDate)
            );
        }

        if (filterPeriod) {
            const [month, year] = filterPeriod.split('/').map(Number);
            filtered = filtered.filter(act => {
                const actDate = new Date(act.Date_activite);
                return actDate.getMonth() + 1 === month &&
                    actDate.getFullYear().toString().slice(2) === year.toString();
            });
        }

        setFilteredActivities(filtered);
        setShowFilterModal(false);
    };

    const clearFilters = () => {
        setFilterDate('');
        setFilterPeriod('');
        setFilteredActivities(activities);
        setShowFilterModal(false);
    };

    const getTotalDuration = () => {
        return filteredActivities.reduce((total, act) => total + act.Duree, 0);
    };

    const getActivitiesByPeriod = () => {
        const periods: Record<string, { totalDuration: number, count: number }> = {};

        filteredActivities.forEach(act => {
            if (!periods[act.period]) {
                periods[act.period] = { totalDuration: 0, count: 0 };
            }
            periods[act.period].totalDuration += act.Duree;
            periods[act.period].count += 1;
        });

        return periods;
    };

    const renderActivityItem = ({ item }: { item: any }) => (
        <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
                <View style={styles.activityIconContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                        {item.activity?.Libelle_activite || 'Activité non trouvée'}
                    </Text>
                    <View style={styles.activityMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color="#64748b" />
                            <Text style={styles.metaText}>{item.formattedTime}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={14} color="#64748b" />
                            <Text style={styles.metaText}>{item.formattedDate}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="pricetag-outline" size={14} color="#64748b" />
                            <Text style={styles.metaText}>{item.activity?.Code_activite || 'N/A'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.activityFooter}>
                <View style={styles.durationBadge}>
                    <Ionicons name="hourglass-outline" size={16} color="#6366f1" />
                    <Text style={styles.durationText}>{item.Duree} min</Text>
                </View>
                <Text style={styles.periodBadge}>{item.period}</Text>
            </View>
        </View>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Chargement de l'historique...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header avec statistiques */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Historique des activités</Text>
                    <Text style={styles.subtitle}>
                        {filteredActivities.length} activité{filteredActivities.length !== 1 ? 's' : ''} •
                        Total: {getTotalDuration()} min
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilterModal(true)}>
                    <Ionicons name="filter" size={24} color="#6366f1" />
                </TouchableOpacity>
            </View>

            {/* Résumé par période */}
            {Object.keys(getActivitiesByPeriod()).length > 0 && (
                <View style={styles.periodsSummary}>
                    <Text style={styles.summaryTitle}>Récapitulatif par période</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodsScroll}>
                        {Object.entries(getActivitiesByPeriod()).map(([period, data]) => (
                            <View key={period} style={styles.periodCard}>
                                <Text style={styles.periodText}>{period}</Text>
                                <Text style={styles.periodCount}>{data.count} activité{data.count !== 1 ? 's' : ''}</Text>
                                <Text style={styles.periodDuration}>{data.totalDuration} min</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Liste des activités */}
            {filteredActivities.length > 0 ? (
                <FlatList
                    data={filteredActivities}
                    renderItem={renderActivityItem}
                    keyExtractor={item => item.Id_logs.toString()}
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
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="time-outline" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>
                        {activities.length === 0 ? 'Aucune activité' : 'Aucun résultat'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                        {activities.length === 0
                            ? 'Vous n\'avez pas encore enregistré d\'activités'
                            : 'Aucune activité ne correspond à vos filtres'}
                    </Text>
                    {activities.length === 0 ? (
                        <TouchableOpacity style={styles.startButton}>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.startButtonText}>Commencer une activité</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={clearFilters}>
                            <Text style={styles.clearButtonText}>Effacer les filtres</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Modal de filtrage */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filtrer l'historique</Text>

                        {/* Filtre par date */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Par date spécifique</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar" size={20} color="#6366f1" />
                                <Text style={styles.dateInputText}>
                                    {filterDate ? new Date(filterDate).toLocaleDateString('fr-FR') : 'Sélectionner une date'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Filtre par période */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Par période (mois/année)</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowPeriodPicker(true)}>
                                <Ionicons name="calendar" size={20} color="#6366f1" />
                                <Text style={styles.dateInputText}>
                                    {filterPeriod || 'Sélectionner une période'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowFilterModal(false)}>
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.applyButton]}
                                onPress={applyFilters}>
                                <Text style={styles.applyButtonText}>Appliquer</Text>
                            </TouchableOpacity>
                        </View>

                        {(filterDate || filterPeriod) && (
                            <TouchableOpacity
                                style={styles.clearAllButton}
                                onPress={clearFilters}>
                                <Ionicons name="close-circle" size={20} color="#ef4444" />
                                <Text style={styles.clearAllButtonText}>Effacer tous les filtres</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* DatePicker pour date spécifique */}
            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
                locale="fr_FR"
            />

            {/* DatePicker pour période */}
            <DateTimePickerModal
                isVisible={showPeriodPicker}
                mode="date"
                display="spinner"
                onConfirm={handlePeriodConfirm}
                onCancel={() => setShowPeriodPicker(false)}
                locale="fr_FR"
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    filterButton: {
        backgroundColor: '#1e293b',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
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
    periodsSummary: {
        padding: 16,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 12,
    },
    periodsScroll: {
        flexDirection: 'row',
    },
    periodCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        minWidth: 100,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    periodText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
        marginBottom: 4,
    },
    periodCount: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 2,
    },
    periodDuration: {
        fontSize: 12,
        color: '#10b981',
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
        flexWrap: 'wrap',
        gap: 8,
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
    activityFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    durationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
        marginLeft: 4,
    },
    periodBadge: {
        fontSize: 12,
        color: '#94a3b8',
        backgroundColor: '#0f172a',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
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
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    clearButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    clearButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 24,
        textAlign: 'center',
    },
    filterSection: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    dateInputText: {
        flex: 1,
        fontSize: 14,
        color: '#94a3b8',
        marginLeft: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#334155',
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600',
    },
    applyButton: {
        backgroundColor: '#6366f1',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    clearAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        gap: 8,
    },
    clearAllButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default HistoryScreen;