// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================
// CONFIGURATION DU GESTIONNAIRE
// =============================================
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// =============================================
// CONSTANTES
// =============================================
const NOTIFICATION_STORAGE_KEY = '@notification_ids';
const LAST_CHECK_KEY = '@last_notification_check';
const REMINDERS_ENABLED_KEY = '@reminders_enabled';
const REMINDERS_INTERVAL_KEY = '@reminders_interval';
const EXPO_PUSH_TOKEN_KEY = '@expo_push_token';

// ⚠️ IMPORTANT : Remplacer par l'URL de votre backend déployé
// En développement local : 'http://10.X.X.X:4000'
// En production : 'https://votre-backend.railway.app'
import { API_URL } from '../constants/config';

// =============================================
// SERVICE NOTIFICATIONS
// =============================================
export const NotificationService = {

    // ========== INITIALISATION ==========
    initialize: async (): Promise<boolean> => {
        try {
            console.log('🔔 Initialisation notifications...');

            // Canal Android
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

            // Permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Permissions refusées');
                return false;
            }

            console.log('✅ Permissions accordées');

            // Récupérer et enregistrer le Push Token
            await NotificationService.registerPushToken();

            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            return false;
        }
    },

    // ========== ENREGISTREMENT DU PUSH TOKEN ==========
    registerPushToken: async (): Promise<string | null> => {
        try {
            // Les push tokens ne fonctionnent que sur un vrai device
            if (!Device.isDevice) {
                console.log('⚠️ Push tokens non disponibles sur simulateur');
                return null;
            }

            // Récupérer le token Expo
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: '19b66f4f-47c8-42b8-902c-c1f0444013d7', // depuis app.json extra.eas.projectId
            });

            const token = tokenData.data;
            console.log('🔑 Expo Push Token:', token);

            // Sauvegarder localement
            await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);

            // Envoyer au backend pour l'enregistrer
            await NotificationService.sendTokenToBackend(token);

            return token;
        } catch (error) {
            console.error('❌ Erreur récupération push token:', error);
            return null;
        }
    },

    // ========== ENVOYER LE TOKEN AU BACKEND ==========
    sendTokenToBackend: async (token: string): Promise<void> => {
        try {
            // Récupérer l'utilisateur connecté pour l'associer au token
            const userStr = await AsyncStorage.getItem('@bfm_user');
            if (!userStr) {
                console.log('⚠️ Aucun utilisateur connecté, token non envoyé au backend');
                return;
            }

            const user = JSON.parse(userStr);
            const userId = user.Num_matricule || user.id || user.email;

            const response = await fetch(`${API_URL}/register-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, expoPushToken: token }),
            });

            if (response.ok) {
                console.log(`✅ Token envoyé au backend pour userId: ${userId}`);
            } else {
                const err = await response.text();
                console.warn('⚠️ Backend token registration failed:', err);
            }
        } catch (error) {
            console.warn('⚠️ Impossible d\'envoyer le token au backend (offline?):', error);
            // Ne pas bloquer l'app si le backend est indisponible
        }
    },

    // ========== RE-SYNCHRONISER LE TOKEN APRÈS CONNEXION ==========
    syncPushTokenAfterLogin: async (): Promise<void> => {
        try {
            const savedToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
            if (savedToken) {
                await NotificationService.sendTokenToBackend(savedToken);
            } else {
                await NotificationService.registerPushToken();
            }
        } catch (error) {
            console.warn('⚠️ Erreur sync token:', error);
        }
    },

    // ========== DÉSENREGISTRER LE TOKEN (DÉCONNEXION) ==========
    unregisterPushToken: async (): Promise<void> => {
        try {
            const userStr = await AsyncStorage.getItem('@bfm_user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const userId = user.Num_matricule || user.id || user.email;

            await fetch(`${API_URL}/unregister-token/${userId}`, {
                method: 'DELETE',
            });

            await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
            console.log('✅ Token désenregistré');
        } catch (error) {
            console.warn('⚠️ Erreur désenregistrement token:', error);
        }
    },

    // ========== NOTIFICATION IMMÉDIATE (locale) ==========
    sendImmediateNotification: async (
        title: string,
        body: string,
        data?: object
    ): Promise<string> => {
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                    data: data || {},
                    ...(Platform.OS === 'android' && {
                        channelId: 'default',
                        color: '#3f51b5',
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    }),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: 1,
                    repeats: false,
                },
            });

            console.log(`✅ Notification immédiate envoyée: ${notificationId}`);
            return notificationId;
        } catch (error) {
            console.error('❌ Erreur notification immédiate:', error);
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
            const favoritesStr = await AsyncStorage.getItem('@bfm_favorites');
            const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];

            if (favorites.length === 0) {
                return { hasUncompleted: false, taskCount: 0, message: 'Aucune tâche favorite', tasks: [] };
            }

            const historyStr = await AsyncStorage.getItem('@bfm_history');
            const history = historyStr ? JSON.parse(historyStr) : [];
            const today = new Date().toISOString().split('T')[0];

            const todayActivities = history.filter((log: any) =>
                log.Date_activite && log.Date_activite.startsWith(today)
            );

            const uncompletedTasks = favorites.filter((fav: any) =>
                !todayActivities.some((log: any) => log.Id_activite === fav.activityId)
            );

            if (uncompletedTasks.length > 0) {
                return {
                    hasUncompleted: true,
                    taskCount: uncompletedTasks.length,
                    message: `${uncompletedTasks.length} tâche(s) non complétée(s)`,
                    tasks: uncompletedTasks,
                };
            }

            return { hasUncompleted: false, taskCount: 0, message: 'Toutes les tâches sont complétées', tasks: [] };
        } catch (error) {
            console.error('❌ Erreur vérification tâches:', error);
            return { hasUncompleted: false, taskCount: 0, message: 'Erreur de vérification', tasks: [] };
        }
    },

    // ========== ENVOYER UN RAPPEL LOCAL ==========
    sendTaskReminder: async (): Promise<boolean> => {
        try {
            const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
            if (enabledStr === 'false') return false;

            // Anti-spam : pas plus d'un rappel toutes les 10 minutes
            const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY);
            if (lastCheckStr) {
                const minutesSince = (Date.now() - parseInt(lastCheckStr)) / 60000;
                if (minutesSince < 10) return false;
            }

            const { hasUncompleted, taskCount } = await NotificationService.checkUncompletedTasks();
            if (!hasUncompleted) return false;

            await NotificationService.sendImmediateNotification(
                '📋 Rappel des tâches',
                `Vous avez ${taskCount} tâche(s) à compléter aujourd'hui. Appuyez pour les terminer.`,
                { type: 'task_reminder', screen: 'CompleteTasks', redirectTo: 'CompleteTasks', action: 'navigate_to_tasks' }
            );

            await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
            return true;
        } catch (error) {
            console.error('❌ Erreur rappel:', error);
            return false;
        }
    },

    // ========== RAPPELS PÉRIODIQUES PROGRAMMÉS ==========
    schedulePeriodicReminders: async (intervalMinutes: number = 30): Promise<void> => {
        try {
            console.log(`⏰ Programmation rappels toutes les ${intervalMinutes} minutes...`);

            await NotificationService.cancelAllScheduledNotifications();

            const favoritesStr = await AsyncStorage.getItem('@bfm_favorites');
            const favorites = favoritesStr ? JSON.parse(favoritesStr) : [];
            if (favorites.length === 0) return;

            const notificationIds: string[] = [];
            const hoursToSchedule = 8;
            const remindersCount = Math.min(Math.floor((hoursToSchedule * 60) / intervalMinutes), 20); // max 20

            for (let i = 1; i <= remindersCount; i++) {
                const triggerSeconds = i * intervalMinutes * 60;
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '📋 Rappel de tâches',
                        body: "N'oubliez pas de compléter vos tâches favorites aujourd'hui !",
                        sound: true,
                        data: { type: 'task_reminder', screen: 'CompleteTasks', redirectTo: 'CompleteTasks', action: 'navigate_to_tasks' },
                        ...(Platform.OS === 'android' && { channelId: 'default', color: '#3f51b5' }),
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                        seconds: triggerSeconds,
                        repeats: false,
                    },
                });
                notificationIds.push(id);
            }

            await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationIds));
            await AsyncStorage.setItem(REMINDERS_INTERVAL_KEY, intervalMinutes.toString());
            console.log(`✅ ${notificationIds.length} rappels programmés`);
        } catch (error) {
            console.error('❌ Erreur programmation rappels:', error);
        }
    },

    scheduleAutomaticReminders: async (): Promise<void> => {
        const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
        if (enabledStr === 'false') return;

        const intervalStr = await AsyncStorage.getItem(REMINDERS_INTERVAL_KEY);
        const interval = intervalStr ? parseInt(intervalStr) : 30;
        await NotificationService.schedulePeriodicReminders(interval);
    },

    enableReminders: async (intervalMinutes: number = 30): Promise<void> => {
        const initialized = await NotificationService.initialize();
        if (!initialized) throw new Error("Impossible d'initialiser les notifications");

        await NotificationService.sendTaskReminder();
        await NotificationService.schedulePeriodicReminders(intervalMinutes);
        await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, 'true');
        await AsyncStorage.setItem(REMINDERS_INTERVAL_KEY, intervalMinutes.toString());
    },

    disableReminders: async (): Promise<void> => {
        await NotificationService.cancelAllScheduledNotifications();
        await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, 'false');
    },

    cancelAllScheduledNotifications: async (): Promise<void> => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
        await AsyncStorage.removeItem(LAST_CHECK_KEY);
    },

    getScheduledNotifications: async (): Promise<Notifications.NotificationRequest[]> => {
        return await Notifications.getAllScheduledNotificationsAsync();
    },

    getRemindersStatus: async (): Promise<{ enabled: boolean; interval: number; scheduledCount: number }> => {
        const enabledStr = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
        const intervalStr = await AsyncStorage.getItem(REMINDERS_INTERVAL_KEY);
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        return {
            enabled: enabledStr !== 'false',
            interval: intervalStr ? parseInt(intervalStr) : 30,
            scheduledCount: scheduled.length,
        };
    },

    // ========== ÉCOUTEUR DE NOTIFICATIONS ==========
    setupNotificationListener: (navigation: any): (() => void) => {
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as any;
            const redirectTo = data?.redirectTo || data?.screen;

            if (redirectTo === 'CompleteTasks' || data?.action === 'navigate_to_tasks') {
                setTimeout(() => navigation.navigate('CompleteTasks'), 100);
            }
        });

        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('📱 Notification reçue:', notification.request.content.title);
        });

        return () => {
            responseSubscription.remove();
            receivedSubscription.remove();
        };
    },

    startAutoCheck: async (): Promise<void> => {
        await NotificationService.sendTaskReminder();
        setInterval(async () => {
            await NotificationService.sendTaskReminder();
        }, 30 * 60 * 1000);
    },
};