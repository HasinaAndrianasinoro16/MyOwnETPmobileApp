// src/screens/main/CompleteTasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { AuthService } from '../../services/AuthService';
import { dataService } from '../../services/DataService';
import { useNavigation } from '@react-navigation/native';

// Composant TaskItem séparé
const TaskItem = React.memo(({
                                 item,
                                 isSelected,
                                 onToggle
                             }: {
    item: any;
    isSelected: boolean;
    onToggle: (id: string) => void;
}) => (
    <TouchableOpacity
        style={[
            styles.taskCard,
            isSelected && styles.taskCardSelected
        ]}
        onPress={() => onToggle(item.activityId)}
        activeOpacity={0.7}>
        <View style={styles.taskContent}>
            <View style={styles.taskCheckbox}>
                <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={28}
                    color={isSelected ? "#10b981" : "#64748b"}
                />
            </View>

            <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={2}>
                    {item.activity?.Libelle_activite}
                </Text>
                <View style={styles.taskMeta}>
                    <View style={styles.metaBadge}>
                        <Ionicons name="pricetag" size={14} color="#6366f1" />
                        <Text style={styles.metaText}>{item.activity?.Code_activite}</Text>
                    </View>
                    {item.activity?.Niveau_activite && (
                        <View style={styles.metaBadge}>
                            <Ionicons name="layers" size={14} color="#8b5cf6" />
                            <Text style={styles.metaText}>Niv. {item.activity?.Niveau_activite}</Text>
                        </View>
                    )}
                </View>
            </View>

            {isSelected && (
                <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
            )}
        </View>
    </TouchableOpacity>
));

