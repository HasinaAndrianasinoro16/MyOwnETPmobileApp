// src/screens/main/NotificationTestScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationService } from '../../../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationTestScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({
        enabled: false,
        interval: 15,
        scheduledCount: 0
    });
    const [favorites, setFavorites] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [uncompletedCount, setUncompletedCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Status des rappels
            const remindersStatus = await NotificationService.getRemindersStatus();
            setStatus(remindersStatus);

            // Favoris
            const favsStr = await AsyncStorage.getItem('@bfm_favorites');
            const favs = favsStr ? JSON.parse(favsStr) : [];
            setFavorites(favs);

            // Historique d'aujourd'hui
            const historyStr = await AsyncStorage.getItem('@bfm_history');
            const allHistory = historyStr ? JSON.parse(historyStr) : [];
            const today = new Date().toISOString().split('T')[0];
            const todayHistory = allHistory.filter((log: any) =>
                log.Date_activite && log.Date_activite.startsWith(today)
            );
            setHistory(todayHistory);

            // Compter les tâches non complétées
            const uncompleted = favs.filter((fav: any) =>
                !todayHistory.some((log: any) => log.Id_activite === fav.activityId)
            );
            setUncompletedCount(uncompleted.length);

        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleCheckStatus = async () => {
        setIsLoading(true);
        try {
            await loadData();

            const scheduled = await NotificationService.getScheduledNotifications();

            Alert.alert(
                '📊 Status des notifications',
                `
État: ${status.enabled ? '✅ Activé' : '❌ Désactivé'}
Intervalle: ${status.interval} minutes
Notifications programmées: ${scheduled.length}
Tâches favorites: ${favorites.length}
Tâches complétées aujourd'hui: ${history.length}
Tâches non complétées: ${uncompletedCount}
                `.trim()
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestImmediateNotification = async () => {
        setIsLoading(true);
        try {
            await NotificationService.sendImmediateNotification(
                '🧪 Test immédiat',
                'Cliquez pour aller à CompleteTasks',
                {
                    type: 'test',
                    screen: 'CompleteTasks',
                    redirectTo: 'CompleteTasks',
                }
            );
            Alert.alert('✅ Succès', 'Notification envoyée !');
        } catch (error) {
            Alert.alert('❌ Erreur', 'Impossible d\'envoyer la notification');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestTaskReminder = async () => {
        setIsLoading(true);
        try {
            const sent = await NotificationService.sendTaskReminder();

            if (sent) {
                Alert.alert(
                    '✅ Rappel envoyé',
                    `Notification envoyée pour ${uncompletedCount} tâche(s) non complétée(s)`
                );
            } else {
                Alert.alert(
                    'ℹ️ Aucun rappel',
                    'Aucune tâche non complétée ou aucune tâche favorite'
                );
            }
        } catch (error) {
            Alert.alert('❌ Erreur', 'Impossible d\'envoyer le rappel');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableReminders = async () => {
        setIsLoading(true);
        try {
            await NotificationService.enableReminders(15);
            await loadData();
            Alert.alert(
                '✅ Rappels activés',
                'Des notifications seront envoyées toutes les 15 minutes'
            );
        } catch (error) {
            Alert.alert('❌ Erreur', 'Impossible d\'activer les rappels');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableReminders = async () => {
        setIsLoading(true);
        try {
            await NotificationService.disableReminders();
            await loadData();
            Alert.alert('🔕 Rappels désactivés', 'Les notifications périodiques sont arrêtées');
        } catch (error) {
            Alert.alert('❌ Erreur', 'Impossible de désactiver les rappels');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewScheduled = async () => {
        setIsLoading(true);
        try {
            const scheduled = await NotificationService.getScheduledNotifications();

            if (scheduled.length === 0) {
                Alert.alert('ℹ️ Aucune notification', 'Aucune notification programmée');
                return;
            }

            const list = scheduled.map((notif, index) => {
                const trigger = notif.trigger as any;
                const seconds = trigger?.seconds || 0;
                const minutes = Math.floor(seconds / 60);
                return `${index + 1}. Dans ${minutes} minutes`;
            }).join('\n');

            Alert.alert(
                '📋 Notifications programmées',
                `${scheduled.length} notification(s):\n\n${list}`
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearAll = async () => {
        Alert.alert(
            '⚠️ Attention',
            'Voulez-vous annuler toutes les notifications programmées ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await NotificationService.cancelAllNotifications();
                            await loadData();
                            Alert.alert('✅ Succès', 'Toutes les notifications ont été annulées');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🧪 Test des Notifications</Text>
                <Text style={styles.subtitle}>Debug & Vérification</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle" size={24} color="#3f51b5" />
                        <Text style={styles.cardTitle}>Status Actuel</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>État des rappels:</Text>
                        <Text style={[styles.statusValue, status.enabled ? styles.statusEnabled : styles.statusDisabled]}>
                            {status.enabled ? '✅ Activé' : '❌ Désactivé'}
                        </Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Intervalle:</Text>
                        <Text style={styles.statusValue}>{status.interval} minutes</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Notifications programmées:</Text>
                        <Text style={styles.statusValue}>{status.scheduledCount}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Tâches favorites:</Text>
                        <Text style={styles.statusValue}>{favorites.length}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Complétées aujourd'hui:</Text>
                        <Text style={styles.statusValue}>{history.length}</Text>
                    </View>

                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Non complétées:</Text>
                        <Text style={[styles.statusValue, uncompletedCount > 0 ? styles.statusWarning : styles.statusSuccess]}>
                            {uncompletedCount}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleCheckStatus}
                        disabled={isLoading}>
                        <Ionicons name="refresh" size={20} color="#3f51b5" />
                        <Text style={styles.refreshButtonText}>Actualiser le status</Text>
                    </TouchableOpacity>
                </View>

                {/* Tests Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🧪 Tests de Notifications</Text>

                    <TouchableOpacity
                        style={styles.testButton}
                        onPress={handleTestImmediateNotification}
                        disabled={isLoading}>
                        <Ionicons name="flash" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Test notification immédiate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.testButton, styles.testButtonSecondary]}
                        onPress={handleTestTaskReminder}
                        disabled={isLoading}>
                        <Ionicons name="checkbox" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Test rappel de tâches</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.testButton, styles.testButtonInfo]}
                        onPress={handleViewScheduled}
                        disabled={isLoading}>
                        <Ionicons name="list" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Voir notifications programmées</Text>
                    </TouchableOpacity>
                </View>

                {/* Control Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ Contrôles</Text>

                    <TouchableOpacity
                        style={[styles.testButton, styles.testButtonSuccess]}
                        onPress={handleEnableReminders}
                        disabled={isLoading || status.enabled}>
                        <Ionicons name="notifications" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Activer les rappels (15 min)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.testButton, styles.testButtonWarning]}
                        onPress={handleDisableReminders}
                        disabled={isLoading || !status.enabled}>
                        <Ionicons name="notifications-off" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Désactiver les rappels</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.testButton, styles.testButtonDanger]}
                        onPress={handleClearAll}
                        disabled={isLoading}>
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.testButtonText}>Annuler toutes les notifications</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color="#6366f1" />
                    <Text style={styles.infoText}>
                        Les notifications de rappel vérifient automatiquement vos tâches favorites
                        non complétées et vous envoient des rappels selon l'intervalle défini.
                        {'\n\n'}
                        Cliquez sur une notification pour être redirigé vers l'écran de complétion
                        des tâches.
                    </Text>
                </View>

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#3f51b5" />
                        <Text style={styles.loadingText}>Chargement...</Text>
                    </View>
                )}
            </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
        marginLeft: 12,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statusLabel: {
        fontSize: 14,
        color: '#94a3b8',
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
    },
    statusEnabled: {
        color: '#10b981',
    },
    statusDisabled: {
        color: '#ef4444',
    },
    statusWarning: {
        color: '#f59e0b',
    },
    statusSuccess: {
        color: '#10b981',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#3f51b5',
        gap: 8,
    },
    refreshButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3f51b5',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 12,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3f51b5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 8,
    },
    testButtonSecondary: {
        backgroundColor: '#6366f1',
    },
    testButtonInfo: {
        backgroundColor: '#3b82f6',
    },
    testButtonSuccess: {
        backgroundColor: '#10b981',
    },
    testButtonWarning: {
        backgroundColor: '#f59e0b',
    },
    testButtonDanger: {
        backgroundColor: '#ef4444',
    },
    testButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#94a3b8',
        lineHeight: 20,
    },
    loadingOverlay: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#94a3b8',
    },
});

export default NotificationTestScreen;