// src/services/AsyncStorageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Employe, Activite, LogActivite, Settings, UserData, FavoriteActivity, NotificationHistory } from '../types';
import { AppEmployee, AppActivity } from '../types/excelData';

const KEYS = {
    // Authentification
    USER_DATA: '@user_data',
    USER_PIN: '@user_pin_', // + matricule

    // Données applicatives
    EMPLOYEES: '@employees',
    ACTIVITIES: '@activities',
    LOGS: '@logs',
    SETTINGS: '@settings',
    FAVORITES: '@favorites',
    NOTIFICATIONS: '@notifications_history',

    // Préférences
    MARCH8_CHOICE: '@march8_choice',
    FIRST_LAUNCH: '@first_launch',

    // Cache
    LAST_SYNC: '@last_sync',
    CACHE_PREFIX: '@cache_',
};

// ========== USER & AUTH ==========
export const saveUserData = async (userData: UserData): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
        console.error('Error saving user data:', error);
        throw error;
    }
};

export const getUserData = async (): Promise<UserData | null> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

export const clearUserData = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(KEYS.USER_DATA);
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
};

// Gestion des PIN
export const saveUserPin = async (matricule: string, pin: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(`${KEYS.USER_PIN}${matricule}`, pin);
    } catch (error) {
        console.error('Error saving user PIN:', error);
        throw error;
    }
};

export const getUserPin = async (matricule: string): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(`${KEYS.USER_PIN}${matricule}`);
    } catch (error) {
        console.error('Error getting user PIN:', error);
        return null;
    }
};

export const deleteUserPin = async (matricule: string): Promise<void> => {
    try {
        await AsyncStorage.removeItem(`${KEYS.USER_PIN}${matricule}`);
    } catch (error) {
        console.error('Error deleting user PIN:', error);
    }
};

// ========== EMPLOYEES (from Excel) ==========
export const saveEmployeesFromExcel = async (employees: AppEmployee[]): Promise<void> => {
    try {
        // Convertir AppEmployee en Employe pour le stockage
        const formattedEmployees: Employe[] = employees.map(emp => ({
            Num_matricule: emp.Num_matricule,
            Nom: emp.Nom,
            Prenom: emp.Prenom,
            Sexe: emp.Sexe,
            DateNaissance: emp.DateNaissance,
            Cin: emp.Cin,
            Direction: emp.Direction,
            Service: emp.Service,
            Fonction: emp.Fonction,
            Categorie: emp.Categorie,
            Departement: emp.Departement,
            Bureau: emp.Bureau,
            Mdp: '', // Non utilisé avec PIN
            Pseudo: emp.Prenom.toLowerCase() + emp.Num_matricule,
            C_direction: emp.Direction,
            C_service: emp.Service,
            C_departement: emp.Departement,
            C_bureau: emp.Bureau,
        }));

        await AsyncStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(formattedEmployees));
    } catch (error) {
        console.error('Error saving employees:', error);
        throw error;
    }
};

export const getAllEmployees = async (): Promise<Employe[]> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.EMPLOYEES);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting employees:', error);
        return [];
    }
};

export const findEmployeByNumMatricule = async (
    numMatricule: string
): Promise<Employe | null> => {
    try {
        const employees = await getAllEmployees();
        return employees.find(e => e.Num_matricule === numMatricule) || null;
    } catch (error) {
        console.error('Error finding employee:', error);
        return null;
    }
};

export const findEmployeByCin = async (
    cin: string
): Promise<Employe | null> => {
    try {
        const employees = await getAllEmployees();
        return employees.find(e => e.Cin === cin) || null;
    } catch (error) {
        console.error('Error finding employee by CIN:', error);
        return null;
    }
};

// ========== ACTIVITIES (from Excel) ==========
export const saveActivitiesFromExcel = async (activities: AppActivity[]): Promise<void> => {
    try {
        // Convertir AppActivity en Activite
        const formattedActivities: Activite[] = activities.map(act => ({
            Id_activite: act.Id_activite,
            L_activite: act.Libelle_activite,
            C_activite: act.Code_activite,
            Id_process: act.Id_process,
            Niveau_activite: act.Niveau_activite,
            Code_process: act.Code_process,
            C_activite_mere: undefined,
            C_activite_old: undefined,
            C_activite_mere_old: undefined,
        }));

        await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(formattedActivities));
    } catch (error) {
        console.error('Error saving activities:', error);
        throw error;
    }
};

