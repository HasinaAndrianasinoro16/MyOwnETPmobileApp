// src/services/DataService.ts
import employeesData from '../data/employees.json';
import activitiesData from '../data/activities.json';
import { EmployeeExcelData, ActivityExcelData, AppEmployee, AppActivity } from '../types/excelData';

class DataService {
    private rawEmployees: EmployeeExcelData[] = [];
    private rawActivities: ActivityExcelData[] = [];
    private formattedEmployees: AppEmployee[] = [];
    private formattedActivities: AppActivity[] = [];

    constructor() {
        this.initializeData();
    }

    private initializeData() {
        try {
            // Charger et formater les données des employés
            this.rawEmployees = employeesData as EmployeeExcelData[];
            this.formattedEmployees = this.formatEmployeesData(this.rawEmployees);

            // Charger les données des activités
            this.rawActivities = activitiesData as ActivityExcelData[];
            this.formattedActivities = this.formatActivitiesData(this.rawActivities);

            console.log('✅ Données chargées avec succès:');
            console.log(`   👥 ${this.formattedEmployees.length} employés`);
            console.log(`   📋 ${this.formattedActivities.length} activités`);

            // Afficher les statistiques de genre
            const stats = this.getStatistics();
            console.log(`   👨 Hommes: ${stats.employees.bySexe?.M || 0}`);
            console.log(`   👩 Femmes: ${stats.employees.bySexe?.F || 0}`);
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données:', error);
            throw error;
        }
    }

    private formatEmployeesData(employees: EmployeeExcelData[]): AppEmployee[] {
        return employees.map(emp => ({
            Num_matricule: this.safeToString(emp.MATRICULE),
            Nom: this.safeToString(emp.NOM),
            Prenom: this.safeToString(emp.PRENOM),
            Sexe: this.parseSexe(emp.SEXE), // Convertir 1/2 en M/F
            DateNaissance: this.formatDate(emp.DATE_NAISS),
            Cin: this.safeToString(emp.CIN),
            Direction: this.safeToString(emp.C_DIRECTION),
            Service: this.safeToString(emp.C_SERVICE) || undefined,
            Fonction: this.safeToString(emp.C_FONCTION),
            Categorie: this.safeToString(emp.CATEGORIE),
            Departement: this.safeToString(emp.C_DEPARTEMENT),
            Bureau: this.safeToString(emp.C_BUREAU),
        }));
    }

    private formatActivitiesData(activities: ActivityExcelData[]): AppActivity[] {
        return activities.map(act => ({
            Id_activite: this.safeToString(act.ID_ACTIVITE),
            Code_activite: this.safeToString(act.C_ACTIVITE),
            Libelle_activite: this.safeToString(act.L_ACTIVITE),
            Id_process: this.safeToString(act.ID_PROCESS) || undefined,
            Niveau_activite: this.safeToString(act.NIVEAU_ACTIVITE) || undefined,
            Code_process: this.safeToString(act.CODE_PROCESS) || undefined,
        }));
    }

    private parseSexe(sexeValue: any): 'M' | 'F' {
        const value = this.safeToString(sexeValue);

        // Si c'est déjà M ou F
        if (value === 'M' || value === 'F') {
            return value;
        }

        // Si c'est un nombre (1 ou 2)
        const num = parseInt(value);
        if (num === 1) return 'M'; // 1 = Homme
        if (num === 2) return 'F'; // 2 = Femme

        // Par défaut, considérer comme homme
        console.warn(`⚠️ Valeur de sexe non reconnue: "${value}", par défaut M`);
        return 'M';
    }

    private formatDate(dateValue: any): string {
        const value = this.safeToString(dateValue);

        if (!value) return '';

        // Essayer de parser la date
        const date = new Date(value);

        if (isNaN(date.getTime())) {
            // Si ce n'est pas une date valide, retourner la valeur originale
            return value;
        }

        // Formater en YYYY-MM-DD
        return date.toISOString().split('T')[0];
    }

    private safeToString(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        // Convertir en string et nettoyer
        let str = String(value);

        // Supprimer les espaces superflus
        str = str.trim();

        // Convertir les valeurs booléennes
        if (str === 'true') return '1';
        if (str === 'false') return '0';

        return str;
    }

    // ========== MÉTHODES PUBLIQUES ==========

    findEmployeeByMatricule(matricule: string): AppEmployee | undefined {
        return this.formattedEmployees.find(
            emp => emp.Num_matricule === matricule
        );
    }

    findEmployeeByCin(cin: string): AppEmployee | undefined {
        return this.formattedEmployees.find(
            emp => emp.Cin === cin
        );
    }

    verifyEmployeeCredentials(matricule: string, cin: string): AppEmployee | null {
        const employee = this.findEmployeeByMatricule(matricule);

        if (employee && employee.Cin === cin) {
            return employee;
        }

        return null;
    }

    getAllActivities(): AppActivity[] {
        return [...this.formattedActivities];
    }

    searchActivities(searchTerm: string): AppActivity[] {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            return this.getAllActivities();
        }

        return this.formattedActivities.filter(activity =>
            activity.Libelle_activite.toLowerCase().includes(term) ||
            activity.Code_activite.toLowerCase().includes(term) ||
            activity.Id_activite.toLowerCase().includes(term)
        );
    }

    getActivityById(id: string): AppActivity | undefined {
        return this.formattedActivities.find(
            act => act.Id_activite === id
        );
    }

    getActivitiesByLevel(level: string): AppActivity[] {
        return this.formattedActivities.filter(
            act => act.Niveau_activite === level
        );
    }

    getStatistics() {
        const totalEmployees = this.formattedEmployees.length;
        const maleEmployees = this.formattedEmployees.filter(emp => emp.Sexe === 'M').length;
        const femaleEmployees = this.formattedEmployees.filter(emp => emp.Sexe === 'F').length;

        return {
            employees: {
                total: totalEmployees,
                male: maleEmployees,
                female: femaleEmployees,
                malePercentage: totalEmployees > 0 ? ((maleEmployees / totalEmployees) * 100).toFixed(1) : '0',
                femalePercentage: totalEmployees > 0 ? ((femaleEmployees / totalEmployees) * 100).toFixed(1) : '0',
                bySexe: {
                    M: maleEmployees,
                    F: femaleEmployees,
                },
                byDirection: this.formattedEmployees.reduce((acc, emp) => {
                    const direction = emp.Direction || 'Non spécifié';
                    acc[direction] = (acc[direction] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            },
            activities: {
                total: this.formattedActivities.length,
                byLevel: this.formattedActivities.reduce((acc, act) => {
                    const level = act.Niveau_activite || 'Non spécifié';
                    acc[level] = (acc[level] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            }
        };
    }

    getAllEmployees(): AppEmployee[] {
        return [...this.formattedEmployees];
    }

    getEmployeesByDirection(direction: string): AppEmployee[] {
        return this.formattedEmployees.filter(
            emp => emp.Direction === direction
        );
    }

    getEmployeesByDepartement(departement: string): AppEmployee[] {
        return this.formattedEmployees.filter(
            emp => emp.Departement === departement
        );
    }

    getEmployeesBySexe(sexe: 'M' | 'F'): AppEmployee[] {
        return this.formattedEmployees.filter(
            emp => emp.Sexe === sexe
        );
    }
}

export const dataService = new DataService();