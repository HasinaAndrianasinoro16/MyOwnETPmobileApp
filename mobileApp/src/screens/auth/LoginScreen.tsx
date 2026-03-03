// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type LoginScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'Login'
>;

interface Props {
    navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const { login } = useAuth();
    const [matricule, setMatricule] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!matricule.trim() || !pin.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            Alert.alert('Erreur', 'Le PIN doit contenir 4 chiffres');
            return;
        }

        setIsLoading(true);
        try {
            await login(matricule, pin);
            // Navigation gérée automatiquement par l'AuthContext
        } catch (error: any) {
            Alert.alert('Erreur de connexion', error.message || 'Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logo}>
                                <Text style={styles.logoText}>🏢</Text>
                            </View>
                            <Text style={styles.companyName}>BANKY FOIBEN' I MADAGASIKARA</Text>
                        </View>

                        <Text style={styles.title}>My ETP-APP</Text>
                        <Text style={styles.subtitle}>BIENVENUE DANS VOTRE ESPACE</Text>
                        <Text style={styles.description}>
                            Outil créé pour faciliter la gestion des activités du personnel
                            de la BFM
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>Connexion</Text>
                        <Text style={styles.formSubtitle}>
                            Authentification d'un personnel de la BFM
                        </Text>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.labelContainer}>
                                    <View style={styles.labelIndicator} />
                                    <Text style={styles.label}>Numéro de matricule</Text>
                                </View>
                                <View style={styles.inputInnerWrapper}>
                                    <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={matricule}
                                        onChangeText={setMatricule}
                                        placeholder="Entrez votre numéro de matricule"
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.labelContainer}>
                                    <View style={styles.labelIndicator} />
                                    <Text style={styles.label}>Code PIN</Text>
                                </View>
                                <View style={styles.inputInnerWrapper}>
                                    <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={pin}
                                        onChangeText={setPin}
                                        placeholder="Entrez votre PIN (4 chiffres)"
                                        keyboardType="numeric"
                                        secureTextEntry={!showPin}
                                        maxLength={4}
                                        editable={!isLoading}
                                        placeholderTextColor="#9ca3af"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPin(!showPin)}
                                        style={styles.eyeButton}>
                                        <Ionicons
                                            name={showPin ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#6b7280"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>PIN oublié?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="log-in" size={20} color="#fff" />
                                    <Text style={styles.loginButtonText}>SE CONNECTER</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.createAccountContainer}>
                            <Text style={styles.createAccountText}>Pas encore de compte? </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CreateAccount')}
                                disabled={isLoading}>
                                <Text style={styles.createAccountLink}>Créer un compte</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        backgroundColor: '#1e293b',
        padding: 30,
        paddingTop: 50,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    logoText: {
        fontSize: 20,
        color: '#fff',
    },
    companyName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        maxWidth: 200,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '300',
        marginBottom: 10,
    },
    subtitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
        borderBottomWidth: 3,
        borderBottomColor: '#fff',
        paddingBottom: 10,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        textAlign: 'center',
        maxWidth: 300,
    },
    formContainer: {
        padding: 30,
        backgroundColor: '#1e293b',
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 10,
    },
    formSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 25,
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelIndicator: {
        width: 3,
        height: 16,
        backgroundColor: '#6366f1',
        marginRight: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#f8fafc',
    },
    inputInnerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        backgroundColor: '#0f172a',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#f8fafc',
    },
    eyeButton: {
        padding: 10,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#6366f1',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    createAccountContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    createAccountText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    createAccountLink: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default LoginScreen;