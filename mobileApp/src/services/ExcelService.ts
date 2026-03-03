// src/services/ExcelService.ts
import * as FileSystem from 'expo-file-system/legacy'; // Utilisation de l'API legacy
import * as Sharing from 'expo-sharing';
import { AuthService } from './AuthService';
import { dataService } from './DataService';
import { API_ENDPOINTS } from '../constants/config';
import { Platform } from 'react-native';
import { getSettings } from './AsyncStorageService';

interface ReportData {
    matricule: string;
    direction: string;
    departement: string;
    service?: string;
    id_activite: string;
    code_activite: string;
    temps: number;
    periode: string;
    date: string;
    libelle_activite: string;
    flag: string; // Nouveau champ
}

// Vérifier si FileSystem est disponible
const isFileSystemAvailable = (): boolean => {
    return !!(FileSystem && FileSystem.documentDirectory);
};

// Obtenir un chemin de fichier temporaire
const getFilePath = (filename: string): string => {
    if (isFileSystemAvailable()) {
        return FileSystem.documentDirectory + filename;
    } else {
        return `${FileSystem.cacheDirectory || ''}${filename}`;
    }
};

// Fonction helper pour écrire un fichier avec compatibilité
const writeFile = async (uri: string, content: string): Promise<void> => {
    try {
        // Essayer avec EncodingType.UTF8
        if (FileSystem.EncodingType && FileSystem.EncodingType.UTF8) {
            await FileSystem.writeAsStringAsync(uri, content, {
                encoding: FileSystem.EncodingType.UTF8,
            });
        } else {
            // Fallback
            await FileSystem.writeAsStringAsync(uri, content);
        }
    } catch (error) {
        // Dernier recours
        await FileSystem.writeAsStringAsync(uri, content);
    }
};

