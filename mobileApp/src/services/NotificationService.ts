// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration du gestionnaire de notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const NOTIFICATION_STORAGE_KEY = '@notification_ids';
const LAST_CHECK_KEY = '@last_notification_check';
const REMINDERS_ENABLED_KEY = '@reminders_enabled';
const REMINDERS_INTERVAL_KEY = '@reminders_interval';

export const NotificationService = {
    // ========== INITIALISATION ==========
    initialize: async (): Promise<boolean> => {
        try {
            console.log('🔔 Initialisation notifications...');

            // Configuration Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Rappels de tâches',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                    sound: 'default',
                    enableVibrate: true,
                    showBadge: true,
                });
                console.log('✅ Canal Android configuré');
            }

            // Demander les permissions
            const { status } = await Notifications.requestPermissionsAsync();

            if (status !== 'granted') {
                console.log('❌ Permissions refusées');
                return false;
            }

            console.log('✅ Permissions accordées');
            return true;

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            return false;
        }
    },

    // ========== NOTIFICATION IMMÉDIATE ==========
    sendImmediateNotification: async (
        title: string,
        body: string,
        data?: any
    ): Promise<string> => {
        try {
            console.log('📤 Envoi notification:', title);

            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: {
                        ...data,
                        type: data?.type || 'general',
                        screen: 'CompleteTasks',
                        redirectTo: 'CompleteTasks',
                        timestamp: Date.now(),
                    },
                    ...(Platform.OS === 'android' && {
                        channelId: 'default',
                        color: '#3f51b5',
                        autoCancel: true,
                    }),
                },
                trigger: null,
            });

            console.log(`✅ Notification envoyée: ${notificationId}`);
            return notificationId;
        } catch (error) {
            console.error('❌ Erreur envoi notification:', error);
            throw error;
        }
    },

    // ========== VÉRIFIER LES TÂCHES NON COMPLÉTÉES ==========
    checkUncompletedTasks: async (): Promise<{
        hasUncompleted: boolean;
        taskCount: number;
        message: string;
        tasks: any[];
    }> => {
        try {
            console.log('🔍 Vérification des tâches non complétées...');

            // Récupérer les favoris
            const favoritesStr = await AsyncStorage.getItem('@bfm_favorites');
            const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];

            console.log(`📋 Favoris trouvés: ${favorites.length}`);

            if (favorites.length === 0) {
                return {
                    hasUncompleted: false,
                    taskCount: 0,
                    message: 'Aucune tâche favorite',
                    tasks: []
                };
            }

            // Récupérer l'historique d'aujourd'hui
            const historyStr = await AsyncStorage.getItem('@bfm_history');
            const history = historyStr ? JSON.parse(historyStr) : [];
            const today = new Date().toISOString().split('T')[0];

            console.log(`📅 Date du jour: ${today}`);
            console.log(`📜 Historique total: ${history.length}`);

            const todayActivities = history.filter((log: any) =>
                log.Date_activite && log.Date_activite.startsWith(today)
            );

            console.log(`✅ Activités d'aujourd'hui: ${todayActivities.length}`);

            // Vérifier quelles tâches ne sont pas complétées aujourd'hui
            const uncompletedTasks = favorites.filter((fav: any) => {
                const isCompleted = todayActivities.some((log: any) =>
                    log.Id_activite === fav.activityId
                );
                return !isCompleted;
            });

            console.log(`❌ Tâches non complétées: ${uncompletedTasks.length}`);

            if (uncompletedTasks.length > 0) {
                return {
                    hasUncompleted: true,
                    taskCount: uncompletedTasks.length,
                    message: `${uncompletedTasks.length} tâche(s) non complétée(s)`,
                    tasks: uncompletedTasks
                };
            }

            return {
                hasUncompleted: false,
                taskCount: 0,
                message: 'Toutes les tâches sont complétées',
                tasks: []
            };

        } catch (error) {
            console.error('❌ Erreur vérification tâches:', error);
            return {
                hasUncompleted: false,
                taskCount: 0,
                message: 'Erreur de vérification',
                tasks: []
            };
        }
    },

    // ========== ENVOYER UN RAPPEL DE TÂCHES (UNIQUEMENT POUR TÂCHES NON COMPLÉTÉES) ==========
    sendTaskReminder: async (): Promise<boolean> => {
        try {
            console.log('📋 Vérification des tâches à rappeler...');

            // Vérifier si les rappels sont activés
            const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
            const remindersEnabled = enabledStr !== 'false'; // true par défaut

            if (!remindersEnabled) {
                console.log('🔕 Rappels désactivés dans les paramètres');
                return false;
            }

            // Vérifier si on a déjà envoyé un rappel récemment (moins de 10 minutes)
            const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY);
            if (lastCheckStr) {
                const lastCheck = parseInt(lastCheckStr);
                const now = Date.now();
                const timeSinceLastCheck = now - lastCheck;
                const minutesSinceLastCheck = timeSinceLastCheck / (1000 * 60);

                if (minutesSinceLastCheck < 10) {
                    console.log(`⏰ Dernier rappel il y a ${minutesSinceLastCheck.toFixed(1)} minutes`);
                    return false;
                }
            }

            // Vérifier les tâches non complétées
            const { hasUncompleted, taskCount, message, tasks } =
                await NotificationService.checkUncompletedTasks();

            console.log(`📊 Résultat vérification: ${message}`);

            if (!hasUncompleted || taskCount === 0) {
                console.log('✅ Aucun rappel nécessaire');
                return false;
            }

            // Envoyer la notification de rappel
            await NotificationService.sendImmediateNotification(
                '📋 Rappel des tâches',
                `Vous avez ${taskCount} tâche(s) favorite(s) à compléter aujourd'hui. Cliquez pour les terminer.`,
                {
                    type: 'task_reminder',
                    screen: 'CompleteTasks',
                    taskCount: taskCount,
                    redirectTo: 'CompleteTasks',
                    action: 'navigate_to_tasks'
                }
            );

            // Sauvegarder l'heure du dernier check
            await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

            console.log(`✅ Rappel envoyé pour ${taskCount} tâche(s) non complétées`);
            return true;

        } catch (error) {
            console.error('❌ Erreur envoi rappel:', error);
            return false;
        }
    },

    // ========== PROGRAMMER LES RAPPELS PÉRIODIQUES ==========
    schedulePeriodicReminders: async (intervalMinutes: number = 30): Promise<void> => {
        try {
            console.log(`⏰ Programmation des rappels toutes les ${intervalMinutes} minutes...`);

            // Annuler les notifications existantes
            await NotificationService.cancelAllScheduledNotifications();

            // Vérifier qu'il y a des tâches favorites
            const favoritesStr = await AsyncStorage.getItem('@bfm_favorites');
            const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];

            if (favorites.length === 0) {
                console.log('⚠️ Aucune tâche favorite, pas de rappels programmés');
                return;
            }

            // Programmer plusieurs notifications pour les prochaines heures
            const notificationIds: string[] = [];
            const hoursToSchedule = 8; // Programmer pour les 8 prochaines heures
            const remindersCount = Math.floor((hoursToSchedule * 60) / intervalMinutes);

            for (let i = 1; i <= remindersCount; i++) {
                const triggerTime = i * intervalMinutes * 60; // en secondes

                const notificationId = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '📋 Rappel de tâches',
                        body: 'N\'oubliez pas de compléter vos tâches favorites aujourd\'hui !',
                        sound: true,
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                        data: {
                            type: 'task_reminder',
                            screen: 'CompleteTasks',
                            redirectTo: 'CompleteTasks',
                            action: 'navigate_to_tasks',
                            scheduled: true,
                            scheduleNumber: i
                        },
                        ...(Platform.OS === 'android' && {
                            channelId: 'default',
                            color: '#3f51b5',
                        }),
                    },
                    trigger: {
                        seconds: triggerTime,
                    },
                });

                notificationIds.push(notificationId);
                console.log(`✅ Rappel #${i} programmé pour dans ${triggerTime / 60} minutes`);
            }

            // Sauvegarder les IDs des notifications programmées
            await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationIds));

            // Sauvegarder l'intervalle
            await AsyncStorage.setItem(REMINDERS_INTERVAL_KEY, intervalMinutes.toString());

            console.log(`✅ ${notificationIds.length} rappels programmés avec succès`);

        } catch (error) {
            console.error('❌ Erreur programmation rappels:', error);
            throw error;
        }
    },

    // ========== ACTIVER/DÉSACTIVER LES RAPPELS ==========
    enableReminders: async (intervalMinutes: number = 30): Promise<void> => {
        try {
            console.log('🔔 Activation des rappels...');

            // Initialiser les notifications si nécessaire
            const initialized = await NotificationService.initialize();
            if (!initialized) {
                throw new Error('Impossible d\'initialiser les notifications');
            }

            // Vérifier immédiatement les tâches
            await NotificationService.sendTaskReminder();

            // Programmer les rappels périodiques
            await NotificationService.schedulePeriodicReminders(intervalMinutes);

            // Sauvegarder l'état d'activation
            await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, 'true');
            await AsyncStorage.setItem(REMINDERS_INTERVAL_KEY, intervalMinutes.toString());

            console.log('✅ Rappels activés');
        } catch (error) {
            console.error('❌ Erreur activation rappels:', error);
            throw error;
        }
    },

    disableReminders: async (): Promise<void> => {
        try {
            console.log('🔕 Désactivation des rappels...');

            await NotificationService.cancelAllScheduledNotifications();
            await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, 'false');

            console.log('✅ Rappels désactivés');
        } catch (error) {
            console.error('❌ Erreur désactivation rappels:', error);
            throw error;
        }
    },

    // ========== ANNULER LES NOTIFICATIONS PROGRAMMÉES ==========
    cancelAllScheduledNotifications: async (): Promise<void> => {
        try {
            // Récupérer les IDs sauvegardés
            const idsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
            const ids = idsStr ? JSON.parse(idsStr) : [];

            // Annuler toutes les notifications programmées
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Supprimer les IDs sauvegardés
            await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);

            console.log(`🧹 ${ids.length} notifications programmées annulées`);
        } catch (error) {
            console.error('❌ Erreur annulation notifications:', error);
        }
    },

    // ========== ÉCOUTEUR DE NOTIFICATIONS ==========
    setupNotificationListener: (navigation: any): (() => void) => {
        console.log('👂 Configuration écouteur notifications...');

        // Écouter quand on clique sur une notification
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('🎯 Notification cliquée !');

            const data = response.notification.request.content.data;
            console.log('📱 Données notification:', data);

            // Extraire l'action de redirection
            const redirectTo = data?.redirectTo || data?.screen;
            console.log('🔍 Redirection vers:', redirectTo);

            // Naviguer selon le type de notification
            if (redirectTo === 'CompleteTasks' || data?.action === 'navigate_to_tasks') {
                console.log('➡️ Navigation vers CompleteTasks...');
                setTimeout(() => {
                    navigation.navigate('CompleteTasks');
                }, 100);
            }
        });

        // Écouter quand on reçoit une notification
        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('📱 Notification reçue:', notification.request.content.title);
        });

        // Retourner la fonction de nettoyage
        return () => {
            console.log('🧹 Nettoyage écouteur notifications');
            responseSubscription.remove();
            receivedSubscription.remove();
        };
    },

    // ========== VÉRIFIER L'ÉTAT DES RAPPELS ==========
    getRemindersStatus: async (): Promise<{
        enabled: boolean;
        interval: number;
        scheduledCount: number;
    }> => {
        try {
            const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
            const intervalStr = await AsyncStorage.getItem(REMINDERS_INTERVAL_KEY);

            const enabled = enabledStr !== 'false'; // true par défaut
            const interval = intervalStr ? parseInt(intervalStr) : 30;

            // Vérifier les notifications réellement programmées
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();

            return {
                enabled,
                interval,
                scheduledCount: scheduled.length
            };
        } catch (error) {
            console.error('❌ Erreur vérification status:', error);
            return { enabled: true, interval: 30, scheduledCount: 0 }; // Par défaut activé
        }
    },

    // ========== UTILITAIRES ==========
    cancelAllNotifications: async (): Promise<void> => {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
            await AsyncStorage.removeItem(LAST_CHECK_KEY);
            console.log('🧹 Toutes les notifications annulées');
        } catch (error) {
            console.error('❌ Erreur annulation:', error);
        }
    },

    // ========== OBTENIR LES NOTIFICATIONS PROGRAMMÉES ==========
    getScheduledNotifications: async (): Promise<Notifications.NotificationRequest[]> => {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            console.log(`📊 ${scheduled.length} notifications programmées`);
            return scheduled;
        } catch (error) {
            console.error('❌ Erreur récupération notifications:', error);
            return [];
        }
    },

    // ========== VÉRIFICATION AUTOMATIQUE ==========
    startAutoCheck: async (): Promise<void> => {
        console.log('🔄 Démarrage de la vérification automatique...');

        // Vérifier immédiatement
        await NotificationService.sendTaskReminder();

        // Vérifier toutes les 30 minutes
        setInterval(async () => {
            console.log('⏰ Vérification automatique des tâches...');
            await NotificationService.sendTaskReminder();
        }, 30 * 60 * 1000); // 30 minutes
    },

    // ========== PLANIFIER LES RAPPELS AUTOMATIQUES ==========
    scheduleAutomaticReminders: async (): Promise<void> => {
        try {
            console.log('📅 Planification des rappels automatiques...');

            // Vérifier si les rappels sont activés
            const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
            const remindersEnabled = enabledStr !== 'false';

            if (!remindersEnabled) {
                console.log('🔕 Rappels désactivés, pas de planification');
                return;
            }

            // Récupérer l'intervalle configuré
            const intervalStr = await AsyncStorage.getItem(REMINDERS_INTERVAL_KEY);
            const interval = intervalStr ? parseInt(intervalStr) : 30;

            // Programmer les rappels
            await NotificationService.schedulePeriodicReminders(interval);

            console.log(`✅ Rappels automatiques planifiés toutes les ${interval} minutes`);
        } catch (error) {
            console.error('❌ Erreur planification automatique:', error);
        }
    },

    // ========== TEST DU SYSTÈME DE NOTIFICATION ==========
    testNotificationSystem: async (): Promise<void> => {
        try {
            console.log('🧪 Test du système de notification...');

            // Envoyer une notification de test
            await NotificationService.sendImmediateNotification(
                '🧪 Test de notification',
                'Ceci est un test du système de notification. Si vous voyez ce message, tout fonctionne correctement.',
                {
                    type: 'test',
                    screen: 'Home',
                    timestamp: Date.now()
                }
            );

            console.log('✅ Test de notification envoyé avec succès');
        } catch (error) {
            console.error('❌ Erreur lors du test:', error);
        }
    }
};