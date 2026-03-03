// src/screens/auth/CreateAccountScreen.tsx
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
import { useAuth } from '../../store/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type CreateAccountScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'CreateAccount'
>;

interface Props {
    navigation: CreateAccountScreenNavigationProp;
}

const CreateAccountScreen: React.FC<Props> = ({ navigation }) => {
    const { createAccount, verifyEmployee, pinExists } = useAuth();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        matricule: '',
        cin: '',
        pin: '',
        confirmPin: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [employeeInfo, setEmployeeInfo] = useState<any>(null);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const handleVerifyEmployee = async () => {
        const { matricule, cin } = formData;

        if (!matricule.trim() || !cin.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer votre matricule et CIN');
            return;
        }

        setIsLoading(true);

        try {
            const accountExists = await pinExists(matricule);
            if (accountExists) {
                Alert.alert(
                    'Compte existant',
                    'Un compte existe déjà avec ce matricule. Veuillez vous connecter.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
                return;
            }

            const employee = verifyEmployee(matricule, cin);
            if (!employee) {
                Alert.alert('Erreur', 'Matricule ou CIN incorrect');
                return;
            }

            setEmployeeInfo(employee);
            setStep(2);

        } catch (error) {
            Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAccount = async () => {
        const { matricule, cin, pin, confirmPin } = formData;

        if (!pin || !confirmPin) {
            Alert.alert('Erreur', 'Veuillez entrer et confirmer votre PIN');
            return;
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            Alert.alert('Erreur', 'Le PIN doit contenir exactement 4 chiffres');
            return;
        }

        if (pin !== confirmPin) {
            Alert.alert('Erreur', 'Les PIN ne correspondent pas');
            return;
        }

        setIsLoading(true);

        try {
            await createAccount(matricule, cin, pin);

            Alert.alert(
                'Succès',
                'Compte créé avec succès ! Vous êtes maintenant connecté.',
                [{ text: 'OK' }]
            );

        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Erreur lors de la création du compte');
        } finally {
            setIsLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <View style={styles.stepIndicator}>
                    <Text style={styles.stepNumber}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Vérification</Text>
            </View>

            <Text style={styles.stepDescription}>
                Entrez votre matricule et votre numéro CIN pour vérifier votre identité
            </Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro de matricule *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="id-card" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.input}
                        value={formData.matricule}
                        onChangeText={text => setFormData({ ...formData, matricule: text })}
                        placeholder="Ex: 001"
                        autoCapitalize="none"
                        editable={!isLoading}
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro CIN *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="document-text" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.input}
                        value={formData.cin}
                        onChangeText={text => setFormData({ ...formData, cin: text })}
                        placeholder="Votre numéro CIN"
                        keyboardType="numeric"
                        editable={!isLoading}
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyEmployee}
                disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.verifyButtonText}>Vérifier</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <View style={styles.stepIndicator}>
                    <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Création du PIN</Text>
            </View>

            {employeeInfo && (
                <View style={styles.employeeCard}>
                    <View style={styles.employeeHeader}>
                        <Ionicons name="person-circle" size={40} color="#6366f1" />
                        <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName}>
                                {employeeInfo.Prenom} {employeeInfo.Nom}
                            </Text>
                            <Text style={styles.employeeDetails}>
                                {employeeInfo.Direction} • {employeeInfo.Departement}
                            </Text>
                            <Text style={styles.employeeMatricule}>
                                Matricule: {employeeInfo.Num_matricule}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <Text style={styles.stepDescription}>
                Créez un code PIN à 4 chiffres pour sécuriser votre compte
            </Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nouveau PIN (4 chiffres)</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.input}
                        value={formData.pin}
                        onChangeText={text => setFormData({ ...formData, pin: text })}
                        placeholder="••••"
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

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer le PIN</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed" size={20} color="#6b7280" />
                    <TextInput
                        style={styles.input}
                        value={formData.confirmPin}
                        onChangeText={text => setFormData({ ...formData, confirmPin: text })}
                        placeholder="••••"
                        keyboardType="numeric"
                        secureTextEntry={!showConfirmPin}
                        maxLength={4}
                        editable={!isLoading}
                        placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity
                        onPress={() => setShowConfirmPin(!showConfirmPin)}
                        style={styles.eyeButton}>
                        <Ionicons
                            name={showConfirmPin ? 'eye-off' : 'eye'}
                            size={20}
                            color="#6b7280"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.pinRules}>
                <Ionicons name="information-circle" size={16} color="#6b7280" />
                <Text style={styles.pinRulesText}>
                    Le PIN doit contenir exactement 4 chiffres
                </Text>
            </View>

            <View style={styles.stepButtons}>
                <TouchableOpacity
                    style={[styles.backButton, isLoading && styles.buttonDisabled]}
                    onPress={() => setStep(1)}
                    disabled={isLoading}>
                    <Ionicons name="arrow-back" size={20} color="#6366f1" />
                    <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.createButton, isLoading && styles.buttonDisabled]}
                    onPress={handleCreateAccount}
                    disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="create" size={20} color="#fff" />
                            <Text style={styles.createButtonText}>Créer le compte</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButtonHeader}
                            onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.iconContainer}>
                            <Ionicons name="person-add" size={32} color="#fff" />
                        </View>

                        <Text style={styles.title}>Création de compte</Text>
                        <Text style={styles.subtitle}>
                            {step === 1 ? 'Vérifiez votre identité' : 'Créez votre PIN'}
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        {step === 1 ? renderStep1() : renderStep2()}

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => navigation.navigate('Login')}
                            disabled={isLoading}>
                            <Text style={styles.loginLinkText}>
                                Déjà un compte ? Se connecter
                            </Text>
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
        backgroundColor: '#0f172a',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        backgroundColor: '#1e293b',
        padding: 30,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButtonHeader: {
        position: 'absolute',
        top: 60,
        left: 20,
        padding: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
    },
    formContainer: {
        padding: 20,
        marginTop: 20,
    },
    stepContainer: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    stepNumber: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    stepDescription: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        backgroundColor: '#0f172a',
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        padding: 14,
        fontSize: 16,
        color: '#f8fafc',
    },
    eyeButton: {
        padding: 10,
    },
    verifyButton: {
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 10,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    employeeCard: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    employeeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    employeeInfo: {
        marginLeft: 16,
        flex: 1,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 4,
    },
    employeeDetails: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
    },
    employeeMatricule: {
        fontSize: 12,
        color: '#64748b',
    },
    pinRules: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        marginBottom: 20,
    },
    pinRulesText: {
        fontSize: 12,
        color: '#94a3b8',
        marginLeft: 8,
    },
    stepButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    backButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    backButtonText: {
        color: '#6366f1',
        fontSize: 16,
        fontWeight: '600',
    },
    createButton: {
        flex: 2,
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    loginLink: {
        alignItems: 'center',
        padding: 16,
    },
    loginLinkText: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default CreateAccountScreen;