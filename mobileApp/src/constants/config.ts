// src/constants/config.ts

// =============================================
// CONFIGURATION DE L'URL DU BACKEND
// =============================================
//
// 🔧 DÉVELOPPEMENT LOCAL (Expo Go) :
//   → Remplacer par l'IP locale de votre PC sur le WiFi
//   → Windows: cmd → ipconfig → IPv4 Address
//   → Mac/Linux: terminal → ifconfig | grep "inet "
//   → Exemple : 'http://192.168.1.42:4000'
//
// 🚀 PRODUCTION (après déploiement) :
//   → Remplacer par l'URL Railway/Render de votre backend
//   → Exemple : 'https://bfm-backend.railway.app'
//
// ⚠️ Votre téléphone et PC doivent être sur le MÊME WiFi en développement
// =============================================

const DEV_IP = '10.200.222.124'; // ← REMPLACER PAR VOTRE IP EN LOCAL
const DEV_PORT = 4000;

// Décommenter la ligne correspondant à votre situation :
export const API_URL = `http://${DEV_IP}:${DEV_PORT}`;       // ← Développement local
// export const API_URL = 'https://bfm-backend.railway.app'; // ← Production Railway
// export const API_URL = 'https://bfm-backend.onrender.com'; // ← Production Render

export const API_ENDPOINTS = {
    SEND_EMAIL: `${API_URL}/send-email`,
    SEND_CSV: `${API_URL}/send-csv`,
    REGISTER_TOKEN: `${API_URL}/register-token`,
    UNREGISTER_TOKEN: (userId: string) => `${API_URL}/unregister-token/${userId}`,
    SEND_NOTIFICATION: `${API_URL}/send-notification`,
    HEALTH: `${API_URL}/health`,
};