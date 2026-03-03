// src/navigation/AppNavigator.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Import des écrans
import LoginScreen from '../screens/auth/LoginScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/main/HomeScreen';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ActivityListScreen from '../screens/main/ActivityListScreen';
import NotificationHistoryScreen from '../screens/main/NotificationHistoryScreen';
import CompleteTasksScreen from '../screens/main/CompleteTasksScreen';

import { RootStackParamList } from '../types';
import { NotificationService } from '../services/NotificationService';

const Stack = createStackNavigator<RootStackParamList>();

// =============================================
// NAVIGATEUR PRINCIPAL
// =============================================
export default function AppNavigator() {
    const { user, isLoading } = useAuth();
    // ✅ FIX: navigationRef déclaré ICI et passé directement au NavigationContainer
    const navigationRef = useRef<any>(null);
    const [isNavReady, setIsNavReady] = useState(false);

    // Setup des notifications une fois que la navigation est prête ET l'user connecté
    useEffect(() => {
        if (!isNavReady || !user || !navigationRef.current) return;

        let cleanup: (() => void) | null = null;

        const setupNotifications = async () => {
            try {
                console.log('🔔 Setup notifications après connexion...');

                // Écouter les clics sur notifications
                cleanup = NotificationService.setupNotificationListener(navigationRef.current);

                // Synchroniser le push token avec le backend maintenant qu'on a un user
                await NotificationService.syncPushTokenAfterLogin();

                // Planifier les rappels locaux
                await NotificationService.scheduleAutomaticReminders();

                console.log('✅ Notifications configurées');
            } catch (error) {
                console.warn('⚠️ Erreur setup notifications:', error);
            }
        };

        setupNotifications();

        return () => {
            if (cleanup) cleanup();
        };
    }, [isNavReady, user]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3f51b5" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        // ✅ FIX: ref correctement passée au NavigationContainer
        <NavigationContainer
            ref={navigationRef}
            onReady={() => setIsNavReady(true)}
        >
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={user ? 'Home' : 'Login'}
            >
                {user ? (
                    // Écrans authentifiés
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="ActivityList" component={ActivityListScreen} />
                        <Stack.Screen name="Favorites" component={FavoritesScreen} />
                        <Stack.Screen name="History" component={HistoryScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="CompleteTasks" component={CompleteTasksScreen} />
                        <Stack.Screen name="Notification" component={NotificationHistoryScreen} />
                    </>
                ) : (
                    // Écrans non authentifiés
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    loadingText: {
        marginTop: 12,
        color: '#94a3b8',
        fontSize: 16,
    },
});