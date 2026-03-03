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
import NotificationHistoryScreen from "../screens/main/NotificationHistoryScreen";
import CompleteTasksScreen from '../screens/main/CompleteTasksScreen';

import { RootStackParamList } from '../types';
import { NotificationService } from '../services/NotificationService';

const Stack = createStackNavigator<RootStackParamList>();

// Main Stack avec navigation référée
const MainStack = () => {
    const { user } = useAuth();
    const [isNotificationListenerSetup, setIsNotificationListenerSetup] = useState(false);
    const navigationRef = useRef<any>(null);

    useEffect(() => {
        let cleanupFunction: (() => void) | null = null;

        const setupNotifications = async () => {
            try {
                if (navigationRef.current && user && !isNotificationListenerSetup) {
                    // Configurer l'écouteur de notifications
                    cleanupFunction = NotificationService.setupNotificationListener(navigationRef.current);
                    setIsNotificationListenerSetup(true);

                    // Vérifier immédiatement les tâches
                    setTimeout(async () => {
                        await NotificationService.sendTaskReminder();
                    }, 3000);

                    // Démarrer la vérification automatique
                    NotificationService.startAutoCheck();
                }
            } catch (error) {
                console.error('Erreur configuration notifications:', error);
            }
        };

        setupNotifications();

        // Nettoyage
        return () => {
            if (cleanupFunction) {
                cleanupFunction();
            }
            setIsNotificationListenerSetup(false);
        };
    }, [user, isNotificationListenerSetup]);

    return (
        <Stack.Navigator
            ref={navigationRef}
            screenOptions={{
                headerStyle: { backgroundColor: '#1e293b' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '600' },
                cardStyle: { backgroundColor: '#0f172a' },
            }}>
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="ActivityList"
                component={ActivityListScreen}
                options={{
                    title: 'Liste des activités',
                    headerBackTitle: 'Accueil'
                }}
            />
            <Stack.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{
                    title: 'Mes favoris',
                    headerBackTitle: 'Accueil'
                }}
            />
            <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    title: 'Historique',
                    headerBackTitle: 'Accueil'
                }}
            />
            <Stack.Screen
                name="CompleteTasks"
                component={CompleteTasksScreen}
                options={{
                    title: 'Compléter les tâches',
                    headerBackTitle: 'Accueil'
                }}
            />
            <Stack.Screen
                name="Notification"
                component={NotificationHistoryScreen}
                options={{
                    title: 'Notifications',
                    headerBackTitle: 'Accueil'
                }}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'Paramètres',
                    headerBackTitle: 'Accueil'
                }}
            />
        </Stack.Navigator>
    );
};

// Auth Stack
const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    );
};

// Main App Navigator
const AppNavigator = () => {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        const handleAuthChange = async () => {
            if (!isAuthenticated && !isLoading) {
                await NotificationService.cancelAllNotifications();
            }
        };
        handleAuthChange();
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3f51b5" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    loadingText: {
        marginTop: 16,
        color: '#94a3b8',
        fontSize: 16,
    },
});

export default AppNavigator;