export const getAllActivities = async (): Promise<Activite[]> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.ACTIVITIES);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting activities:', error);
        return [];
    }
};

export const searchActivities = async (
    searchTerm: string
): Promise<Activite[]> => {
    try {
        const activities = await getAllActivities();
        const term = searchTerm.toLowerCase().trim();

        if (!term) return activities;

        return activities.filter(a =>
            a.L_activite.toLowerCase().includes(term) ||
            a.C_activite.toLowerCase().includes(term) ||
            a.Id_activite.toLowerCase().includes(term)
        );
    } catch (error) {
        console.error('Error searching activities:', error);
        return [];
    }
};

export const getActivityById = async (
    id: string
): Promise<Activite | null> => {
    try {
        const activities = await getAllActivities();
        return activities.find(a => a.Id_activite === id) || null;
    } catch (error) {
        console.error('Error getting activity by ID:', error);
        return null;
    }
};

// ========== LOGS ==========
export const addLog = async (log: Omit<LogActivite, 'Id_logs'>): Promise<void> => {
    try {
        const logs = await getAllLogs();
        const newLog: LogActivite = {
            ...log,
            Id_logs: Date.now(), // Génération d'un ID unique
        };
        logs.push(newLog);
        await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
    } catch (error) {
        console.error('Error adding log:', error);
        throw error;
    }
};

export const getAllLogs = async (): Promise<LogActivite[]> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.LOGS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting logs:', error);
        return [];
    }
};

export const getLogsByEmploye = async (
    numMatricule: string
): Promise<LogActivite[]> => {
    try {
        const logs = await getAllLogs();
        return logs.filter(log => log.Num_matricule === numMatricule);
    } catch (error) {
        console.error('Error getting logs by employee:', error);
        return [];
    }
};

export const getLogsByDate = async (
    date: string // format: YYYY-MM-DD
): Promise<LogActivite[]> => {
    try {
        const logs = await getAllLogs();
        return logs.filter(log => log.Date_activite.startsWith(date));
    } catch (error) {
        console.error('Error getting logs by date:', error);
        return [];
    }
};

export const getLogsByPeriod = async (
    month: number,
    year: number
): Promise<LogActivite[]> => {
    try {
        const logs = await getAllLogs();
        const periodStart = `${year}-${month.toString().padStart(2, '0')}-01`;
        const periodEnd = `${year}-${month.toString().padStart(2, '0')}-31`;

        return logs.filter(log => {
            const logDate = new Date(log.Date_activite);
            return logDate.getMonth() + 1 === month && logDate.getFullYear() === year;
        });
    } catch (error) {
        console.error('Error getting logs by period:', error);
        return [];
    }
};

export const searchLogs = async (
    numMatricule: string,
    date?: string
): Promise<LogActivite[]> => {
    try {
        const logs = await getLogsByEmploye(numMatricule);

        if (!date) return logs;

        // Filtrage par date
        return logs.filter(log => {
            const logDate = new Date(log.Date_activite);

            if (date.length === 10) {
                // Format: YYYY-MM-DD (jour)
                return log.Date_activite.startsWith(date);
            } else if (date.length === 7) {
                // Format: YYYY-MM (mois)
                return log.Date_activite.startsWith(date);
            } else if (date.length === 4) {
                // Format: YYYY (année)
                return log.Date_activite.startsWith(date);
            }

            return false;
        });
    } catch (error) {
        console.error('Error searching logs:', error);
        return [];
    }
};

// ========== SETTINGS ==========
export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
    try {
        const currentSettings = await getSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
};

export const getSettings = async (): Promise<Settings> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.SETTINGS);
        return data
            ? JSON.parse(data)
            : {
                notificationFrequency: 15,
                notificationsEnabled: true,
                direction: '',
                departement: '',
                service: '',
                reportEmail: 'sau.dti@bfm.mg',
            };
    } catch (error) {
        console.error('Error getting settings:', error);
        return {
            notificationFrequency: 15,
            notificationsEnabled: true,
            direction: '',
            departement: '',
            service: '',
            reportEmail: 'sau.dti@bfm.mg',
        };
    }
};

