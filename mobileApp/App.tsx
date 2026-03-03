// App.tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { dataService } from './src/services/DataService';
import { NotificationService } from './src/services/NotificationService';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ignorer les warnings
LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'AsyncStorage has been extracted from react-native core',
]);

export default function App() {
    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('🚀 Démarrage application BFM...');

                // 1. Initialiser les notifications
                console.log('🔔 Initialisation notifications...');
                const notificationsInitialized = await NotificationService.initialize();

                if (!notificationsInitialized) {
                    console.log('⚠️ Notifications non initialisées - vérifiez les permissions');
                } else {
                    console.log('✅ Notifications prêtes');

                    // Test après 5 secondes
                    setTimeout(async () => {
                        try {
                            // Vérifier si un utilisateur est connecté
                            const userStr = await AsyncStorage.getItem('@bfm_user');

                            if (userStr) {
                                console.log('👤 Utilisateur connecté, vérification tâches...');

                                // Vérifier et envoyer un rappel si nécessaire
                                await NotificationService.sendTaskReminder();

                                // Planifier les rappels automatiques selon les paramètres
                                await NotificationService.scheduleAutomaticReminders();
                            }
                        } catch (error) {
                            console.log('⚠️ Erreur vérification initiale:', error);
                        }
                    }, 5000);
                }

                // 2. Charger les données
                const stats = dataService.getStatistics();
                console.log('📊 Données chargées:');
                console.log(`   👥 ${stats.employees.total} employés`);
                console.log(`   📋 ${stats.activities.total} activités`);
                console.log(`   👨 Hommes: ${stats.employees.male || 0}`);
                console.log(`   👩 Femmes: ${stats.employees.female || 0}`);

                // 3. Vérifier périodiquement toutes les heures
                const periodicCheck = setInterval(async () => {
                    try {
                        const userStr = await AsyncStorage.getItem('@bfm_user');
                        if (userStr) {
                            console.log('⏰ Vérification périodique des tâches...');
                            await NotificationService.sendTaskReminder();
                        }
                    } catch (error) {
                        console.log('⚠️ Erreur vérification périodique:', error);
                    }
                }, 60 * 60 * 1000); // Toutes les heures

                console.log('✅ Application initialisée');

                // Nettoyage
                return () => {
                    clearInterval(periodicCheck);
                    console.log('🧹 Nettoyage des intervalles');
                };

            } catch (error) {
                console.error('❌ Erreur initialisation:', error);
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