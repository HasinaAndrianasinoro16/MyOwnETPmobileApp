// src/screens/main/HomeScreen.tsx - PARTIE PRINCIPALE CORRIGÉE
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { AuthService } from '../../services/AuthService';
import { dataService } from '../../services/DataService';
import { NotificationService } from '../../services/NotificationService';
import { ExcelService } from '../../services/ExcelService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Composants séparés
const SuggestionItem = React.memo(({
                                       suggestion,
                                       onPress,
                                       onAddFavorite
                                   }: {
    suggestion: any;
    onPress: () => void;
    onAddFavorite: () => void;
}) => (
    <TouchableOpacity
        style={styles.suggestionItem}
        onPress={onPress}>
        <View style={styles.suggestionLeft}>
            <Ionicons name="flash" size={16} color="#6366f1" />
            <Text style={styles.suggestionText}>{suggestion.Libelle_activite}</Text>
        </View>
        <TouchableOpacity
            onPress={(e) => {
                e.stopPropagation();
                onAddFavorite();
            }}>
            <Ionicons name="star-outline" size={18} color="#fbbf24" />
        </TouchableOpacity>
    </TouchableOpacity>
));

// Composant NewActivityModal séparé
const NewActivityModal = React.memo(({
                                         visible,
                                         onClose,
                                         activityInput: initialInput,
                                         isLoading: modalLoading,
                                         user: currentUser,
                                         onActivityAdded
                                     }: {
    visible: boolean;
    onClose: () => void;
    activityInput: string;
    isLoading: boolean;
    user: any;
    onActivityAdded: () => void;
}) => {
    const [localActivityInput, setLocalActivityInput] = useState(initialInput);
    const [localSuggestions, setLocalSuggestions] = useState<any[]>([]);
    const [localShowSuggestions, setLocalShowSuggestions] = useState(false);
    const [localDuration, setLocalDuration] = useState(30);
    const localSearchTimeoutRef = useRef<NodeJS.Timeout>();

    // Synchroniser avec l'input initial
    useEffect(() => {
        setLocalActivityInput(initialInput);
    }, [initialInput]);

    // Recherche avec debounce
    const handleLocalInputChange = useCallback((text: string) => {
        setLocalActivityInput(text);

        if (localSearchTimeoutRef.current) {
            clearTimeout(localSearchTimeoutRef.current);
        }

        if (text.trim().length > 0) {
            localSearchTimeoutRef.current = setTimeout(() => {
                const results = dataService.searchActivities(text);
                setLocalSuggestions(results.slice(0, 5));
                setLocalShowSuggestions(true);
            }, 300);
        } else {
            setLocalSuggestions([]);
            setLocalShowSuggestions(false);
        }
    }, []);

    // Soumettre l'activité
    const handleSubmit = async () => {
        if (!localActivityInput.trim() || !currentUser) {
            Alert.alert('Erreur', 'Veuillez entrer une activité');
            return;
        }

        const matchedActivity = dataService.getAllActivities().find(
            a => a.Libelle_activite.toLowerCase() === localActivityInput.toLowerCase()
        );

        if (!matchedActivity) {
            Alert.alert('Erreur', 'Activité non reconnue');
            return;
        }

        try {
            await AuthService.addToHistory({
                Num_matricule: currentUser.Num_matricule,
                Id_activite: matchedActivity.Id_activite,
                Date_activite: new Date().toISOString(),
                Duree: localDuration,
                Libelle_activite: matchedActivity.Libelle_activite,
            });

            Alert.alert('Succès', `Activité "${matchedActivity.Libelle_activite}" enregistrée !`);
            setLocalActivityInput('');
            setLocalDuration(30);
            onActivityAdded();
            onClose();
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'enregistrer l\'activité');
        }
    };

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (localSearchTimeoutRef.current) {
                clearTimeout(localSearchTimeoutRef.current);
            }
        };
    }, []);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Nouvelle activité</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Activité effectuée</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="document-text" size={20} color="#94a3b8" />
                            <TextInput
                                style={styles.input}
                                placeholder="Entrer une activité"
                                value={localActivityInput}
                                onChangeText={handleLocalInputChange}
                                editable={!modalLoading}
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    </View>

                    {localShowSuggestions && localSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {localSuggestions.map(suggestion => (
                                <SuggestionItem
                                    key={suggestion.Id_activite}
                                    suggestion={suggestion}
                                    onPress={() => {
                                        setLocalActivityInput(suggestion.Libelle_activite);
                                        setLocalSuggestions([]);
                                        setLocalShowSuggestions(false);
                                    }}
                                    onAddFavorite={async () => {
                                        try {
                                            const isFavorite = await AuthService.isFavorite(suggestion.Id_activite);
                                            if (isFavorite) {
                                                Alert.alert('Information', 'Cette activité est déjà dans vos favoris');
                                            } else {
                                                await AuthService.addFavorite(suggestion.Id_activite);
                                                Alert.alert('Succès', 'Activité ajoutée aux favoris !');
                                            }
                                        } catch (error) {
                                            Alert.alert('Erreur', 'Impossible d\'ajouter aux favoris');
                                        }
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    <Text style={styles.instructionText}>
                        Ceci est une fenêtre où vous pouvez sélectionner et ajouter une nouvelle tâche dans vos favoris en cliquant sur l'icône en forme d'étoile
                    </Text>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

// Composant ReportModal séparé
const ReportModal = React.memo(({
                                    visible,
                                    onClose
                                }: {
    visible: boolean;
    onClose: () => void;
}) => {
    const [localSelectedPeriod, setLocalSelectedPeriod] = useState('');
    const [localReportType, setLocalReportType] = useState<'standard' | 'detailed'>('standard');
    const [localIsLoading, setLocalIsLoading] = useState(false);

    const generatePeriods = useCallback(() => {
        const periods = [];
        const currentDate = new Date();

        for (let i = 0; i < 6; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString().slice(2);
            periods.push(`${month}/${year}`);
        }

        return periods;
    }, []);

    const handleSendReport = async () => {
        if (!localSelectedPeriod) {
            Alert.alert('Erreur', 'Veuillez sélectionner une période');
            return;
        }

        setLocalIsLoading(true);
        try {
            if (localReportType === 'standard') {
                await ExcelService.sendReportByEmail(localSelectedPeriod);
                Alert.alert(
                    '✅ Succès',
                    `Rapport standard envoyé au SAU !\n\nPériode: ${localSelectedPeriod}`
                );
            } else {
                await ExcelService.sendDetailedReportByEmail(localSelectedPeriod);
                Alert.alert(
                    '✅ Succès',
                    `Rapport détaillé envoyé pour la Période: ${localSelectedPeriod}\nFormat: TXT avec statistiques`
                );
            }

            onClose();
        } catch (error: any) {
            console.error('Erreur détaillée:', error);
            Alert.alert(
                '❌ Erreur',
                `Impossible d'envoyer le rapport:\n\n${error.message || 'Erreur inconnue'}\n\nVérifiez votre connexion internet et réessayez.`
            );
        } finally {
            setLocalIsLoading(false);
        }
    };

    const periods = generatePeriods();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Générer un rapport</Text>

                    {/* Type de rapport */}
                    <View style={styles.reportTypeContainer}>
                        <Text style={styles.reportTypeLabel}>Type de rapport:</Text>
                        <View style={styles.reportTypeButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.reportTypeButton,
                                    localReportType === 'standard' && styles.reportTypeButtonSelected
                                ]}
                                onPress={() => setLocalReportType('standard')}>
                                <Ionicons
                                    name="document-text"
                                    size={20}
                                    color={localReportType === 'standard' ? '#fff' : '#64748b'}
                                />
                                <Text style={[
                                    styles.reportTypeButtonText,
                                    localReportType === 'standard' && styles.reportTypeButtonTextSelected
                                ]}>
                                    Standard
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.reportTypeButton,
                                    localReportType === 'detailed' && styles.reportTypeButtonSelected
                                ]}
                                onPress={() => setLocalReportType('detailed')}>
                                <Ionicons
                                    name="stats-chart"
                                    size={20}
                                    color={localReportType === 'detailed' ? '#fff' : '#64748b'}
                                />
                                <Text style={[
                                    styles.reportTypeButtonText,
                                    localReportType === 'detailed' && styles.reportTypeButtonTextSelected
                                ]}>
                                    Détaillé
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.reportTypeDescription}>
                            {localReportType === 'standard'
                                ? 'Format simple avec données essentielles'
                                : 'Format complet avec statistiques et détails'
                            }
                        </Text>
                    </View>

                    <View style={styles.periodContainer}>
                        <Text style={styles.periodLabel}>Sélectionnez la période:</Text>
                        <View style={styles.periodButtons}>
                            {periods.map(period => (
                                <TouchableOpacity
                                    key={period}
                                    style={[
                                        styles.periodButton,
                                        localSelectedPeriod === period && styles.periodButtonSelected
                                    ]}
                                    onPress={() => setLocalSelectedPeriod(period)}>
                                    <Text style={[
                                        styles.periodButtonText,
                                        localSelectedPeriod === period && styles.periodButtonTextSelected
                                    ]}>
                                        {period}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <Text style={styles.formatInfo}>
                        📄 Format: Fichier TXT avec séparateur point-virgule
                    </Text>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.sendButton, (!localSelectedPeriod || localIsLoading) && styles.disabledButton]}
                            onPress={handleSendReport}
                            disabled={!localSelectedPeriod || localIsLoading}>
                            {localIsLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.sendButtonText}>
                                    {localReportType === 'standard' ? 'Envoyer' : 'Envoyer détaillé'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const HomeScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [showFABMenu, setShowFABMenu] = useState(false);
    const [showNewActivityModal, setShowNewActivityModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activityInput, setActivityInput] = useState('');
    const [performanceStats, setPerformanceStats] = useState({
        daily: { total: 0, count: 0 },
        monthly: { total: 0, count: 0 },
        yearly: { total: 0, count: 0 }
    });
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    // Charger les stats de performance
    const loadPerformanceStats = useCallback(async () => {
        if (!user) return;

        try {
            const history = await AuthService.getHistory();
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const monthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
            const yearStr = today.getFullYear().toString();

            const daily = history.filter(log => log.Date_activite.startsWith(todayStr));
            const monthly = history.filter(log => log.Date_activite.startsWith(monthStr));
            const yearly = history.filter(log => log.Date_activite.startsWith(yearStr));

            setPerformanceStats({
                daily: {
                    total: daily.reduce((sum, log) => sum + log.Duree, 0),
                    count: daily.length
                },
                monthly: {
                    total: monthly.reduce((sum, log) => sum + log.Duree, 0),
                    count: monthly.length
                },
                yearly: {
                    total: yearly.reduce((sum, log) => sum + log.Duree, 0),
                    count: yearly.length
                }
            });
        } catch (error) {
            console.error('Error loading performance stats:', error);
        }
    }, [user]);

    // Charger les notifications non lues
    const loadUnreadNotifications = useCallback(async () => {
        try {
            const notifications = await AuthService.getNotifications();
            const unread = notifications.filter(notif => !notif.read).length;
            setUnreadNotificationsCount(unread);
        } catch (error) {
            console.error('Error loading unread notifications:', error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const loadInitialData = async () => {
            await loadPerformanceStats();
            await loadUnreadNotifications();
        };

        loadInitialData();
    }, [loadPerformanceStats, loadUnreadNotifications]);

    // Refresh on focus
    useFocusEffect(
        useCallback(() => {
            loadPerformanceStats();
            loadUnreadNotifications();
        }, [loadPerformanceStats, loadUnreadNotifications])
    );

    // Handler pour activité ajoutée
    const handleActivityAdded = useCallback(() => {
        loadPerformanceStats();
    }, [loadPerformanceStats]);

    // Rendu du FAB menu
    const renderFABMenu = useCallback(() => {
        if (!showFABMenu) return null;

        return (
            <View style={styles.fabMenu}>
                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('CompleteTasks' as never);
                    }}>
                    <Ionicons name="checkmark-done" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Compléter tâches</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('ActivityList' as never);
                    }}>
                    <Ionicons name="list" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Activités</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('Favorites' as never);
                    }}>
                    <Ionicons name="star" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Favoris</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('History' as never);
                    }}>
                    <Ionicons name="time" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Historique</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('Notification' as never);
                    }}>
                    <Ionicons name="notifications" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Notifications</Text>
                    {unreadNotificationsCount > 0 && (
                        <View style={styles.fabMenuBadge}>
                            <Text style={styles.fabMenuBadgeText}>{unreadNotificationsCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fabMenuItem}
                    onPress={() => {
                        setShowFABMenu(false);
                        navigation.navigate('Settings' as never);
                    }}>
                    <Ionicons name="settings" size={24} color="#fff" />
                    <Text style={styles.fabMenuText}>Paramètres</Text>
                </TouchableOpacity>
            </View>
        );
    }, [showFABMenu, navigation, unreadNotificationsCount]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Header avec boutons d'action */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Bonjour,</Text>
                        <Text style={styles.userName}>{user?.Prenom}</Text>
                        <Text style={styles.userInfo}>{user?.Direction} • {user?.Departement}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        {/*<TouchableOpacity*/}
                        {/*    style={styles.headerActionButton}*/}
                        {/*    onPress={() => setShowNewActivityModal(true)}>*/}
                        {/*    <Ionicons name="search" size={20} color="#fff" />*/}
                        {/*</TouchableOpacity>*/}

                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={() => setShowReportModal(true)}>
                            <Ionicons name="paper-plane" size={20} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.headerActionButton}
                            onPress={() => navigation.navigate('Notification' as never)}>
                            <Ionicons name="notifications" size={20} color="#fff" />
                            {unreadNotificationsCount > 0 && (
                                <View style={styles.notificationBadge}>
                                    <Text style={styles.notificationBadgeText}>
                                        {unreadNotificationsCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Performance Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trending-up" size={24} color="#6366f1" />
                        <Text style={styles.sectionTitle}>Mes performances</Text>
                    </View>

                    <View style={styles.performanceGrid}>
                        {/* Aujourd'hui */}
                        <View style={styles.performanceCardToday}>
                            <View style={styles.performanceHeader}>
                                <View style={styles.performanceIconContainer}>
                                    <Ionicons name="today" size={28} color="#10b981" />
                                </View>
                                <View>
                                    <Text style={styles.performanceLabel}>AUJOURD'HUI</Text>
                                    <Text style={styles.performanceDate}>
                                        {new Date().toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long'
                                        })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.performanceStats}>
                                <View style={styles.performanceStat}>
                                    <Text style={styles.performanceValue}>{performanceStats.daily.total}</Text>
                                    <Text style={styles.performanceUnit}>minutes</Text>
                                </View>
                                <View style={styles.performanceDivider} />
                                <View style={styles.performanceStat}>
                                    <Text style={styles.performanceValue}>{performanceStats.daily.count}</Text>
                                    <Text style={styles.performanceUnit}>activités</Text>
                                </View>
                            </View>

                            <View style={styles.performanceProgress}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min((performanceStats.daily.total / 480) * 100, 100)}%`,
                                                backgroundColor: performanceStats.daily.total > 360 ? '#10b981' :
                                                    performanceStats.daily.total > 240 ? '#3b82f6' :
                                                        performanceStats.daily.total > 120 ? '#f59e0b' : '#ef4444'
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {performanceStats.daily.total > 0
                                        ? `${((performanceStats.daily.total / 480) * 100).toFixed(0)}% de la journée`
                                        : 'Aucune activité aujourd\'hui'
                                    }
                                </Text>
                            </View>
                        </View>

                        {/* Ce mois et Cette année */}
                        <View style={styles.monthYearGrid}>
                            <View style={styles.performanceCard}>
                                <View style={styles.performanceHeaderSmall}>
                                    <View style={[styles.performanceIconSmall, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                        <Ionicons name="calendar" size={20} color="#3b82f6" />
                                    </View>
                                    <Text style={styles.performanceLabelSmall}>CE MOIS</Text>
                                </View>

                                <View style={styles.performanceStatsSmall}>
                                    <View style={styles.performanceStatSmall}>
                                        <Text style={styles.performanceValueSmall}>{performanceStats.monthly.total}</Text>
                                        <Text style={styles.performanceUnitSmall}>minutes</Text>
                                    </View>
                                    <View style={styles.performanceDividerSmall} />
                                    <View style={styles.performanceStatSmall}>
                                        <Text style={styles.performanceValueSmall}>{performanceStats.monthly.count}</Text>
                                        <Text style={styles.performanceUnitSmall}>activités</Text>
                                    </View>
                                </View>

                                <View style={styles.performanceTrend}>
                                    <Ionicons
                                        name={performanceStats.monthly.total > (performanceStats.yearly.total / 12) ? "trending-up" : "trending-down"}
                                        size={16}
                                        color={performanceStats.monthly.total > (performanceStats.yearly.total / 12) ? "#10b981" : "#ef4444"}
                                    />
                                    <Text style={styles.trendText}>
                                        {performanceStats.monthly.total > (performanceStats.yearly.total / 12) ? "+" : ""}
                                        {performanceStats.monthly.total > 0 && performanceStats.yearly.total > 0
                                            ? `${((performanceStats.monthly.total / (performanceStats.yearly.total / 12)) * 100 - 100).toFixed(0)}%`
                                            : '0%'
                                        }
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.performanceCard}>
                                <View style={styles.performanceHeaderSmall}>
                                    <View style={[styles.performanceIconSmall, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                                        <Ionicons name="stats-chart" size={20} color="#8b5cf6" />
                                    </View>
                                    <Text style={styles.performanceLabelSmall}>CETTE ANNÉE</Text>
                                </View>

                                <View style={styles.performanceStatsSmall}>
                                    <View style={styles.performanceStatSmall}>
                                        <Text style={styles.performanceValueSmall}>{performanceStats.yearly.total}</Text>
                                        <Text style={styles.performanceUnitSmall}>minutes</Text>
                                    </View>
                                    <View style={styles.performanceDividerSmall} />
                                    <View style={styles.performanceStatSmall}>
                                        <Text style={styles.performanceValueSmall}>{performanceStats.yearly.count}</Text>
                                        <Text style={styles.performanceUnitSmall}>activités</Text>
                                    </View>
                                </View>

                                <View style={styles.performanceTrend}>
                                    <Ionicons
                                        name={performanceStats.yearly.total > (performanceStats.monthly.total * 12) ? "trending-up" : "trending-down"}
                                        size={16}
                                        color={performanceStats.yearly.total > (performanceStats.monthly.total * 12) ? "#10b981" : "#ef4444"}
                                    />
                                    <Text style={styles.trendText}>
                                        {performanceStats.yearly.total > 0 && performanceStats.monthly.total > 0
                                            ? `${(performanceStats.yearly.total / (performanceStats.monthly.total * 12) * 100).toFixed(0)}% du potentiel`
                                            : '0% du potentiel'
                                        }
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* FAB Menu */}
            {renderFABMenu()}

            {/* FAB principal */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowFABMenu(!showFABMenu)}>
                <Ionicons
                    name={showFABMenu ? "close" : "menu"}
                    size={28}
                    color="#fff"
                />
            </TouchableOpacity>

            {/* Modals */}
            <NewActivityModal
                visible={showNewActivityModal}
                onClose={() => setShowNewActivityModal(false)}
                activityInput={activityInput}
                isLoading={isLoading}
                user={user}
                onActivityAdded={handleActivityAdded}
            />

            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollView: {
        flex: 1,
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
    greeting: {
        fontSize: 14,
        color: '#94a3b8',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f8fafc',
    },
    userInfo: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerActionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#4f46e5',
    },
    notificationBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1e293b',
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    performanceGrid: {
        gap: 16,
    },
    performanceCardToday: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    performanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    performanceIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    performanceLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    performanceDate: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 2,
    },
    performanceStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    performanceStat: {
        flex: 1,
        alignItems: 'center',
    },
    performanceValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    performanceUnit: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    performanceDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#334155',
    },
    performanceProgress: {
        marginTop: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#334155',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 8,
        textAlign: 'center',
    },
    monthYearGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    performanceCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    performanceHeaderSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    performanceIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    performanceLabelSmall: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    performanceStatsSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    performanceStatSmall: {
        flex: 1,
        alignItems: 'center',
    },
    performanceValueSmall: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    performanceUnitSmall: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 2,
    },
    performanceDividerSmall: {
        width: 1,
        height: 24,
        backgroundColor: '#334155',
    },
    performanceTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#4f46e5',
    },
    fabMenu: {
        position: 'absolute',
        bottom: 90,
        right: 24,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        minWidth: 180,
    },
    fabMenuText: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
        flex: 1,
    },
    fabMenuBadge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    fabMenuBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        backgroundColor: '#0f172a',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#f8fafc',
        marginLeft: 8,
        padding: 0,
    },
    suggestionsContainer: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    suggestionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    suggestionText: {
        fontSize: 14,
        color: '#f1f5f9',
    },
    instructionText: {
        fontSize: 12,
        color: '#64748b',
        fontStyle: 'italic',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
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
    sendButton: {
        backgroundColor: '#6366f1',
    },
    disabledButton: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    reportTypeContainer: {
        marginBottom: 20,
    },
    reportTypeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    reportTypeButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    reportTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    reportTypeButtonSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    reportTypeButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    reportTypeButtonTextSelected: {
        color: '#fff',
    },
    reportTypeDescription: {
        fontSize: 12,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    periodContainer: {
        marginBottom: 20,
    },
    periodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    periodButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    periodButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    periodButtonSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    periodButtonText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    periodButtonTextSelected: {
        color: '#fff',
        fontWeight: '500',
    },
    formatInfo: {
        fontSize: 12,
        color: '#6366f1',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
});

export default HomeScreen;