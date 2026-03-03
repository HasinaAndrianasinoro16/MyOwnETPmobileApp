import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour avoir __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExcelConverter {
    constructor(config = {}) {
        // ==================== CONFIGURATION DES CHEMINS ABSOLUS ====================
        // MODIFIEZ CES CHEMINS SELON VOTRE ENVIRONNEMENT

        // CHEMINS ABSOLUS VERS VOS FICHIERS EXCEL
        this.employeesExcelPath = config.employeesExcelPath ||
            path.resolve('D:\\my work\\BFM\\etp-mobile-app-version-1.0\\etp-mobile-app-version-1.0\\mobileApp\\backend\\excel_files\\ETP_T_AGENT.xls');

        this.activitiesExcelPath = config.activitiesExcelPath ||
            path.resolve('D:\\my work\\BFM\\etp-mobile-app-version-1.0\\etp-mobile-app-version-1.0\\mobileApp\\backend\\excel_files\\ETP_PROCESSUS_ACTIVITE_NEW.XLSX');

        // CHEMINS ABSOLUS POUR LES FICHIERS JSON DE SORTIE
        this.jsonOutputDir = config.jsonOutputDir ||
            path.resolve('D:\\my work\\BFM\\etp-mobile-app-version-1.0\\etp-mobile-app-version-1.0\\mobileApp\\backend\\data');

        // CHEMIN ABSOLU VERS LE FRONTEND (optionnel)
        this.frontendDataDir = config.frontendDataDir ||
            path.resolve('D:\\my work\\BFM\\etp-mobile-app-version-1.0\\etp-mobile-app-version-1.0\\mobileApp\\src\\data');

        // ==================== AFFICHAGE DE LA CONFIGURATION ====================
        console.log('⚙️  CONFIGURATION DES CHEMINS ABSOLUS');
        console.log('══════════════════════════════════════════');
        console.log(`📄 Fichier employés:`);
        console.log(`   ${this.employeesExcelPath}`);
        console.log(`\n📄 Fichier activités:`);
        console.log(`   ${this.activitiesExcelPath}`);
        console.log(`\n📁 Sortie JSON:`);
        console.log(`   ${this.jsonOutputDir}`);
        console.log(`\n📁 Frontend (copie):`);
        console.log(`   ${this.frontendDataDir}`);
        console.log('══════════════════════════════════════════\n');

        // Créer les dossiers s'ils n'existent pas
        this.createDirectories();
    }

    createDirectories() {
        const directories = [
            path.dirname(this.employeesExcelPath), // Dossier des fichiers Excel
            this.jsonOutputDir,                    // Dossier de sortie JSON
            this.frontendDataDir                   // Dossier frontend
        ];

        directories.forEach(dir => {
            if (dir && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Dossier créé: ${dir}`);
            }
        });
    }

    checkExcelFiles() {
        console.log('🔍 VÉRIFICATION DES FICHIERS EXCEL');
        console.log('══════════════════════════════════════════');

        const files = [
            {
                path: this.employeesExcelPath,
                name: 'ETP_T_AGENT.xls',
                type: 'EMPLOYÉS'
            },
            {
                path: this.activitiesExcelPath,
                name: 'ETP_PROCESSUSS_ACTIVITE_NEW.xlsx',
                type: 'ACTIVITÉS'
            }
        ];

        let allFilesExist = true;

        files.forEach(file => {
            console.log(`\n📋 ${file.type}:`);

            if (fs.existsSync(file.path)) {
                try {
                    const stats = fs.statSync(file.path);
                    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

                    console.log(`   ✅ FICHIER TROUVÉ`);
                    console.log(`   📄 Nom: ${file.name}`);
                    console.log(`   📊 Taille: ${fileSizeMB} MB`);
                    console.log(`   📅 Dernière modification: ${stats.mtime.toLocaleString('fr-FR')}`);
                    console.log(`   📍 Chemin: ${file.path}`);

                    // Vérifier que c'est bien un fichier Excel
                    if (path.extname(file.name).toLowerCase() === '.xls' ||
                        path.extname(file.name).toLowerCase() === '.xlsx') {
                        console.log(`   ✅ Format Excel valide`);
                    } else {
                        console.log(`   ⚠️  Attention: Extension non standard`);
                    }

                } catch (error) {
                    console.log(`   ❌ ERREUR D'ACCÈS: ${error.message}`);
                    allFilesExist = false;
                }
            } else {
                console.log(`   ❌ FICHIER INTROUVABLE`);
                console.log(`   📄 Fichier attendu: ${file.name}`);
                console.log(`   📍 Chemin recherché: ${file.path}`);
                console.log(`   💡 Vérifiez que le fichier existe à cet emplacement`);

                // Suggestion d'emplacement
                console.log(`\n   💡 SUGGESTION: Placez le fichier à l'emplacement suivant:`);
                console.log(`      ${file.path}`);

                allFilesExist = false;
            }
        });

        return allFilesExist;
    }

    convertExcelToJson(filePath, fileType) {
        try {
            console.log(`\n🔄 CONVERSION ${fileType.toUpperCase()}: ${path.basename(filePath)}`);

            if (!fs.existsSync(filePath)) {
                throw new Error(`Fichier introuvable: ${filePath}`);
            }

            // Lire le fichier Excel
            console.log(`   📖 Lecture du fichier...`);
            const workbook = XLSX.readFile(filePath, {
                cellDates: true,
                dateNF: 'yyyy-mm-dd',
                sheetStubs: true
            });

            // Utiliser la première feuille
            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];

            if (!sheet) {
                throw new Error(`Feuille "${firstSheetName}" non trouvée`);
            }

            console.log(`   📋 Feuille: ${firstSheetName}`);

            // Convertir en JSON
            console.log(`   🔄 Conversion en JSON...`);
            const jsonData = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                defval: '',
                raw: false,
                dateNF: 'yyyy-mm-dd'
            });

            console.log(`   ✅ ${jsonData.length} lignes lues`);

            if (jsonData.length < 2) {
                console.warn(`   ⚠️  Fichier vide ou contenant seulement les en-têtes`);
                return [];
            }

            // Extraire les en-têtes
            const headers = jsonData[0].map(header => {
                if (typeof header === 'string') {
                    return header.trim()
                        .replace(/\s+/g, '_')
                        .replace(/[^\w_]/g, '')
                        .toUpperCase();
                }
                return `COLONNE_${String(header).toUpperCase()}`;
            });

            console.log(`   📊 ${headers.length} colonnes détectées`);

            // Afficher les en-têtes (pour débogage)
            if (headers.length > 0) {
                console.log(`   📝 En-têtes: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`);
            }

            // Convertir les lignes en objets
            const data = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const obj = {};

                headers.forEach((header, colIndex) => {
                    let value = row[colIndex];

                    // Gérer les valeurs nulles
                    if (value === null || value === undefined || value === '') {
                        obj[header] = '';
                        return;
                    }

                    // Traitement spécial pour la colonne SEXE (1=Homme, 2=Femme)
                    if (header === 'SEXE' || header.includes('SEXE')) {
                        if (typeof value === 'number') {
                            obj[header] = value; // Garde 1 ou 2
                        } else if (typeof value === 'string') {
                            const trimmed = value.trim();
                            if (trimmed === '1' || trimmed === '2') {
                                obj[header] = parseInt(trimmed);
                            } else if (trimmed.toLowerCase() === 'm' || trimmed.toLowerCase() === 'masculin' || trimmed.toLowerCase() === 'homme') {
                                obj[header] = 1;
                            } else if (trimmed.toLowerCase() === 'f' || trimmed.toLowerCase() === 'feminin' || trimmed.toLowerCase() === 'femme') {
                                obj[header] = 2;
                            } else {
                                // Par défaut: Homme
                                obj[header] = 1;
                            }
                        } else {
                            obj[header] = 1;
                        }
                    }
                    // Traitement spécial pour les dates
                    else if (header.includes('DATE') || header.includes('NAISS')) {
                        if (value instanceof Date) {
                            obj[header] = this.formatDate(value);
                        } else if (typeof value === 'string') {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                                obj[header] = this.formatDate(date);
                            } else {
                                obj[header] = value.trim();
                            }
                        } else if (typeof value === 'number') {
                            // Les dates Excel sont des nombres (jours depuis 1900)
                            const date = this.excelDateToJSDate(value);
                            obj[header] = this.formatDate(date);
                        } else {
                            obj[header] = String(value).trim();
                        }
                    }
                    // Pour les autres colonnes
                    else {
                        if (typeof value === 'string') {
                            obj[header] = value.trim();
                        } else if (typeof value === 'number') {
                            // Garder les nombres (pour CIN, MATRICULE, etc.)
                            obj[header] = value;
                        } else {
                            obj[header] = String(value).trim();
                        }
                    }
                });

                // Ajouter seulement si la ligne n'est pas vide
                if (Object.values(obj).some(val => val !== '')) {
                    data.push(obj);
                }
            }

            console.log(`   📈 ${data.length} enregistrements valides extraits`);

            return data;

        } catch (error) {
            console.error(`   ❌ ERREUR lors de la conversion ${fileType}:`, error.message);
            console.error(`   Stack:`, error.stack);
            return [];
        }
    }

    excelDateToJSDate(serial) {
        try {
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);

            const fractional_day = serial - Math.floor(serial) + 0.0000001;
            let total_seconds = Math.floor(86400 * fractional_day);

            const seconds = total_seconds % 60;
            total_seconds -= seconds;

            const hours = Math.floor(total_seconds / 3600);
            const minutes = Math.floor(total_seconds / 60) % 60;

            return new Date(
                date_info.getFullYear(),
                date_info.getMonth(),
                date_info.getDate(),
                hours,
                minutes,
                seconds
            );
        } catch (error) {
            console.error(`   ⚠️  Erreur de conversion de date: ${error.message}`);
            return new Date();
        }
    }

    formatDate(date) {
        if (!date || isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    saveToJson(data, filename) {
        try {
            const outputPath = path.join(this.jsonOutputDir, filename);

            // Créer le dossier parent s'il n'existe pas
            const parentDir = path.dirname(outputPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            // Sauvegarder en JSON avec formatage
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

            // Vérifier la taille du fichier
            const stats = fs.statSync(outputPath);
            const fileSizeKB = (stats.size / 1024).toFixed(2);

            console.log(`   💾 Fichier sauvegardé: ${outputPath}`);
            console.log(`   📊 Taille: ${fileSizeKB} KB`);

            return outputPath;

        } catch (error) {
            console.error(`   ❌ ERREUR de sauvegarde ${filename}:`, error.message);
            return null;
        }
    }

    generateStats(employees, activities) {
        try {
            const maleCount = employees.filter(emp => emp.SEXE === 1).length;
            const femaleCount = employees.filter(emp => emp.SEXE === 2).length;
            const otherCount = employees.filter(emp => emp.SEXE !== 1 && emp.SEXE !== 2).length;

            const stats = {
                conversionDate: new Date().toISOString(),
                sourceFiles: {
                    employees: this.employeesExcelPath,
                    activities: this.activitiesExcelPath
                },
                outputLocation: this.jsonOutputDir,
                employees: {
                    total: employees.length,
                    male: maleCount,
                    female: femaleCount,
                    other: otherCount,
                    malePercentage: employees.length > 0 ? ((maleCount / employees.length) * 100).toFixed(1) : '0',
                    femalePercentage: employees.length > 0 ? ((femaleCount / employees.length) * 100).toFixed(1) : '0',
                },
                activities: {
                    total: activities.length,
                },
                notes: [
                    "SEXE: 1 = Homme, 2 = Femme",
                    "Format de date: YYYY-MM-DD",
                    "Conversion automatique Excel → JSON"
                ]
            };

            const statsPath = this.saveToJson(stats, 'stats.json');

            console.log(`   📈 Statistiques générées: ${statsPath}`);
            console.log(`   👥 Employés: ${employees.length} (👨 ${maleCount}, 👩 ${femaleCount})`);
            console.log(`   📋 Activités: ${activities.length}`);

            return stats;

        } catch (error) {
            console.error(`   ❌ ERREUR lors de la génération des statistiques:`, error.message);
            return null;
        }
    }

    copyToFrontend() {
        try {
            console.log(`\n📁 COPIE VERS LE FRONTEND`);
            console.log(`   📍 Destination: ${this.frontendDataDir}`);

            // Créer le dossier frontend s'il n'existe pas
            if (!fs.existsSync(this.frontendDataDir)) {
                fs.mkdirSync(this.frontendDataDir, { recursive: true });
                console.log(`   📁 Dossier frontend créé`);
            }

            // Fichiers à copier
            const filesToCopy = ['employees.json', 'activities.json', 'stats.json'];
            let copiedCount = 0;

            filesToCopy.forEach(file => {
                const source = path.join(this.jsonOutputDir, file);
                const destination = path.join(this.frontendDataDir, file);

                if (fs.existsSync(source)) {
                    fs.copyFileSync(source, destination);
                    console.log(`   📋 ${file} → copié`);
                    copiedCount++;
                } else {
                    console.log(`   ⚠️  ${file} → introuvable`);
                }
            });

            console.log(`   ✅ ${copiedCount}/${filesToCopy.length} fichiers copiés`);
            return copiedCount > 0;

        } catch (error) {
            console.error(`   ❌ ERREUR lors de la copie vers le frontend:`, error.message);
            return false;
        }
    }

    async convertAll() {
        console.log('🚀 DÉMARRAGE DE LA CONVERSION EXCEL → JSON');
        console.log('══════════════════════════════════════════\n');

        const startTime = Date.now();

        // 1. Vérifier les fichiers Excel
        console.log('📋 ÉTAPE 1: Vérification des fichiers Excel');
        if (!this.checkExcelFiles()) {
            console.log('\n❌ CONVERSION ANNULÉE: Fichiers Excel manquants');
            console.log('💡 Placez les fichiers aux emplacements suivants:');
            console.log(`   ${this.employeesExcelPath}`);
            console.log(`   ${this.activitiesExcelPath}`);
            return null;
        }

        console.log('\n✅ Tous les fichiers Excel sont présents\n');

        // 2. Convertir les employés
        console.log('📋 ÉTAPE 2: Conversion des employés');
        const employees = this.convertExcelToJson(this.employeesExcelPath, 'employés');
        const employeesPath = this.saveToJson(employees, 'employees.json');

        if (!employeesPath || employees.length === 0) {
            console.log('\n❌ ERREUR: Aucun employé converti');
            return null;
        }

        console.log(`✅ ${employees.length} employés convertis\n`);

        // 3. Convertir les activités
        console.log('📋 ÉTAPE 3: Conversion des activités');
        const activities = this.convertExcelToJson(this.activitiesExcelPath, 'activités');
        const activitiesPath = this.saveToJson(activities, 'activities.json');

        if (!activitiesPath || activities.length === 0) {
            console.log('\n⚠️  ATTENTION: Aucune activité convertie');
        } else {
            console.log(`✅ ${activities.length} activités converties\n`);
        }

        // 4. Générer les statistiques
        console.log('📋 ÉTAPE 4: Génération des statistiques');
        const stats = this.generateStats(employees, activities);

        // 5. Copier vers le frontend
        console.log('\n📋 ÉTAPE 5: Copie vers le frontend');
        const copied = this.copyToFrontend();

        if (copied) {
            console.log('\n✅ Données disponibles pour le frontend');
        }

        // 6. Résumé final
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('\n══════════════════════════════════════════');
        console.log('🎉 CONVERSION TERMINÉE AVEC SUCCÈS!');
        console.log('══════════════════════════════════════════');
        console.log(`⏱️  Durée: ${duration} secondes`);
        console.log(`👥 Employés: ${employees.length} enregistrements`);
        console.log(`📋 Activités: ${activities.length} enregistrements`);
        console.log(`📁 Sortie: ${this.jsonOutputDir}`);

        if (this.frontendDataDir) {
            console.log(`📁 Frontend: ${this.frontendDataDir}`);
        }

        console.log('\n📝 FICHIERS GÉNÉRÉS:');
        console.log(`   • ${employeesPath}`);
        console.log(`   • ${activitiesPath}`);
        console.log(`   • ${path.join(this.jsonOutputDir, 'stats.json')}`);

        console.log('\n💡 UTILISATION:');
        console.log('   Les données sont maintenant disponibles pour votre application React Native');
        console.log('══════════════════════════════════════════\n');

        return {
            employees,
            activities,
            stats,
            files: {
                employees: employeesPath,
                activities: activitiesPath,
                stats: path.join(this.jsonOutputDir, 'stats.json')
            }
        };
    }
}

// ==================== LANCEMENT AUTOMATIQUE ====================
async function main() {
    const converter = new ExcelConverter();

    try {
        await converter.convertAll();
    } catch (error) {
        console.error('\n❌ ERREUR CRITIQUE:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

// Exporter pour utilisation par d'autres modules
export default ExcelConverter;