export const ExcelService = {
    // Générer les données du rapport
    generateReportData: async (period: string): Promise<ReportData[]> => {
        try {
            console.log(`📊 Génération des données pour la période: ${period}`);
            const history = await AuthService.getHistory();
            const user = await AuthService.getCurrentUser();

            if (!user) {
                throw new Error('Utilisateur non connecté');
            }

            // Filtrer l'historique par période
            const [month, year] = period.split('/').map(Number);
            const filteredHistory = history.filter(log => {
                const logDate = new Date(log.Date_activite);
                return logDate.getMonth() + 1 === month &&
                    logDate.getFullYear() === 2000 + year;
            });

            console.log(`📈 Historique filtré: ${filteredHistory.length} activités`);

            // Préparer les données
            const reportData: ReportData[] = await Promise.all(
                filteredHistory.map(async (log) => {
                    const activity = dataService.getActivityById(log.Id_activite);
                    const logDate = new Date(log.Date_activite);

                    return {
                        matricule: user.Num_matricule,
                        direction: user.Direction,
                        departement: user.Departement,
                        service: user.Service,
                        id_activite: log.Id_activite,
                        code_activite: activity?.Code_activite || 'N/A',
                        temps: log.Duree,
                        periode: period,
                        date: logDate.toISOString().split('T')[0],
                        libelle_activite: activity?.Libelle_activite || log.Libelle_activite || 'N/A',
                        flag: log.Flag || '', // Ajout du flag
                    };
                })
            );

            console.log(`✅ Données générées: ${reportData.length} lignes`);
            return reportData;
        } catch (error) {
            console.error('❌ Erreur lors de la génération des données:', error);
            throw error;
        }
    },

    // Générer le fichier TXT avec point-virgule comme séparateur
    generateTxtFile: async (data: ReportData[], filename: string): Promise<string> => {
        try {
            console.log('📝 Début de la génération du fichier TXT...');

            // Vérifier que nous avons des données
            if (!data || data.length === 0) {
                throw new Error('Aucune donnée à exporter');
            }

            // En-têtes du fichier avec la nouvelle colonne Flag
            const headers = [
                'Matricule',
                'Direction',
                'Departement',
                'Service',
                'ID_Activite',
                'Code_Activite',
                'Libelle_Activite',
                'Temps(min)',
                'Periode',
                'Date',
                'Flag' // Nouvelle colonne
            ];

            // Convertir les données en lignes CSV avec point-virgule
            const rows = data.map(item => [
                item.matricule || '',
                item.direction || '',
                item.departement || '',
                item.service || '',
                item.id_activite || '',
                item.code_activite || '',
                item.libelle_activite || '',
                item.temps?.toString() || '0',
                item.periode || '',
                item.date || '',
                item.flag || '' // Ajout du flag
            ]);

            // Créer le contenu du fichier
            let content = '';

            // Ajouter l'en-tête
            content += headers.join(';') + '\n';

            // Ajouter les données
            rows.forEach(row => {
                content += row.join(';') + '\n';
            });

            // Vérifier si FileSystem est disponible
            if (!isFileSystemAvailable()) {
                console.log('⚠️ FileSystem non disponible, utilisation du mode fallback');
                // Pour React Native, créer un fichier dans le cache
                const tempUri = FileSystem.cacheDirectory + filename;
                await writeFile(tempUri, content);
                return tempUri;
            }

            // FileSystem est disponible
            const uri = getFilePath(filename);
            console.log(`📁 URI du fichier: ${uri}`);

            // Écrire le fichier
            await writeFile(uri, content);

            // Vérifier si le fichier a été créé
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
                throw new Error('Le fichier n\'a pas été créé');
            }

            console.log(`✅ Fichier TXT généré avec succès: ${uri}`);
            console.log(`📏 Taille du fichier: ${fileInfo.size} bytes`);
            console.log(`📊 Nombre de lignes: ${data.length + 1}`);

            return uri;
        } catch (error) {
            console.error('❌ Erreur lors de la génération du fichier TXT:', error);

            // En cas d'erreur, créer un fichier dans le cache
            const fallbackUri = FileSystem.cacheDirectory + 'fallback_report.txt';
            const fallbackContent = 'Données non disponibles pour générer le fichier';

            try {
                await writeFile(fallbackUri, fallbackContent);
                console.log(`✅ Fichier de secours généré: ${fallbackUri}`);
                return fallbackUri;
            } catch (fallbackError) {
                console.error('❌ Impossible de créer le fichier de secours:', fallbackError);
                throw error;
            }
        }
    },

    // Envoyer le rapport standard par email
    sendReportByEmail: async (period: string): Promise<any> => {
        try {
            console.log(`📤 Envoi du rapport standard pour la période: ${period}`);

            // Récupérer l'email depuis les paramètres
            const userSettings = await getSettings();
            const recipientEmail = userSettings.reportEmail || 'handrianasinoro@gmail.com';

            if (!recipientEmail) {
                throw new Error('Aucun email de destination configuré. Veuillez le configurer dans les paramètres.');
            }

            console.log(`📧 Destinataire: ${recipientEmail}`);

            // Générer les données
            const reportData = await ExcelService.generateReportData(period);

            if (reportData.length === 0) {
                throw new Error('Aucune donnée à exporter pour cette période');
            }

            // Générer le fichier TXT
            const filename = `rapport_activites_${period.replace('/', '_')}.txt`;
            const fileUri = await ExcelService.generateTxtFile(reportData, filename);

            // Vérifier si le fichier existe
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                throw new Error('Fichier non trouvé');
            }

            // IMPORTANT: Pour React Native, formater correctement le fichier
            // Pour Android, nous avons besoin du chemin réel du fichier
            let fileUriForUpload = fileUri;

            // Si c'est un URI de cache sur Android, nous pouvons l'utiliser directement
            if (Platform.OS === 'android') {
                // Sur Android, les fichiers du cache sont accessibles
                if (fileUri.startsWith('file://')) {
                    fileUriForUpload = fileUri;
                } else if (fileUri.startsWith('content://')) {
                    fileUriForUpload = fileUri;
                } else {
                    // Ajouter le préfixe file:// si absent
                    fileUriForUpload = `file://${fileUri}`;
                }
            }

            // Préparer le fichier pour FormData
            const fileObject = {
                uri: fileUriForUpload,
                type: 'text/plain',
                name: filename,
            };

            // Créer FormData
            const formData = new FormData();
            formData.append('to', recipientEmail); // Utiliser l'email configuré
            formData.append('subject', `Rapport d'activités BFM - ${period}`);
            formData.append('message', `Veuillez trouver ci-joint le rapport des activités pour la période ${period}.\n\nFormat: TXT avec séparateur point-virgule\nNombre d'activités: ${reportData.length}\nTemps total: ${reportData.reduce((sum, item) => sum + item.temps, 0)} minutes`);
            formData.append('periode', period);
            formData.append('file', fileObject as any);

            console.log('📧 Envoi du rapport standard...');
            console.log('📎 Fichier à envoyer:', fileUriForUpload);
            console.log('🎯 Destinataire:', recipientEmail);

            // Envoyer à l'API
            const response = await fetch(API_ENDPOINTS.SEND_EMAIL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur API:', response.status, errorText);

                // Si l'erreur est liée au fichier, essayer sans fichier
                if (response.status === 413 || errorText.includes('file') || errorText.includes('size')) {
                    console.log('🔄 Tentative sans fichier joint...');

                    // Réessayer sans fichier
                    const formDataWithoutFile = new FormData();
                    formDataWithoutFile.append('to', recipientEmail);
                    formDataWithoutFile.append('subject', `Rapport d'activités BFM - ${period}`);
                    formDataWithoutFile.append('message', `Rapport des activités pour la période ${period}.\n\nNombre d'activités: ${reportData.length}\nTemps total: ${reportData.reduce((sum, item) => sum + item.temps, 0)} minutes\n\nNote: Le fichier joint n'a pas pu être envoyé en raison de restrictions de taille.`);
                    formDataWithoutFile.append('periode', period);

                    const retryResponse = await fetch(API_ENDPOINTS.SEND_EMAIL, {
                        method: 'POST',
                        body: formDataWithoutFile,
                    });

                    if (!retryResponse.ok) {
                        const retryError = await retryResponse.text();
                        throw new Error(`Erreur lors de l'envoi (sans fichier): ${retryResponse.status} - ${retryError}`);
                    }

                    const retryResult = await retryResponse.json();
                    console.log('✅ Rapport envoyé sans fichier:', retryResult);
                    return retryResult;
                }

                throw new Error(`Erreur lors de l'envoi: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Rapport standard envoyé avec succès:', result);

            // Sauvegarder dans l'historique
            await AuthService.addNotification({
                type: 'report_sent',
                title: 'Rapport standard envoyé',
                message: `Rapport TXT pour ${period} envoyé à ${recipientEmail} (${reportData.length} activités)`,
                date: new Date().toISOString(),
                read: false,
            });

            return result;
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du rapport standard:', error);

            // Solution de secours: partager localement
            console.log('🔄 Tentative de partage local en secours...');
            try {
                // Récupérer l'email depuis les paramètres pour le message
                const userSettings = await getSettings();
                const recipientEmail = userSettings.reportEmail || 'handrianasinoro@gmail.com';

                // Générer un message simple à partager
                const reportData = await ExcelService.generateReportData(period);
                const totalMinutes = reportData.reduce((sum, item) => sum + item.temps, 0);

                const message = `📊 Rapport BFM Activités - ${period}\n` +
                    `Activités: ${reportData.length}\n` +
                    `Temps total: ${totalMinutes} minutes\n` +
                    `Destinataire: ${recipientEmail}\n\n` +
                    `Note: L'envoi automatique a échoué. Veuillez copier ce message et l'envoyer manuellement.`;

                // Partager le message texte seulement
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync({
                        message: message,
                        title: `Rapport BFM - ${period}`,
                    });
                    throw new Error(`Rapport partagé localement (email non envoyé automatiquement à ${recipientEmail})`);
                } else {
                    throw new Error('Impossible de partager localement: fonctionnalité non disponible');
                }
            } catch (shareError) {
                console.error('❌ Partage local également échoué:', shareError);
                throw error;
            }
        }
    },

    // Envoyer un rapport détaillé par email
    sendDetailedReportByEmail: async (period: string): Promise<any> => {
        try {
            console.log(`📤 Envoi du rapport détaillé pour: ${period}`);

            // Récupérer l'email depuis les paramètres
            const userSettings = await getSettings();
            const recipientEmail = userSettings.reportEmail || 'handrianasinoro@gmail.com';

            if (!recipientEmail) {
                throw new Error('Aucun email de destination configuré. Veuillez le configurer dans les paramètres.');
            }

            console.log(`📧 Destinataire détaillé: ${recipientEmail}`);

            // Générer les données
            const reportData = await ExcelService.generateReportData(period);

            if (reportData.length === 0) {
                throw new Error('Aucune donnée à exporter pour cette période');
            }

            // Calculer les statistiques
            const totalMinutes = reportData.reduce((sum, item) => sum + item.temps, 0);
            const totalHours = (totalMinutes / 60).toFixed(2);
            const uniqueActivities = [...new Set(reportData.map(item => item.id_activite))].length;
            const averagePerActivity = reportData.length > 0 ? (totalMinutes / reportData.length).toFixed(1) : '0.0';
            const maxTime = Math.max(...reportData.map(item => item.temps));
            const minTime = Math.min(...reportData.map(item => item.temps));

            // Créer le contenu détaillé
            let content = '=== RAPPORT DETAILLE DES ACTIVITES BFM ===\n\n';
            content += `Période: ${period}\n`;
            content += `Date de génération: ${new Date().toLocaleDateString('fr-FR')}\n`;
            content += `Heure de génération: ${new Date().toLocaleTimeString('fr-FR')}\n\n`;

            content += '=== STATISTIQUES ===\n';
            content += `Nombre total d'activités: ${reportData.length}\n`;
            content += `Nombre d'activités uniques: ${uniqueActivities}\n`;
            content += `Temps total: ${totalMinutes} minutes (${totalHours} heures)\n`;
            content += `Temps moyen par activité: ${averagePerActivity} minutes\n`;
            content += `Activité la plus longue: ${maxTime} minutes\n`;
            content += `Activité la plus courte: ${minTime} minutes\n\n`;

            // En-têtes avec colonne Flag
            content += '=== DONNEES DETAILLEES ===\n';
            content += 'Matricule;Direction;Departement;Service;ID_Activite;Code_Activite;Libelle_Activite;Temps(min);Date;Flag\n';

            // Données avec flag
            reportData.forEach(item => {
                content += [
                    item.matricule,
                    item.direction,
                    item.departement,
                    item.service || '',
                    item.id_activite,
                    item.code_activite,
                    item.libelle_activite,
                    item.temps,
                    item.date,
                    item.flag || '' // Ajout du flag
                ].join(';') + '\n';
            });

            // Générer le fichier détaillé
            const filename = `rapport_detaille_${period.replace('/', '_')}.txt`;
            const fileUri = getFilePath(filename);

            await writeFile(fileUri, content);

            // Vérifier si le fichier existe
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                throw new Error('Fichier non créé');
            }

            // Préparer le fichier pour FormData
            let fileUriForUpload = fileUri;
            if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
                fileUriForUpload = `file://${fileUri}`;
            }

            const fileObject = {
                uri: fileUriForUpload,
                type: 'text/plain',
                name: filename,
            };

            // Créer FormData
            const formData = new FormData();
            formData.append('to', recipientEmail); // Utiliser l'email configuré
            formData.append('subject', `Rapport détaillé BFM - ${period}`);
            formData.append('message', `Veuillez trouver ci-joint le rapport détaillé des activités pour la période ${period}.\n\nSTATISTIQUES:\n- Nombre d'activités: ${reportData.length}\n- Activités uniques: ${uniqueActivities}\n- Temps total: ${totalMinutes} minutes (${totalHours} heures)\n- Temps moyen: ${averagePerActivity} minutes/activité\n\nFormat: TXT avec séparateur point-virgule`);
            formData.append('periode', period);
            formData.append('file', fileObject as any);

            console.log('📧 Envoi du rapport détaillé...');
            console.log('🎯 Destinataire:', recipientEmail);

            // Envoyer à l'API
            const response = await fetch(API_ENDPOINTS.SEND_EMAIL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur API pour rapport détaillé:', response.status, errorText);
                throw new Error(`Erreur lors de l'envoi du rapport détaillé: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Rapport détaillé envoyé avec succès:', result);

            // Sauvegarder dans l'historique
            await AuthService.addNotification({
                type: 'detailed_report_sent',
                title: 'Rapport détaillé envoyé',
                message: `Rapport détaillé pour ${period} envoyé à ${recipientEmail} (${reportData.length} activités)`,
                date: new Date().toISOString(),
                read: false,
            });

            return result;
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi du rapport détaillé:', error);

            // Solution de secours: envoyer le rapport standard
            console.log('🔄 Tentative d\'envoi standard en secours...');
            try {
                const result = await ExcelService.sendReportByEmail(period);
                throw new Error(`Rapport standard envoyé à la place (détaillé échoué): ${result.message || ''}`);
            } catch (standardError) {
                console.error('❌ Envoi standard également échoué:', standardError);
                throw error;
            }
        }
    },

    // Partager le fichier (version corrigée)
    shareReport: async (period: string): Promise<void> => {
        try {
            console.log(`🔗 Partage du rapport pour: ${period}`);
            const reportData = await ExcelService.generateReportData(period);

            if (reportData.length === 0) {
                throw new Error('Aucune donnée à exporter pour cette période');
            }

            const filename = `rapport_activites_${period.replace('/', '_')}.txt`;

            // Vérifier si Sharing est disponible
            if (!(await Sharing.isAvailableAsync())) {
                throw new Error('Le partage n\'est pas disponible sur cet appareil');
            }

            // Générer un fichier physique
            const fileUri = await ExcelService.generateTxtFile(reportData, filename);

            // CORRECTION: Utiliser directement l'URI du fichier
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/plain',
                dialogTitle: `Partager le rapport - ${period}`,
                UTI: 'public.plain-text',
            });

            console.log('✅ Rapport partagé avec succès');
            return;

        } catch (error) {
            console.error('❌ Erreur lors du partage du rapport:', error);
            throw error;
        }
    },

    // Partager le rapport directement (CORRIGÉ)
    shareReportDirectly: async (period: string): Promise<void> => {
        try {
            console.log(`📤 Partage direct du rapport pour: ${period}`);
            const reportData = await ExcelService.generateReportData(period);

            if (reportData.length === 0) {
                throw new Error('Aucune donnée à exporter pour cette période');
            }

            // En-têtes avec colonne Flag
            const headers = ['Matricule', 'Direction', 'Departement', 'Service',
                'ID_Activite', 'Code_Activite', 'Libelle_Activite',
                'Temps(min)', 'Periode', 'Date', 'Flag'];

            const rows = reportData.map(item => [
                item.matricule,
                item.direction,
                item.departement,
                item.service || '',
                item.id_activite,
                item.code_activite,
                item.libelle_activite,
                item.temps.toString(),
                item.periode,
                item.date,
                item.flag || '' // Ajout du flag
            ]);

            let content = headers.join(';') + '\n';
            rows.forEach(row => {
                content += row.join(';') + '\n';
            });

            // Calculer le total
            const totalMinutes = reportData.reduce((sum, item) => sum + item.temps, 0);
            const totalHours = (totalMinutes / 60).toFixed(2);

            // Vérifier si Sharing est disponible
            if (!(await Sharing.isAvailableAsync())) {
                throw new Error('Le partage n\'est pas disponible sur cet appareil');
            }

            // CORRECTION: Créer un fichier temporaire d'abord
            const tempFilename = `rapport_${period.replace('/', '_')}_${Date.now()}.txt`;
            const tempUri = getFilePath(tempFilename);

            // Sauvegarder le contenu dans un fichier
            await writeFile(tempUri, content);

            // CORRECTION: Partager le fichier directement
            await Sharing.shareAsync(tempUri, {
                mimeType: 'text/plain',
                dialogTitle: `Rapport BFM - ${period}`,
                UTI: 'public.plain-text',
            });

            console.log('✅ Rapport partagé directement');

            // Nettoyer le fichier temporaire après un délai
            setTimeout(async () => {
                try {
                    await FileSystem.deleteAsync(tempUri);
                } catch (e) {
                    // Ignorer les erreurs de nettoyage
                }
            }, 10000);

        } catch (error) {
            console.error('❌ Erreur lors du partage direct:', error);
            throw error;
        }
    },

    // Fonction pour tester FileSystem
    testFileSystem: async (): Promise<boolean> => {
        try {
            console.log('🧪 Test du FileSystem...');

            // Test 1: Vérifier la disponibilité
            const available = isFileSystemAvailable();
            console.log('✅ FileSystem disponible:', available);

            if (!available) {
                console.log('ℹ️ FileSystem non disponible, utilisation des fallbacks');
                return true; // Ce n'est pas une erreur, on a des fallbacks
            }

            // Test 2: Essayer d'écrire un fichier
            const testUri = getFilePath('test_file.txt');
            const testContent = 'Ceci est un test d\'écriture de fichier.';

            try {
                await writeFile(testUri, testContent);
                console.log('✅ Test d\'écriture réussi');

                // Vérifier le fichier
                const fileInfo = await FileSystem.getInfoAsync(testUri);
                console.log('📁 Fichier créé:', fileInfo.exists, 'Taille:', fileInfo.size);

                // Nettoyer
                await FileSystem.deleteAsync(testUri);
                console.log('🧹 Fichier test nettoyé');

                return true;
            } catch (writeError) {
                console.error('❌ Test d\'écriture échoué:', writeError);
                return false;
            }
        } catch (error) {
            console.error('❌ FileSystem test échoué:', error);
            return false;
        }
    },

    // Fonction pour tester l'API d'envoi d'email
    testEmailAPI: async (): Promise<boolean> => {
        try {
            console.log('🧪 Test de l\'API email...');

            // Récupérer l'email depuis les paramètres
            const userSettings = await getSettings();
            const recipientEmail = userSettings.reportEmail || 'handrianasinoro@gmail.com';

            // Créer des données de test sans fichier
            const testFormData = new FormData();
            testFormData.append('to', recipientEmail);
            testFormData.append('subject', 'Test API Email - BFM Activités');
            testFormData.append('message', 'Ceci est un test de l\'API d\'envoi d\'email depuis l\'application BFM Activités.');
            testFormData.append('periode', 'Test');

            // Test simple sans fichier
            const response = await fetch(API_ENDPOINTS.SEND_EMAIL, {
                method: 'POST',
                body: testFormData,
            });

            console.log('📡 Réponse API:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API email test échoué:', response.status, errorText);
                return false;
            }

            const result = await response.json();
            console.log('✅ API email fonctionnelle:', result);
            return true;
        } catch (error) {
            console.error('❌ Erreur lors du test de l\'API:', error);
            return false;
        }
    },

    // Générer un rapport détaillé (pour téléchargement local)
    generateDetailedReport: async (period: string): Promise<string> => {
        try {
            console.log(`📈 Génération du rapport détaillé pour: ${period}`);
            const reportData = await ExcelService.generateReportData(period);

            if (reportData.length === 0) {
                throw new Error('Aucune donnée à exporter pour cette période');
            }

            // Calculer les statistiques
            const totalMinutes = reportData.reduce((sum, item) => sum + item.temps, 0);
            const totalHours = (totalMinutes / 60).toFixed(2);
            const uniqueActivities = [...new Set(reportData.map(item => item.id_activite))].length;
            const averagePerActivity = reportData.length > 0 ? (totalMinutes / reportData.length).toFixed(1) : '0.0';

            // Créer le contenu détaillé
            let content = '=== RAPPORT DETAILLE DES ACTIVITES BFM ===\n\n';

            // En-tête du rapport
            content += `Période: ${period}\n`;
            content += `Date de génération: ${new Date().toLocaleDateString('fr-FR')}\n`;
            content += `Heure de génération: ${new Date().toLocaleTimeString('fr-FR')}\n\n`;

            // Statistiques
            content += '=== STATISTIQUES ===\n';
            content += `Nombre total d'activités: ${reportData.length}\n`;
            content += `Nombre d'activités uniques: ${uniqueActivities}\n`;
            content += `Temps total: ${totalMinutes} minutes (${totalHours} heures)\n`;
            content += `Temps moyen par activité: ${averagePerActivity} minutes\n\n`;

            // En-têtes avec colonne Flag
            content += '=== DONNEES DETAILLEES ===\n';
            content += 'Matricule;Direction;Departement;Service;ID_Activite;Code_Activite;Libelle_Activite;Temps(min);Date;Flag\n';

            // Données détaillées avec flag
            reportData.forEach(item => {
                content += [
                    item.matricule,
                    item.direction,
                    item.departement,
                    item.service || '',
                    item.id_activite,
                    item.code_activite,
                    item.libelle_activite,
                    item.temps,
                    item.date,
                    item.flag || '' // Ajout du flag
                ].join(';') + '\n';
            });

            // Sauvegarder le fichier
            const filename = `rapport_detaille_${period.replace('/', '_')}.txt`;
            const uri = getFilePath(filename);

            // Utiliser la méthode d'écriture
            await writeFile(uri, content);

            console.log(`✅ Rapport détaillé généré: ${uri}`);
            return uri;
        } catch (error) {
            console.error('❌ Erreur lors de la génération du rapport détaillé:', error);
            throw error;
        }
    },
};