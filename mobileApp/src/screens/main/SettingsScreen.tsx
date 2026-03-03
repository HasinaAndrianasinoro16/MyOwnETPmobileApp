// src/screens/main/SettingsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Switch,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { getSettings, saveSettings } from '../../services/AsyncStorageService';
import { Settings as SettingsType, Employe } from '../../types';
import { dataService } from '../../services/DataService';
import { NotificationService } from '../../services/NotificationService';

const SettingsScreen: React.FC = () => {
    const { user, logout, updateUserInfo } = useAuth();

    // Référence pour éviter les re-renders inutiles
    const userRef = useRef(user);
    userRef.current = user;

    const initialSettings = useMemo((): SettingsType => ({
        notifMinute: 15,
        debutTravail: '07:30',
        finTravail: '16:30',
        debutPause: '12:00',
        finPause: '13:00',
        notificationsEnabled: true,
        notificationFrequency: 15,
        direction: user?.Direction || +'',
        departement: user?.Departement || '',
        service: user?.Service || '',
        allDirections: [],
        allDepartements: [],
        allServices: [],
    }), []); // Retirer la dépendance à user

    const [settings, setSettings] = useState<SettingsType>(initialSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editField, setEditField] = useState<'direction' | 'departement' | 'service' | null>(null);
    const [editValue, setEditValue] = useState('');
    const [availableOptions, setAvailableOptions] = useState<string[]>([]);
    const [remindersStatus, setRemindersStatus] = useState({
        enabled: false,
        interval: 15,
        scheduledCount: 0
    });

    // Charger les settings au montage
    useEffect(() => {
        const initSettings = async () => {
            try {
                const savedSettings = await getSettings();
                if (savedSettings) {
                    setSettings(prev => ({
                        ...prev,
                        ...savedSettings,
                        notificationFrequency: savedSettings.notificationFrequency || 15,
                        direction: savedSettings.direction || userRef.current?.Direction || '',
                        departement: savedSettings.departement || userRef.current?.Departement || '',
                        service: savedSettings.service || userRef.current?.Service || '',
                    }));
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        const loadAvailableOptions = () => {
            const employees = dataService.getAllEmployees();
            const directions = Array.from(new Set(employees.map(emp => emp.Direction).filter(Boolean)));
            const departements = Array.from(new Set(employees.map(emp => emp.Departement).filter(Boolean)));
            const services = Array.from(new Set(employees.map(emp => emp.Service).filter(Boolean)));

            setSettings(prev => ({
                ...prev,
                allDirections: directions,
                allDepartements: departements,
                allServices: services,
            }));
        };

        const checkReminders = async () => {
            try {
                const status = await NotificationService.getRemindersStatus();
                setRemindersStatus(status);
            } catch (error) {
                console.error('Error checking reminders status:', error);
            }
        };

        initSettings();
        loadAvailableOptions();
        checkReminders();
    }, []); // Tableau de dépendances vide

    const handleToggleNotifications = useCallback(async (value: boolean) => {
        try {
            setIsLoading(true);

            if (value) {
                await NotificationService.enableReminders(settings.notificationFrequency);
                Alert.alert(
                    '✅ Rappels activés',
                    `Vous recevrez des rappels toutes les ${settings.notificationFrequency} minutes pour compléter vos tâches favorites non complétées.`
                );
            } else {
                await NotificationService.disableReminders();
                Alert.alert(
                    '🔕 Rappels désactivés',
                    'Vous ne recevrez plus de rappels automatiques.'
                );
            }

            setSettings(prev => ({ ...prev, notificationsEnabled: value }));

            // Vérifier le statut après modification
            const status = await NotificationService.getRemindersStatus();
            setRemindersStatus(status);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de modifier les notifications');
            console.error('Error toggling notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [settings.notificationFrequency]);

    const handleChangeFrequency = useCallback(async (frequency: number) => {
        try {
            setSettings(prev => ({ ...prev, notificationFrequency: frequency }));

            if (settings.notificationsEnabled) {
                await NotificationService.schedulePeriodicReminders(frequency);
                const status = await NotificationService.getRemindersStatus();
                setRemindersStatus(status);
                Alert.alert('Succès', `Fréquence mise à jour: rappel toutes les ${frequency} minutes`);
            }
        } catch (error) {
            console.error('Error changing frequency:', error);
            Alert.alert('Erreur', 'Impossible de changer la fréquence');
        }
    }, [settings.notificationsEnabled]);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            await saveSettings(settings);

            const updatedUserInfo: Partial<Employe> = {
                Direction: settings.direction,
                Departement: settings.departement,
                Service: settings.service,
            };

            await updateUserInfo(updatedUserInfo);

            Alert.alert('Succès', 'Paramètres enregistrés avec succès !');
        } catch (error) {
            Alert.alert('Erreur', "Impossible d'enregistrer les paramètres");
            console.error('Error saving settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, [settings, updateUserInfo]);

    const handleOpenEditModal = useCallback((field: 'direction' | 'departement' | 'service' | 'reportEmail') => {
        setEditField(field);
        setEditValue(settings[field] || '');

        let options: string[] = [];
        switch (field) {
            case 'direction':
                options = settings.allDirections || [];
                break;
            case 'departement':
                options = settings.allDepartements || [];
                break;
            case 'service':
                options = settings.allServices || [];
                break;
            case 'reportEmail':
                // Pour l'email, on peut proposer des suggestions si besoin
                options = [
                    'sau.dti@bfm.mg',
                ];
                break;
        }
        setAvailableOptions(options);
        setShowEditModal(true);
    }, [settings]);

    // const handleOpenEditModal = useCallback((field: 'direction' | 'departement' | 'service') => {
    //     setEditField(field);
    //     setEditValue(settings[field] || '');
    //
    //     let options: string[] = [];
    //     switch (field) {
    //         case 'direction':
    //             options = settings.allDirections || [];
    //             break;
    //         case 'departement':
    //             options = settings.allDepartements || [];
    //             break;
    //         case 'service':
    //             options = settings.allServices || [];
    //             break;
    //     }
    //     setAvailableOptions(options);
    //     setShowEditModal(true);
    // }, [settings]);

    const handleSaveEdit = useCallback(() => {
        if (editField && editValue.trim()) {
            setSettings(prev => ({
                ...prev,
                [editField]: editValue.trim()
            }));
        }
        setShowEditModal(false);
        setEditField(null);
        setEditValue('');
    }, [editField, editValue]);

    const handleSelectOption = useCallback((option: string) => {
        setEditValue(option);
    }, []);

    const handleTestReminder = useCallback(async () => {
        try {
            setIsLoading(true);
            const sent = await NotificationService.sendTaskReminder();

            if (sent) {
                Alert.alert(
                    'Test envoyé',
                    'Vous devriez recevoir une notification avec vos tâches non complétées.'
                );
            } else {
                Alert.alert(
                    'Aucune tâche',
                    'Toutes vos tâches favorites sont déjà complétées aujourd\'hui !'
                );
            }
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'envoyer le test');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLogout = useCallback(() => {
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vraiment vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: () => logout(),
                },
            ]
        );
    }, [logout]);

    // Séparer le composant EditModal pour éviter les re-renders
    const EditModalContent = useMemo(() => {
        if (!showEditModal) return null;

        const handleClose = () => {
            setShowEditModal(false);
            setEditField(null);
            setEditValue('');
        };

        return (
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={handleClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Modifier {editField === 'direction' ? 'la direction' :
                            editField === 'departement' ? 'le département' :
                                'le service'}
                        </Text>

                        <TextInput
                            style={styles.editInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholder={`Entrez ${editField === 'direction' ? 'la direction' :
                                editField === 'departement' ? 'le département' :
                                    'le service'}`}
                            placeholderTextColor="#9ca3af"
                        />

                        {availableOptions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <Text style={styles.suggestionsTitle}>Suggestions :</Text>
                                <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
                                    {availableOptions.map((option, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.suggestionItem}
                                            onPress={() => handleSelectOption(option)}>
                                            <Text style={styles.suggestionText}>{option}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleClose}>
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveEdit}>
                                <Text style={styles.saveButtonText}>Enregistrer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }, [showEditModal, editField, editValue, availableOptions, handleSelectOption, handleSaveEdit]);

    // Données statiques pour éviter les re-renders
    const frequencyOptions = useMemo(() => [15, 30, 60, 120], []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={32} color="#fff" />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {user?.Prenom} {user?.Nom}
                        </Text>
                        <Text style={styles.userMatricule}>
                            Matricule: {user?.Num_matricule}
                        </Text>
                        <Text style={styles.userCin}>
                            CIN: {user?.Cin}
                        </Text>
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="notifications" size={24} color="#3f51b5" />
                        <Text style={styles.sectionTitle}>Rappels de tâches</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Activer les rappels</Text>
                                <Text style={styles.settingDescription}>
                                    Recevoir des rappels pour les tâches non complétées
                                </Text>
                            </View>
                            <Switch
                                value={settings.notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={settings.notificationsEnabled ? '#3f51b5' : '#f3f4f6'}
                                disabled={isLoading}
                            />
                        </View>

                        {settings.notificationsEnabled && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        Intervalle de rappel (minutes)
                                    </Text>
                                    <View style={styles.frequencyButtons}>
                                        {frequencyOptions.map(freq => (
                                            <TouchableOpacity
                                                key={freq}
                                                style={[
                                                    styles.frequencyButton,
                                                    settings.notificationFrequency === freq && styles.frequencyButtonActive
                                                ]}
                                                onPress={() => handleChangeFrequency(freq)}>
                                                <Text style={[
                                                    styles.frequencyText,
                                                    settings.notificationFrequency === freq && styles.frequencyTextActive
                                                ]}>
                                                    {freq} min
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <Text style={styles.helpText}>
                                        Vous recevrez un rappel toutes les {settings.notificationFrequency} minutes
                                    </Text>
                                </View>

                                {/*<View style={styles.statusCard}>*/}
                                {/*    <View style={styles.statusRow}>*/}
                                {/*        <Ionicons name="checkmark-circle" size={20} color="#10b981" />*/}
                                {/*        <Text style={styles.statusText}>*/}
                                {/*            {remindersStatus.scheduledCount} rappels programmés*/}
                                {/*        </Text>*/}
                                {/*    </View>*/}
                                {/*    <TouchableOpacity*/}
                                {/*        style={styles.testButton}*/}
                                {/*        onPress={handleTestReminder}*/}
                                {/*        disabled={isLoading}>*/}
                                {/*        <Ionicons name="send" size={16} color="#3f51b5" />*/}
                                {/*        <Text style={styles.testButtonText}>Tester maintenant</Text>*/}
                                {/*    </TouchableOpacity>*/}
                                {/*</View>*/}
                            </>
                        )}
                    </View>
                </View>

                // Ajouter un nouveau champ dans les paramètres
                // Après la section "Informations Professionnelles", ajouter :

                {/* Email de destination pour les rapports */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="mail" size={24} color="#3f51b5" />
                        <Text style={styles.sectionTitle}>Configuration des rapports</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email de destination des rapports</Text>
                            <View style={styles.emailInputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#3f51b5" />
                                <TextInput
                                    style={styles.emailInput}
                                    value={settings.reportEmail || ''}
                                    onChangeText={(text) => setSettings(prev => ({
                                        ...prev,
                                        reportEmail: text.trim()
                                    }))}
                                    placeholder="email@example.com"
                                    placeholderTextColor="#64748b"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            <Text style={styles.helpText}>
                                L'adresse email qui recevra les rapports générés
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Informations Professionnelles */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="business" size={24} color="#3f51b5" />
                        <Text style={styles.sectionTitle}>Informations Professionnelles</Text>
                    </View>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Direction</Text>
                                <Text style={styles.settingValue}>
                                    {settings.direction || 'Non spécifiée'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleOpenEditModal('direction')}>
                                <Ionicons name="create-outline" size={20} color="#3f51b5" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Département</Text>
                                <Text style={styles.settingValue}>
                                    {settings.departement || 'Non spécifié'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleOpenEditModal('departement')}>
                                <Ionicons name="create-outline" size={20} color="#3f51b5" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Service</Text>
                                <Text style={styles.settingValue}>
                                    {settings.service || 'Non spécifié'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => handleOpenEditModal('service')}>
                                <Ionicons name="create-outline" size={20} color="#3f51b5" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveMainButton, isLoading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading}
                    activeOpacity={0.8}>
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="save" size={20} color="#fff" />
                            <Text style={styles.saveMainButtonText}>Enregistrer les paramètres</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.8}>
                    <Ionicons name="log-out" size={20} color="#ef4444" />
                    <Text style={styles.logoutButtonText}>Se déconnecter</Text>
                </TouchableOpacity>
            </ScrollView>

            {EditModalContent}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    emailInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    emailInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#f8fafc',
        padding: 0,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3f51b5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 4,
    },
    userMatricule: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 2,
    },
    userCin: {
        fontSize: 12,
        color: '#64748b',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginLeft: 8,
    },
    settingCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 2,
    },
    settingValue: {
        fontSize: 13,
        color: '#94a3b8',
    },
    settingDescription: {
        fontSize: 12,
        color: '#64748b',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3f51b5',
    },
    inputGroup: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#94a3b8',
        marginBottom: 12,
    },
    frequencyButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    frequencyButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
    },
    frequencyButtonActive: {
        backgroundColor: '#3f51b5',
        borderColor: '#3f51b5',
    },
    frequencyText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    frequencyTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    helpText: {
        fontSize: 12,
        color: '#64748b',
        fontStyle: 'italic',
    },
    statusCard: {
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusText: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: '600',
        marginLeft: 8,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3f51b5',
        gap: 6,
    },
    testButtonText: {
        fontSize: 14,
        color: '#3f51b5',
        fontWeight: '600',
    },
    saveMainButton: {
        backgroundColor: '#3f51b5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveMainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
        gap: 8,
    },
    logoutButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 20,
        textAlign: 'center',
    },
    editInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#f8fafc',
        marginBottom: 16,
    },
    suggestionsContainer: {
        marginBottom: 20,
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 8,
    },
    suggestionsList: {
        maxHeight: 200,
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    suggestionItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    suggestionText: {
        fontSize: 14,
        color: '#f8fafc',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#334155',
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#3f51b5',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SettingsScreen;