// Composant ConfirmModal séparé
const ConfirmModal = React.memo(({
                                     visible,
                                     onClose,
                                     onConfirm,
                                     selectedCount,
                                     isLoading
                                 }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: (duration: number, flag: string) => Promise<void>;
    selectedCount: number;
    isLoading: boolean;
}) => {
    const [localDuration, setLocalDuration] = useState(30);
    const [localFlag, setLocalFlag] = useState('#devv');

    const handleConfirm = async () => {
        await onConfirm(localDuration, localFlag);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Compléter les tâches</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSummary}>
                        <Ionicons name="information-circle" size={20} color="#6366f1" />
                        <Text style={styles.summaryText}>
                            {selectedCount} tâche(s) sélectionnée(s)
                        </Text>
                    </View>

                    {/* Sélection de la durée */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="time" size={16} color="#f8fafc" /> Durée par tâche
                        </Text>
                        <View style={styles.durationGrid}>
                            {[15, 30, 45, 60, 90, 120].map(duration => (
                                <TouchableOpacity
                                    key={duration}
                                    style={[
                                        styles.durationChip,
                                        localDuration === duration && styles.durationChipSelected
                                    ]}
                                    onPress={() => setLocalDuration(duration)}>
                                    <Text style={[
                                        styles.durationText,
                                        localDuration === duration && styles.durationTextSelected
                                    ]}>
                                        {duration} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Champ Flag obligatoire */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="flag" size={16} color="#f8fafc" /> Flag
                            <Text style={styles.required}> *</Text>
                        </Text>
                        <View style={styles.flagInputContainer}>
                            <Ionicons name="flag-outline" size={20} color="#6366f1" />
                            <TextInput
                                style={styles.input}
                                value={localFlag}
                                onChangeText={setLocalFlag}
                                placeholder="Exemple: #devv"
                                placeholderTextColor="#64748b"
                                maxLength={50}
                            />
                        </View>
                        <Text style={styles.helpText}>
                            <Ionicons name="information-circle-outline" size={12} color="#64748b" />
                            {' '}Ce flag sera ajouté à toutes les tâches sélectionnées
                        </Text>
                    </View>

                    {/* Récapitulatif */}
                    <View style={styles.recap}>
                        <View style={styles.recapRow}>
                            <Text style={styles.recapLabel}>Tâches:</Text>
                            <Text style={styles.recapValue}>{selectedCount}</Text>
                        </View>
                        <View style={styles.recapRow}>
                            <Text style={styles.recapLabel}>Durée/tâche:</Text>
                            <Text style={styles.recapValue}>{localDuration} min</Text>
                        </View>
                        <View style={styles.recapRow}>
                            <Text style={styles.recapLabel}>Temps total:</Text>
                            <Text style={styles.recapValue}>{selectedCount * localDuration} min</Text>
                        </View>
                        <View style={styles.recapRow}>
                            <Text style={styles.recapLabel}>Flag:</Text>
                            <Text style={styles.recapValue}>{localFlag || '(vide)'}</Text>
                        </View>
                    </View>

                    {/* Boutons d'action */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                (!localFlag.trim() || isLoading) && styles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirm}
                            disabled={!localFlag.trim() || isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const CompleteTasksScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isAllSelected, setIsAllSelected] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Charger les favoris
    const loadFavorites = useCallback(async () => {
        try {
            setIsLoadingTasks(true);
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
            const validFavorites = favActivities.filter(fav => fav.activity !== null);
            setFavorites(validFavorites);

            // Sélectionner toutes les tâches par défaut
            const defaultSelected = new Set(validFavorites.map(fav => fav.activityId));
            setSelectedTasks(defaultSelected);
            setIsAllSelected(true);
        } catch (error) {
            console.error('Error loading favorites:', error);
            Alert.alert('Erreur', 'Impossible de charger les tâches favorites');
        } finally {
            setIsLoadingTasks(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    // Toggle sélection d'une tâche
    const toggleTaskSelection = useCallback((taskId: string) => {
        setSelectedTasks(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(taskId)) {
                newSelected.delete(taskId);
            } else {
                newSelected.add(taskId);
            }
            setIsAllSelected(newSelected.size === favorites.length);
            return newSelected;
        });
    }, [favorites.length]);

    // Toggle sélection de toutes les tâches
    const toggleSelectAll = useCallback(() => {
        if (isAllSelected) {
            setSelectedTasks(new Set());
        } else {
            const allIds = new Set(favorites.map(fav => fav.activityId));
            setSelectedTasks(allIds);
        }
        setIsAllSelected(!isAllSelected);
    }, [isAllSelected, favorites]);

    // Ouvrir modal de confirmation
    const handleOpenConfirmModal = useCallback(() => {
        if (selectedTasks.size === 0) {
            Alert.alert('Attention', 'Veuillez sélectionner au moins une tâche');
            return;
        }
        setShowConfirmModal(true);
    }, [selectedTasks.size]);

    // Compléter les tâches sélectionnées
    const completeSelectedTasks = useCallback(async (duration: number, flag: string) => {
        if (!flag.trim()) {
            Alert.alert('Erreur', 'Le champ Flag est obligatoire');
            return;
        }

        if (!user || selectedTasks.size === 0) {
            Alert.alert('Erreur', 'Veuillez sélectionner au moins une tâche');
            return;
        }

        setIsLoading(true);
        try {
            const selectedFavorites = favorites.filter(fav => selectedTasks.has(fav.activityId));

            // Enregistrer chaque tâche sélectionnée avec le flag
            for (const fav of selectedFavorites) {
                await AuthService.addToHistory({
                    Num_matricule: user.Num_matricule,
                    Id_activite: fav.activityId,
                    Date_activite: new Date().toISOString(),
                    Duree: duration,
                    Libelle_activite: fav.activity?.Libelle_activite || '',
                    Flag: flag,
                });
            }

            // Ajouter une notification
            await AuthService.addNotification({
                type: 'tasks_completed',
                title: 'Tâches complétées',
                message: `${selectedTasks.size} tâche(s) terminée(s) en ${duration} minutes chacune avec flag: ${flag}`,
                date: new Date().toISOString(),
                read: false,
            });

            setShowConfirmModal(false);

            Alert.alert(
                'Succès',
                `${selectedTasks.size} tâche(s) complétée(s) en ${duration} minutes chacune avec flag: ${flag}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            loadFavorites();
                            navigation.goBack();
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error completing tasks:', error);
            Alert.alert('Erreur', 'Impossible de compléter les tâches');
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedTasks, favorites, loadFavorites, navigation]);

    // Render item
    const renderTaskItem = useCallback(({ item }: { item: any }) => (
        <TaskItem
            item={item}
            isSelected={selectedTasks.has(item.activityId)}
            onToggle={toggleTaskSelection}
        />
    ), [selectedTasks, toggleTaskSelection]);

    if (isLoadingTasks) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Chargement des tâches...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Compléter vos tâches</Text>
                <Text style={styles.subtitle}>
                    Sélectionnez les tâches accomplies aujourd'hui
                </Text>
            </View>

            {/* Actions rapides */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={[styles.quickAction, isAllSelected && styles.quickActionActive]}
                    onPress={toggleSelectAll}>
                    <Ionicons
                        name={isAllSelected ? "checkbox" : "square-outline"}
                        size={20}
                        color={isAllSelected ? "#fff" : "#94a3b8"}
                    />
                    <Text style={[styles.quickActionText, isAllSelected && styles.quickActionTextActive]}>
                        {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.selectionBadge}>
                    <Text style={styles.selectionCount}>{selectedTasks.size}</Text>
                    <Text style={styles.selectionLabel}>/ {favorites.length}</Text>
                </View>
            </View>

            {/* Liste des tâches */}
            {favorites.length > 0 ? (
                <FlatList
                    data={favorites}
                    renderItem={renderTaskItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="star-outline" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>Aucune tâche favorite</Text>
                    <Text style={styles.emptyDescription}>
                        Ajoutez des tâches favorites depuis la liste des activités
                    </Text>
                    <TouchableOpacity
                        style={styles.addTasksButton}
                        onPress={() => navigation.navigate('ActivityList' as never)}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addTasksButtonText}>Ajouter des tâches</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Bouton flottant */}
            {selectedTasks.size > 0 && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={handleOpenConfirmModal}>
                    <Ionicons name="checkmark-done" size={24} color="#fff" />
                    <Text style={styles.floatingButtonText}>
                        Accomplir ({selectedTasks.size})
                    </Text>
                </TouchableOpacity>
            )}

            <ConfirmModal
                visible={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={completeSelectedTasks}
                selectedCount={selectedTasks.size}
                isLoading={isLoading}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
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
        lineHeight: 20,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1e293b',
        margin: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    quickActionActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    quickActionText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    quickActionTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    selectionBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    selectionCount: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6366f1',
    },
    selectionLabel: {
        fontSize: 14,
        color: '#94a3b8',
        marginLeft: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    taskCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#334155',
    },
    taskCardSelected: {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    taskContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskCheckbox: {
        marginRight: 12,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
        lineHeight: 22,
    },
    taskMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    selectedIndicator: {
        marginLeft: 8,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        left: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
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
    addTasksButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    addTasksButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 32,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f8fafc',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 12,
    },
    required: {
        color: '#ef4444',
    },
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    durationChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        minWidth: 80,
        alignItems: 'center',
    },
    durationChipSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    durationText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    durationTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    flagInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#f8fafc',
        padding: 0,
    },
    helpText: {
        fontSize: 12,
        color: '#64748b',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    recap: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    recapRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recapLabel: {
        fontSize: 14,
        color: '#94a3b8',
    },
    recapValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default CompleteTasksScreen;