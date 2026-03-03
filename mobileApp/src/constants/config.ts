// src/constants/config.ts

// IMPORTANT: Remplacer par l'adresse IP de votre ordinateur
// Pour trouver votre IP:
// - Windows: ouvrir cmd et taper "ipconfig"
// - Mac/Linux: ouvrir terminal et taper "ifconfig" ou "ip addr"
// Chercher l'adresse IPv4 (ex: 192.168.1.10)

export const API_URL = 'http://10.200.222.124:4000'; // REMPLACER PAR VOTRE IP
// export const API_URL = 'https://backend-etp-app.onrender.com';

export const API_ENDPOINTS = {
    SEND_EMAIL: `${API_URL}/send-email`,
};

// Pour le développement local avec Expo Go:
// 1. Votre téléphone et votre ordinateur doivent être sur le MÊME réseau WiFi
// 2. Utilisez l'adresse IP locale de votre ordinateur (pas localhost)
// 3. Assurez-vous que le firewall autorise les connexions sur le port 4000