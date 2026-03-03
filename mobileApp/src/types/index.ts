// src/types/index.ts

export interface Employe {
    Num_matricule: string;
    Nom: string;
    Prenom: string;
    Sexe: 'M' | 'F';
    DateNaissance: string;
    Cin: string;
    Direction: string;
    Service?: string;
    Fonction: string;
    Categorie: string;
    Departement: string;
    Bureau: string;
    Pin?: string;
}

export interface Activite {
    Id_activite: string;
    Code_activite: string;
    Libelle_activite: string;
    Id_process?: string;
    Niveau_activite?: string;
    Code_process?: string;
}

export interface LogActivite {
    Id_logs: number;
    Num_matricule: string;
    Id_activite: string;
    Date_activite: string;
    Duree: number;
    Libelle_activite?: string;
    Flag?: string;
}

export interface Settings {
    notificationFrequency: number;
    notificationsEnabled: boolean;
    direction: string;
    departement: string;
    service?: string;
    notifMinute?: number;
    debutTravail?: string;
    finTravail?: string;
    debutPause?: string;
    finPause?: string;
    // Nouvelles propriétés pour les suggestions
    allDirections?: string[];
    allDepartements?: string[];
    allServices?: string[];
    //mail
    reportEmail?: string;
}

export interface UserData {
    Num_matricule: string;
    Prenom: string;
    Nom: string;
    Direction: string;
    Departement: string;
    Service?: string;
}

export interface FavoriteActivity {
    id: string;
    activityId: string;
    addedAt: string;
}

export interface NotificationHistory {
    id: string;
    type: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
}

export interface ExcelReportData {
    matricule: string;
    direction: string;
    departement: string;
    service?: string;
    id_activite: string;
    code_activite: string;
    temps: number;
    periode: string;
    date: string;
}

export type RootStackParamList = {
    Login: undefined;
    CreateAccount: undefined;
    ForgotPassword: undefined;
    Home: undefined;
    ActivityList: undefined;
    Favorites: undefined;
    History: undefined;
    Settings: undefined;
    CompleteTasks: undefined;
    Notification: undefined;
};