// ========== FAVORITES ==========
export const addFavorite = async (activityId: string): Promise<void> => {
    try {
        const favorites = await getFavorites();
        const existing = favorites.find(fav => fav.activityId === activityId);

        if (!existing) {
            favorites.push({
                id: Date.now().toString(),
                activityId,
                addedAt: new Date().toISOString(),
            });
            await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(favorites));
        }
    } catch (error) {
        console.error('Error adding favorite:', error);
        throw error;
    }
};

export const removeFavorite = async (activityId: string): Promise<void> => {
    try {
        const favorites = await getFavorites();
        const updated = favorites.filter(fav => fav.activityId !== activityId);
        await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
    } catch (error) {
        console.error('Error removing favorite:', error);
        throw error;
    }
};

export const getFavorites = async (): Promise<FavoriteActivity[]> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.FAVORITES);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting favorites:', error);
        return [];
    }
};

export const isFavorite = async (activityId: string): Promise<boolean> => {
    try {
        const favorites = await getFavorites();
        return favorites.some(fav => fav.activityId === activityId);
    } catch (error) {
        console.error('Error checking favorite:', error);
        return false;
    }
};

// ========== NOTIFICATIONS HISTORY ==========
export const addNotification = async (
    notification: Omit<NotificationHistory, 'id'>
): Promise<void> => {
    try {
        const notifications = await getNotifications();
        const newNotification: NotificationHistory = {
            ...notification,
            id: Date.now().toString(),
        };
        notifications.push(newNotification);
        await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (error) {
        console.error('Error adding notification:', error);
        throw error;
    }
};

export const getNotifications = async (): Promise<NotificationHistory[]> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting notifications:', error);
        return [];
    }
};

export const getUnreadNotifications = async (): Promise<NotificationHistory[]> => {
    try {
        const notifications = await getNotifications();
        return notifications.filter(notif => !notif.read);
    } catch (error) {
        console.error('Error getting unread notifications:', error);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
        const notifications = await getNotifications();
        const updated = notifications.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
        );
        await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    try {
        const notifications = await getNotifications();
        const updated = notifications.map(notif => ({ ...notif, read: true }));
        await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

export const clearOldNotifications = async (daysOld: number = 30): Promise<void> => {
    try {
        const notifications = await getNotifications();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const updated = notifications.filter(notif => {
            const notificationDate = new Date(notif.date);
            return notificationDate > cutoffDate;
        });

        await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
    } catch (error) {
        console.error('Error clearing old notifications:', error);
        throw error;
    }
};

// ========== 8 MARS ==========
export const saveMarch8Choice = async (wantsToWork: boolean): Promise<void> => {
    try {
        const choice = {
            year: new Date().getFullYear(),
            wantsToWork,
            choiceDate: new Date().toISOString(),
        };
        await AsyncStorage.setItem(KEYS.MARCH8_CHOICE, JSON.stringify(choice));
    } catch (error) {
        console.error('Error saving March 8 choice:', error);
        throw error;
    }
};

export const getMarch8Choice = async (): Promise<{ wantsToWork: boolean } | null> => {
    try {
        const choice = await AsyncStorage.getItem(KEYS.MARCH8_CHOICE);
        if (!choice) return null;

        const data = JSON.parse(choice);
        // Vérifier si le choix est pour l'année en cours
        if (data.year === new Date().getFullYear()) {
            return { wantsToWork: data.wantsToWork };
        }
        return null;
    } catch (error) {
        console.error('Error getting March 8 choice:', error);
        return null;
    }
};

// ========== FIRST LAUNCH ==========
export const isFirstLaunch = async (): Promise<boolean> => {
    try {
        const firstLaunch = await AsyncStorage.getItem(KEYS.FIRST_LAUNCH);
        return firstLaunch === null;
    } catch (error) {
        console.error('Error checking first launch:', error);
        return true;
    }
};

export const markAsLaunched = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.FIRST_LAUNCH, 'false');
    } catch (error) {
        console.error('Error marking as launched:', error);
    }
};

