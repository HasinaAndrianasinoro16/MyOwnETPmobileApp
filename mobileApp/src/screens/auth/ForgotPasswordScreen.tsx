// src/screens/auth/ForgotPasswordScreen.tsx

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { AuthService } from '../../services/AuthService';
import { dataService } from '../../services/DataService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'ForgotPassword'
>;

interface Props {
    navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const [numMatricule, setNumMatricule] = useState('');
    const [numCin, setNumCin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        // Validation
        if (!numMatricule.trim() || !numCin.trim() || !newPin.trim() || !confirmPin.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        // Valider que c'est un PIN de 4 chiffres
        if (!/^\d{4}$/.test(newPin)) {
            Alert.alert('Erreur', 'Le PIN doit être composé de 4 chiffres');
            return;
        }

        if (newPin !== confirmPin) {
            Alert.alert('Erreur', 'Les PIN ne correspondent pas');
            return;
        }

        setIsLoading(true);

        try {
            // Vérifier l'employé avec le matricule et CIN
            const employee = dataService.verifyEmployeeCredentials(numMatricule, numCin);

            if (!employee) {
                Alert.alert('Erreur', 'Numéro de matricule ou CIN incorrect');
                setIsLoading(false);
                return;
            }

            // Vérifier si l'utilisateur a déjà un compte
            const hasAccount = await AuthService.pinExists(numMatricule);

            // Afficher le PIN actuel dans la console pour le débogage
            console.log('=== DEBUG FORGOT PASSWORD ===');
            console.log('Matricule:', numMatricule);
            console.log('CIN:', numCin);
            console.log('Nouveau PIN demandé:', newPin);
            console.log('Confirmation PIN:', confirmPin);

            if (hasAccount) {
                // Récupérer l'ancien PIN depuis le storage
                const oldPin = await AsyncStorage.getItem(`@bfm_pin_${numMatricule}`);
                console.log('Ancien PIN stocké:', oldPin);

                // Changer le PIN
                await AuthService.changePin(numMatricule, oldPin || '0000', newPin);

                // Vérifier que le nouveau PIN a bien été enregistré
                const updatedPin = await AsyncStorage.getItem(`@bfm_pin_${numMatricule}`);
                console.log('Nouveau PIN après changement:', updatedPin);

                Alert.alert(
                    'Succès',
                    `PIN réinitialisé avec succès !\n\nAncien PIN: ${oldPin}\nNouveau PIN: ${updatedPin}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('Login'),
                        },
                    ]
                );
            } else {
                console.log('Aucun compte existant pour ce matricule');

                // Créer un nouveau compte
                await AuthService.createAccount(numMatricule, numCin, newPin);

                // Vérifier que le PIN a bien été créé
                const createdPin = await AsyncStorage.getItem(`@bfm_pin_${numMatricule}`);
                console.log('PIN créé:', createdPin);

                Alert.alert(
                    'Succès',
                    `Compte créé avec succès !\n\nPIN créé: ${createdPin}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('Login'),
                        },
                    ]
                );
            }

            console.log('=== FIN DEBUG ===');

        } catch (error) {
            console.error('Erreur dans forgot password:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la réinitialisation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestFindPin = async () => {
        if (!numMatricule.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un matricule');
            return;
        }

        try {
            // Chercher directement dans AsyncStorage
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('=== RECHERCHE DE PIN ===');
            console.log('Toutes les clés:', allKeys);

            // Chercher la clé du PIN pour ce matricule
            const pinKey = `@bfm_pin_${numMatricule}`;
            const hasPinKey = allKeys.includes(pinKey);

            console.log(`Clé recherchée: ${pinKey}`);
            console.log(`Clé trouvée: ${hasPinKey}`);

            if (hasPinKey) {
                const pin = await AsyncStorage.getItem(pinKey);
                console.log(`PIN trouvé: ${pin}`);
                Alert.alert('PIN Trouvé', `Matricule: ${numMatricule}\nPIN: ${pin}`);
            } else {
                console.log('Aucun PIN trouvé pour ce matricule');
                Alert.alert('Non trouvé', `Aucun PIN trouvé pour le matricule: ${numMatricule}`);
            }

        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            Alert.alert('Erreur', 'Impossible de rechercher le PIN');
        }
    };

    const handleCreateAccountInstead = () => {
        if (!numMatricule.trim() || !numCin.trim()) {
            Alert.alert('Erreur', 'Veuillez d\'abord entrer votre matricule et CIN');
            return;
        }

        // Vérifier si l'employé existe
        const employee = dataService.verifyEmployeeCredentials(numMatricule, numCin);
        if (!employee) {
            Alert.alert('Erreur', 'Matricule ou CIN incorrect');
            return;
        }

        navigation.navigate('CreateAccount', {
            matricule: numMatricule,
            cin: numCin,
        } as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#3f51b5" />
                        </TouchableOpacity>

                        <View style={styles.iconContainer}>
                            <Ionicons name="key" size={32} color="#fff" />
                        </View>

                        <Text style={styles.title}>Réinitialisation du PIN</Text>
                        <Text style={styles.subtitle}>
                            Entrez vos informations pour réinitialiser votre PIN
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {/* Numéro de matricule */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Numéro de matricule</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color="#6b7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={numMatricule}
                                    onChangeText={setNumMatricule}
                                    placeholder="Votre numéro de matricule"
                                    editable={!isLoading}
                                    autoCapitalize="none"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Numéro CIN */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Numéro CIN</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="card-outline"
                                    size={20}
                                    color="#6b7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={numCin}
                                    onChangeText={setNumCin}
                                    placeholder="Votre numéro CIN"
                                    keyboardType="numeric"
                                    editable={!isLoading}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Nouveau PIN */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nouveau PIN (4 chiffres)</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color="#6b7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={[styles.input, styles.pinInput]}
                                    value={newPin}
                                    onChangeText={(text) => {
                                        // N'autoriser que les chiffres et limiter à 4
                                        const digitsOnly = text.replace(/[^0-9]/g, '');
                                        if (digitsOnly.length <= 4) {
                                            setNewPin(digitsOnly);
                                        }
                                    }}
                                    placeholder="Ex: 1234"
                                    keyboardType="numeric"
                                    secureTextEntry={!showNewPin}
                                    editable={!isLoading}
                                    maxLength={4}
                                    placeholderTextColor="#9ca3af"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowNewPin(!showNewPin)}
                                    style={styles.eyeIcon}>
                                    <Ionicons
                                        name={showNewPin ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.pinHint}>4 chiffres requis</Text>
                        </View>

                        {/* Confirmer PIN */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmer le PIN</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={20}
                                    color="#6b7280"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={[styles.input, styles.pinInput]}
                                    value={confirmPin}
                                    onChangeText={(text) => {
                                        // N'autoriser que les chiffres et limiter à 4
                                        const digitsOnly = text.replace(/[^0-9]/g, '');
                                        if (digitsOnly.length <= 4) {
                                            setConfirmPin(digitsOnly);
                                        }
                                    }}
                                    placeholder="Retapez votre PIN"
                                    keyboardType="numeric"
                                    secureTextEntry={!showConfirmPin}
                                    editable={!isLoading}
                                    maxLength={4}
                                    placeholderTextColor="#9ca3af"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                                    style={styles.eyeIcon}>
                                    <Ionicons
                                        name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Indicateur de correspondance */}
                        {newPin.length === 4 && confirmPin.length === 4 && (
                            <View style={styles.pinMatchContainer}>
                                <Ionicons
                                    name={newPin === confirmPin ? 'checkmark-circle' : 'close-circle'}
                                    size={20}
                                    color={newPin === confirmPin ? '#10b981' : '#ef4444'}
                                />
                                <Text style={[
                                    styles.pinMatchText,
                                    { color: newPin === confirmPin ? '#10b981' : '#ef4444' }
                                ]}>
                                    {newPin === confirmPin ? 'PIN correspondants' : 'PIN ne correspondent pas'}
                                </Text>
                            </View>
                        )}

                        {/* Bouton pour tester la recherche de PIN */}
                        <TouchableOpacity
                            style={styles.testButton}
                            onPress={handleTestFindPin}
                            disabled={isLoading}>
                            <Ionicons name="search" size={20} color="#3f51b5" />
                            <Text style={styles.testButtonText}>Tester recherche PIN</Text>
                        </TouchableOpacity>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                isLoading && styles.submitButtonDisabled,
                                (!numMatricule || !numCin || newPin.length !== 4 || confirmPin.length !== 4) && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={isLoading || !numMatricule || !numCin || newPin.length !== 4 || confirmPin.length !== 4}
                            activeOpacity={0.8}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.submitButtonContent}>
                                    <Text style={styles.submitButtonText}>
                                        Réinitialiser le PIN
                                    </Text>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Option pour créer un compte */}
                        <TouchableOpacity
                            style={styles.createAccountButton}
                            onPress={handleCreateAccountInstead}
                            disabled={isLoading}>
                            <Ionicons name="person-add-outline" size={20} color="#3f51b5" />
                            <Text style={styles.createAccountText}>Créer un nouveau compte</Text>
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <TouchableOpacity
                            style={styles.backToLoginButton}
                            onPress={() => navigation.navigate('Login')}
                            disabled={isLoading}>
                            <Ionicons name="arrow-back-circle-outline" size={20} color="#3f51b5" />
                            <Text style={styles.backToLoginText}>Retour à la connexion</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        backgroundColor: '#fff',
        padding: 30,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        padding: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3f51b5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#3f51b5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        maxWidth: 280,
    },
    formContainer: {
        padding: 20,
        marginTop: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputIcon: {
        paddingLeft: 12,
    },
    input: {
        flex: 1,
        padding: 14,
        fontSize: 14,
        color: '#1e293b',
    },
    pinInput: {
        paddingRight: 40,
    },
    pinHint: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
        marginLeft: 4,
    },
    eyeIcon: {
        padding: 12,
        position: 'absolute',
        right: 0,
    },
    pinMatchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    pinMatchText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        padding: 12,
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    testButtonText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    submitButton: {
        backgroundColor: '#3f51b5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#3f51b5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    createAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        borderRadius: 8,
    },
    createAccountText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    backToLoginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        padding: 12,
    },
    backToLoginText: {
        color: '#3f51b5',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ForgotPasswordScreen;