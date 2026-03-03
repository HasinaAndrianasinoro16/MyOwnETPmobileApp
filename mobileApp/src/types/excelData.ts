// src/types/excelData.ts

export interface EmployeeExcelData {
    MATRICULE: string;
    NOM: string;
    PRENOM: string;
    SEXE: 'M' | 'F';
    DATE_NAISS: string;
    CIN: string;
    C_DIRECTION: string;
    C_SERVICE?: string;
    C_FONCTION: string;
    CATEGORIE: string;
    C_DEPARTEMENT: string;
    C_BUREAU: string;
}

export interface ActivityExcelData {
    ID_ACTIVITE: string;
    C_ACTIVITE: string;
    L_ACTIVITE: string;
    ID_PROCESS?: string;
    NIVEAU_ACTIVITE?: string;
    C_ACTIVITE_MERE?: string;
    CODE_PROCESS?: string;
    C_ACTIVITE_OLD?: string;
    C_ACTIVITE_MERE_OLD?: string;
}

export interface AppEmployee {
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
}

export interface AppActivity {
    Id_activite: string;
    Code_activite: string;
    Libelle_activite: string;
    Id_process?: string;
    Niveau_activite?: string;
    Code_process?: string;
}