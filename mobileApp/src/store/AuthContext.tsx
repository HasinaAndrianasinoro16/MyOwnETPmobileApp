// src/store/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { dataService } from '../services/DataService';
import { Employe } from '../types';

interface AuthContextType {
    user: Employe | null;
    isLoading: boolean;
    login: (matricule: string, pin: string) => Promise<void>;
    logout: () => Promise<void>;
    createAccount: (matricule: string, cin: string, pin: string) => Promise<void>;
    verifyEmployee: (matricule: string, cin: string) => Employe | null;
    changePin: (oldPin: string, newPin: string) => Promise<void>;
    pinExists: (matricule: string) => Promise<boolean>;
    isAuthenticated: boolean;
    updateUserInfo: (info: Partial<Employe>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Employe | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStoredUser();
    }, []);

    const loadStoredUser = async () => {
        try {
            const storedUser = await AuthService.getCurrentUser();
            setUser(storedUser);
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const verifyEmployee = (matricule: string, cin: string): Employe | null => {
        const employee = dataService.verifyEmployeeCredentials(matricule, cin);
        if (!employee) return null;

        return {
            ...employee,
            Pin: undefined,
        };
    };

    const pinExists = async (matricule: string): Promise<boolean> => {
        return await AuthService.pinExists(matricule);
    };

    const createAccount = async (matricule: string, cin: string, pin: string): Promise<void> => {
        try {
            const newUser = await AuthService.createAccount(matricule, cin, pin);
            setUser(newUser);
        } catch (error: any) {
            throw new Error(error.message || 'Erreur lors de la création du compte');
        }
    };

    const login = async (matricule: string, pin: string): Promise<void> => {
        try {
            const loggedInUser = await AuthService.login(matricule, pin);
            setUser(loggedInUser);
        } catch (error: any) {
            throw new Error(error.message || 'Erreur lors de la connexion');
        }
    };

    const changePin = async (oldPin: string, newPin: string): Promise<void> => {
        if (!user) {
            throw new Error('Utilisateur non connecté');
        }

        try {
            await AuthService.changePin(user.Num_matricule, oldPin, newPin);

            // Mettre à jour l'utilisateur local
            const updatedUser = { ...user, Pin: newPin };
            setUser(updatedUser);
            await AsyncStorage.setItem('@bfm_user', JSON.stringify(updatedUser));
        } catch (error: any) {
            throw new Error(error.message || 'Erreur lors du changement de PIN');
        }
    };

    const updateUserInfo = async (info: Partial<Employe>): Promise<void> => {
        if (!user) return;

        try {
            const updatedUser = { ...user, ...info };
            setUser(updatedUser);
            await AsyncStorage.setItem('@bfm_user', JSON.stringify(updatedUser));

            // Mettre à jour les paramètres
            if (info.Direction || info.Departement || info.Service) {
                await AuthService.saveSettings({
                    direction: info.Direction || user.Direction,
                    departement: info.Departement || user.Departement,
                    service: info.Service,
                });
            }
        } catch (error) {
            console.error('Error updating user info:', error);
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await AuthService.logout();
            setUser(null);
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                logout,
                createAccount,
                verifyEmployee,
                changePin,
                pinExists,
                updateUserInfo,
                isAuthenticated: !!user,
            }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};