// ========== CACHE ==========
export const saveToCache = async (key: string, data: any, ttlMinutes: number = 60): Promise<void> => {
    try {
        const cacheData = {
            data,
            timestamp: Date.now(),
            ttl: ttlMinutes * 60 * 1000, // en millisecondes
        };
        await AsyncStorage.setItem(`${KEYS.CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving to cache:', error);
        throw error;
    }
};

export const getFromCache = async (key: string): Promise<any | null> => {
    try {
        const cached = await AsyncStorage.getItem(`${KEYS.CACHE_PREFIX}${key}`);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const now = Date.now();

        // Vérifier si le cache a expiré
        if (now - cacheData.timestamp > cacheData.ttl) {
            // Supprimer le cache expiré
            await AsyncStorage.removeItem(`${KEYS.CACHE_PREFIX}${key}`);
            return null;
        }

        return cacheData.data;
    } catch (error) {
        console.error('Error getting from cache:', error);
        return null;
    }
};

export const clearCache = async (): Promise<void> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(KEYS.CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// ========== LAST SYNC ==========
export const saveLastSync = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
        console.error('Error saving last sync:', error);
    }
};

export const getLastSync = async (): Promise<number | null> => {
    try {
        const lastSync = await AsyncStorage.getItem(KEYS.LAST_SYNC);
        return lastSync ? parseInt(lastSync) : null;
    } catch (error) {
        console.error('Error getting last sync:', error);
        return null;
    }
};

// ========== CLEAR ALL DATA ==========
export const clearAllData = async (): Promise<void> => {
    try {
        const keys = [
            KEYS.USER_DATA,
            KEYS.EMPLOYEES,
            KEYS.ACTIVITIES,
            KEYS.LOGS,
            KEYS.SETTINGS,
            KEYS.FAVORITES,
            KEYS.NOTIFICATIONS,
            KEYS.MARCH8_CHOICE,
            KEYS.FIRST_LAUNCH,
            KEYS.LAST_SYNC,
        ];

        // Ajouter tous les PIN utilisateur
        const allKeys = await AsyncStorage.getAllKeys();
        const pinKeys = allKeys.filter(key => key.startsWith(KEYS.USER_PIN));

        await AsyncStorage.multiRemove([...keys, ...pinKeys]);

        // Nettoyer le cache aussi
        await clearCache();
    } catch (error) {
        console.error('Error clearing all data:', error);
    }
};

// ========== INITIALIZATION ==========
export const initializeAppData = async (): Promise<void> => {
    try {
        // Vérifier si c'est le premier lancement
        const firstLaunch = await isFirstLaunch();

        if (firstLaunch) {
            console.log('🚀 Premier lancement de l\'application');

            // Initialiser les paramètres par défaut
            await saveSettings({
                notificationFrequency: 15,
                notificationsEnabled: true,
            });

            // Marquer comme lancé
            await markAsLaunched();

            console.log('✅ Données initialisées pour le premier lancement');
        }

        // Initialiser d'autres données si nécessaire
        const logs = await getAllLogs();
        const favorites = await getFavorites();
        const settings = await getSettings();

        console.log('📊 Données chargées:');
        console.log(`   📝 Logs: ${logs.length}`);
        console.log(`   ⭐ Favoris: ${favorites.length}`);
        console.log(`   ⚙️  Paramètres: ${Object.keys(settings).length}`);

    } catch (error) {
        console.error('Error initializing app data:', error);
    }
};

// ========== BACKUP & RESTORE ==========
export const backupData = async (): Promise<string> => {
    try {
        const data = {
            user: await getUserData(),
            logs: await getAllLogs(),
            favorites: await getFavorites(),
            settings: await getSettings(),
            notifications: await getNotifications(),
            march8Choice: await getMarch8Choice(),
            backupDate: new Date().toISOString(),
            appVersion: '1.0.0',
        };

        return JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error backing up data:', error);
        throw error;
    }
};

export const restoreData = async (backupData: string): Promise<void> => {
    try {
        const data = JSON.parse(backupData);

        if (data.user) await saveUserData(data.user);
        if (data.logs) {
            await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(data.logs));
        }
        if (data.favorites) {
            await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(data.favorites));
        }
        if (data.settings) {
            await saveSettings(data.settings);
        }
        if (data.notifications) {
            await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(data.notifications));
        }
        if (data.march8Choice) {
            await AsyncStorage.setItem(KEYS.MARCH8_CHOICE, JSON.stringify(data.march8Choice));
        }

        console.log('✅ Données restaurées avec succès');
    } catch (error) {
        console.error('Error restoring data:', error);
        throw error;
    }
};