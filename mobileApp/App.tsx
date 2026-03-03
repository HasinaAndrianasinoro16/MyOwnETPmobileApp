// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { dataService } from './src/services/DataService';
import { NotificationService } from './src/services/NotificationService';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'AsyncStorage has been extracted from react-native core',
]);

export default function App() {
    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('🚀 Démarrage application BFM...');

                // 1. Initialiser les notifications (permissions + push token)
                const notificationsReady = await NotificationService.initialize();
                if (notificationsReady) {
                    console.log('✅ Notifications prêtes');
                } else {
                    console.log('⚠️ Notifications non disponibles');
                }

                // 2. Charger les données statiques
                const stats = dataService.getStatistics();
                console.log(`📊 Données : ${stats.employees.total} employés, ${stats.activities.total} activités`);

            } catch (error) {
                console.error('❌ Erreur initialisation app:', error);
            }
        };

        initializeApp();
    }, []);

    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            <AuthProvider>
                <AppNavigator />
            </AuthProvider>
        </SafeAreaProvider>
    );
}