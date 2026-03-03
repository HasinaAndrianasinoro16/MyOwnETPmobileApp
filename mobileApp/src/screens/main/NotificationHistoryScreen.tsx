// src/screens/main/NotificationsHistoryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect } from '@react-navigation/native';

const NotificationsHistoryScreen: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [filter])
    );

    const loadNotifications = async () => {
        try {
            setIsLoading(true);
            const allNotifications = await AuthService.getNotifications();

            let filteredNotifications = allNotifications;

            if (filter === 'unread') {
                filteredNotifications = allNotifications.filter(notif => !notif.read);
            } else if (filter === 'read') {
                filteredNotifications = allNotifications.filter(notif => notif.read);
            }

            // Trier par date (plus récent en premier)
            filteredNotifications.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setNotifications(filteredNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
            Alert.alert('Erreur', 'Impossible de charger l\'historique');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await AuthService.markNotificationAsRead(notificationId);
            await loadNotifications();
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de marquer comme lu');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            // Récupérer toutes les notifications non lues
            const notifications = await AuthService.getNotifications();
            const unreadNotifications = notifications.filter(notif => !notif.read);

            if (unreadNotifications.length === 0) {
                Alert.alert('Information', 'Toutes les notifications sont déjà lues');
                return;
            }

            // Marquer chaque notification non lue comme lue
            for (const notification of unreadNotifications) {
                await AuthService.markNotificationAsRead(notification.id);
            }

            // Recharger la liste
            await loadNotifications();

            // Message de succès
            Alert.alert('Succès', `${unreadNotifications.length} notification(s) marquée(s) comme lue(s)`);
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
        }
    };

    const handleClearOld = async () => {
        Alert.alert(
            'Nettoyer l\'historique',
            'Supprimer les notifications de plus de 30 jours ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Nettoyer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AuthService.clearOldNotifications(30);
                            await loadNotifications();
                            Alert.alert('Succès', 'Notifications anciennes supprimées');
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de nettoyer l\'historique');
                        }
                    },
                },
            ]
        );
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'favorite_reminder':
                return 'star';
            case 'report_sent':
                return 'document-text';
            case 'activity_completed':
                return 'checkmark-circle';
            case 'system':
                return 'information-circle';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'favorite_reminder':
                return '#fbbf24';
            case 'report_sent':
                return '#3b82f6';
            case 'activity_completed':
                return '#10b981';
            case 'system':
                return '#8b5cf6';
            default:
                return '#6366f1';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } else if (diffDays === 1) {
            return `Hier à ${date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } else if (diffDays < 7) {
            return `${diffDays} jours`;
        } else {
            return date.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    };

    const renderNotificationItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.notificationCard,
                !item.read && styles.unreadNotification,
            ]}
            onPress={() => handleMarkAsRead(item.id)}
            activeOpacity={0.7}>
            <View style={styles.notificationHeader}>
                <View style={[
                    styles.notificationIconContainer,
                    { backgroundColor: `${getNotificationColor(item.type)}20` }
                ]}>
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={20}
                        color={getNotificationColor(item.type)}
                    />
                </View>

                <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.notificationDate}>
                        {formatDate(item.date)}
                    </Text>
                </View>

                {!item.read && (
                    <View style={styles.unreadBadge}>
                        <View style={styles.unreadDot} />
                    </View>
                )}
            </View>

            <Text style={styles.notificationMessage} numberOfLines={3}>
                {item.message}
            </Text>

            <View style={styles.notificationMeta}>
                <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color="#64748b" />
                    <Text style={styles.metaText}>
                        {new Date(item.date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>

                <View style={styles.metaItem}>
                    <Ionicons name="information-circle-outline" size={12} color="#64748b" />
                    <Text style={styles.metaText}>
                        {item.type === 'favorite_reminder' ? 'Rappel' :
                            item.type === 'report_sent' ? 'Rapport' :
                                item.type === 'activity_completed' ? 'Activité' : 'Système'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Chargement des notifications...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header avec filtres */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Historique des notifications</Text>
                    <Text style={styles.subtitle}>
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Filtres */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'all' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilter('all')}>
                    <Text style={[
                        styles.filterText,
                        filter === 'all' && styles.filterTextActive,
                    ]}>
                        Toutes
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'unread' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilter('unread')}>
                    <View style={styles.filterBadge}>
                        <Ionicons name="mail-unread" size={14} color={filter === 'unread' ? '#fff' : '#6366f1'} />
                        <Text style={[
                            styles.filterText,
                            filter === 'unread' && styles.filterTextActive,
                        ]}>
                            Non lues
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        filter === 'read' && styles.filterButtonActive,
                    ]}
                    onPress={() => setFilter('read')}>
                    <Text style={[
                        styles.filterText,
                        filter === 'read' && styles.filterTextActive,
                    ]}>
                        Lues
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Actions globales */}
            <View style={styles.globalActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleMarkAllAsRead}
                    disabled={notifications.filter(n => !n.read).length === 0}>
                    <Ionicons name="checkmark-done" size={20} color="#6366f1" />
                    <Text style={styles.actionButtonText}>Tout marquer comme lu</Text>
                </TouchableOpacity>
            </View>

            {/* Liste des notifications */}
            {notifications.length > 0 ? (
                <FlatList
                    data={notifications}
                    renderItem={renderNotificationItem}
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
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>
                        {filter === 'all'
                            ? 'Aucune notification'
                            : filter === 'unread'
                                ? 'Aucune notification non lue'
                                : 'Aucune notification lue'}
                    </Text>
                    <Text style={styles.emptyDescription}>
                        {filter === 'all'
                            ? 'Vous n\'avez pas encore reçu de notifications'
                            : filter === 'unread'
                                ? 'Toutes vos notifications sont lues'
                                : 'Vous n\'avez pas de notifications lues'}
                    </Text>

                    {filter !== 'all' && (
                        <TouchableOpacity
                            style={styles.showAllButton}
                            onPress={() => setFilter('all')}>
                            <Text style={styles.showAllButtonText}>
                                Voir toutes les notifications
                            </Text>
                        </TouchableOpacity>
                    )}
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
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    filterBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    globalActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    actionButtonText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
        paddingBottom: 32,
    },
    notificationCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    unreadNotification: {
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    notificationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationInfo: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 4,
    },
    notificationDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    unreadBadge: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6366f1',
    },
    notificationMessage: {
        fontSize: 14,
        color: '#cbd5e1',
        lineHeight: 20,
        marginBottom: 12,
    },
    notificationMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: '#64748b',
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
    showAllButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    showAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default NotificationsHistoryScreen;