// src/services/AuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataService } from './DataService';
import { Employe, Settings, FavoriteActivity, LogActivite, NotificationHistory } from '../types';

const STORAGE_KEYS = {
    USER: '@bfm_user',
    PIN_PREFIX: '@bfm_pin_',
    SETTINGS: '@bfm_settings',
    FAVORITES: '@bfm_favorites',
    HISTORY: '@bfm_history',
    NOTIFICATIONS: '@bfm_notifications',
    MARCH8_CHOICE: '@bfm_march8_choice',
};

export const AuthService = {
    // Vérifier si un employé existe
    verifyEmployee: (matricule: string, cin: string) => {
        return dataService.verifyEmployeeCredentials(matricule, cin);
    },

    // Créer un compte avec PIN
    createAccount: async (matricule: string, cin: string, pin: string): Promise<Employe> => {
        const employee = dataService.verifyEmployeeCredentials(matricule, cin);
        if (!employee) {
            throw new Error('Matricule ou CIN incorrect');
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            throw new Error('Le PIN doit être composé de 4 chiffres');
        }

        // Vérifier si un compte existe déjà
        const existingPin = await AuthService.getPin(matricule);
        if (existingPin) {
            throw new Error('Un compte existe déjà pour ce matricule');
        }

        const user: Employe = {
            ...employee,
            Pin: pin,
        };

        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        await AsyncStorage.setItem(`${STORAGE_KEYS.PIN_PREFIX}${matricule}`, pin);

        return user;
    },

    // Connexion avec PIN
    login: async (matricule: string, pin: string): Promise<Employe> => {
        const storedPin = await AuthService.getPin(matricule);

        if (!storedPin || storedPin !== pin) {
            throw new Error('PIN incorrect');
        }

        const employee = dataService.findEmployeeByMatricule(matricule);
        if (!employee) {
            throw new Error('Employé non trouvé');
        }

        const user: Employe = {
            ...employee,
            Pin: pin,
        };

        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
    },

    // Changer PIN
    changePin: async (matricule: string, oldPin: string, newPin: string): Promise<void> => {
        const storedPin = await AuthService.getPin(matricule);

        if (!storedPin || storedPin !== oldPin) {
            throw new Error('Ancien PIN incorrect');
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            throw new Error('Le PIN doit être composé de 4 chiffres');
        }

        await AsyncStorage.setItem(`${STORAGE_KEYS.PIN_PREFIX}${matricule}`, newPin);

        // Mettre à jour le PIN dans les données utilisateur
        const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (userStr) {
            const user = JSON.parse(userStr);
            user.Pin = newPin;
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
    },

    // Récupérer le PIN
    getPin: async (matricule: string): Promise<string | null> => {
        return await AsyncStorage.getItem(`${STORAGE_KEYS.PIN_PREFIX}${matricule}`);
    },

    // Vérifier si un PIN existe
    pinExists: async (matricule: string): Promise<boolean> => {
        const pin = await AuthService.getPin(matricule);
        return pin !== null;
    },

    // Gestion des favoris
    addFavorite: async (activityId: string): Promise<void> => {
        const favorites = await AuthService.getFavorites();
        const existing = favorites.find(fav => fav.activityId === activityId);

        if (!existing) {
            favorites.push({
                id: Date.now().toString(),
                activityId,
                addedAt: new Date().toISOString(),
            });
            await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        }
    },

    removeFavorite: async (activityId: string): Promise<void> => {
        const favorites = await AuthService.getFavorites();
        const updated = favorites.filter(fav => fav.activityId !== activityId);
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    },

    getFavorites: async (): Promise<FavoriteActivity[]> => {
        const favorites = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
        return favorites ? JSON.parse(favorites) : [];
    },

    isFavorite: async (activityId: string): Promise<boolean> => {
        const favorites = await AuthService.getFavorites();
        return favorites.some(fav => fav.activityId === activityId);
    },

    // Historique des activités
    addToHistory: async (log: Omit<LogActivite, 'Id_logs'>): Promise<void> => {
        const history = await AuthService.getHistory();
        const newLog: LogActivite = {
            ...log,
            Id_logs: Date.now(),
        };
        history.push(newLog);
        await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    },

    getHistory: async (): Promise<LogActivite[]> => {
        const history = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
        return history ? JSON.parse(history) : [];
    },

    getHistoryByDate: async (date: string): Promise<LogActivite[]> => {
        const history = await AuthService.getHistory();
        return history.filter(log => log.Date_activite.startsWith(date));
    },

    // Paramètres
    saveSettings: async (settings: Partial<Settings>): Promise<void> => {
        const currentSettings = await AuthService.getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    },

    getSettings: async (): Promise<Settings> => {
        const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        return settings
            ? JSON.parse(settings)
            : {
                notificationFrequency: 15,
                notificationsEnabled: true,
                direction: '',
                departement: '',
                service: '',
            };
    },

    // Notifications
    addNotification: async (notification: Omit<NotificationHistory, 'id'>): Promise<void> => {
        const notifications = await AuthService.getNotifications();
        const newNotification: NotificationHistory = {
            ...notification,
            id: Date.now().toString(),
        };
        notifications.push(newNotification);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    },

    getNotifications: async (): Promise<NotificationHistory[]> => {
        const notifications = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        return notifications ? JSON.parse(notifications) : [];
    },

    markNotificationAsRead: async (notificationId: string): Promise<void> => {
        const notifications = await AuthService.getNotifications();
        const updated = notifications.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
        );
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    },

    // 8 Mars
    saveMarch8Choice: async (wantsToWork: boolean): Promise<void> => {
        await AsyncStorage.setItem(STORAGE_KEYS.MARCH8_CHOICE, JSON.stringify({
            year: new Date().getFullYear(),
            wantsToWork,
            choiceDate: new Date().toISOString(),
        }));
    },

    getMarch8Choice: async (): Promise<{ wantsToWork: boolean } | null> => {
        const choice = await AsyncStorage.getItem(STORAGE_KEYS.MARCH8_CHOICE);
        if (!choice) return null;

        const data = JSON.parse(choice);
        // Vérifier si le choix est pour l'année en cours
        if (data.year === new Date().getFullYear()) {
            return { wantsToWork: data.wantsToWork };
        }
        return null;
    },

    // Déconnexion
    logout: async (): Promise<void> => {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    },

    // Récupérer l'utilisateur connecté
    getCurrentUser: async (): Promise<Employe | null> => {
        const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },
};