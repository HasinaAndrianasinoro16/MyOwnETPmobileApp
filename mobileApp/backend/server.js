// backend/server.js
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import https from "https";

dotenv.config();
const app = express();

// =============================================
// STOCKAGE EN MÉMOIRE DES PUSH TOKENS
// (En production, utiliser une vraie DB : MongoDB, PostgreSQL, etc.)
// =============================================
const pushTokensStore = new Map(); // Map<userId, expoPushToken>

// =============================================
// MIDDLEWARES
// =============================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// =============================================
// SMTP (EMAIL)
// =============================================
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

transporter.verify((error) => {
    if (error) {
        console.error("❌ Erreur SMTP:", error.message);
    } else {
        console.log("✅ SMTP prêt");
    }
});

// =============================================
// FONCTION UTILITAIRE : ENVOYER UNE PUSH NOTIFICATION VIA EXPO
// =============================================
const sendExpoPushNotification = async (expoPushToken, title, body, data = {}) => {
    return new Promise((resolve, reject) => {
        const message = JSON.stringify({
            to: expoPushToken,
            sound: "default",
            title,
            body,
            data,
            priority: "high",
            channelId: "default",
        });

        const options = {
            hostname: "exp.host",
            path: "/--/api/v2/push/send",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(message),
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
        };

        const req = https.request(options, (res) => {
            let responseData = "";
            res.on("data", (chunk) => { responseData += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(responseData);
                    console.log(`📱 Push envoyé à ${expoPushToken}: `, parsed);
                    resolve(parsed);
                } catch (e) {
                    resolve({ raw: responseData });
                }
            });
        });

        req.on("error", reject);
        req.write(message);
        req.end();
    });
};

// =============================================
// ROUTES DE BASE
// =============================================
app.get("/", (req, res) => {
    res.json({
        message: "BFM Backend is running! 🚀",
        version: "2.0.0",
        features: ["email", "push-notifications"],
        pushTokensRegistered: pushTokensStore.size,
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pushTokensRegistered: pushTokensStore.size,
    });
});

// =============================================
// ROUTES PUSH TOKENS
// =============================================

// Enregistrer un Expo Push Token
app.post("/register-token", (req, res) => {
    const { userId, expoPushToken } = req.body;

    if (!userId || !expoPushToken) {
        return res.status(400).json({
            success: false,
            error: "userId et expoPushToken sont requis"
        });
    }

    // Valider que c'est bien un token Expo
    if (!expoPushToken.startsWith("ExponentPushToken[") && !expoPushToken.startsWith("ExpoPushToken[")) {
        return res.status(400).json({
            success: false,
            error: "Token invalide — doit commencer par ExponentPushToken[ ou ExpoPushToken["
        });
    }

    pushTokensStore.set(userId, expoPushToken);
    console.log(`✅ Token enregistré pour user: ${userId} → ${expoPushToken}`);

    res.json({
        success: true,
        message: "Token enregistré avec succès",
        userId,
    });
});

// Supprimer un token (déconnexion)
app.delete("/unregister-token/:userId", (req, res) => {
    const { userId } = req.params;
    const deleted = pushTokensStore.delete(userId);

    res.json({
        success: true,
        message: deleted ? "Token supprimé" : "Token non trouvé",
    });
});

// Lister les tokens enregistrés (debug)
app.get("/tokens", (req, res) => {
    const tokens = [];
    pushTokensStore.forEach((token, userId) => {
        tokens.push({ userId, tokenPreview: token.substring(0, 30) + "..." });
    });
    res.json({ count: tokens.length, tokens });
});

// =============================================
// ROUTES PUSH NOTIFICATIONS
// =============================================

// Envoyer une notification à UN utilisateur
app.post("/send-notification", async (req, res) => {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
        return res.status(400).json({
            success: false,
            error: "userId, title et body sont requis"
        });
    }

    const token = pushTokensStore.get(userId);
    if (!token) {
        return res.status(404).json({
            success: false,
            error: `Aucun token enregistré pour l'utilisateur: ${userId}`
        });
    }

    try {
        const result = await sendExpoPushNotification(token, title, body, data || {});
        res.json({ success: true, result });
    } catch (error) {
        console.error("❌ Erreur push:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Envoyer une notification à TOUS les utilisateurs enregistrés
app.post("/send-notification-all", async (req, res) => {
    const { title, body, data } = req.body;

    if (!title || !body) {
        return res.status(400).json({
            success: false,
            error: "title et body sont requis"
        });
    }

    if (pushTokensStore.size === 0) {
        return res.status(404).json({
            success: false,
            error: "Aucun utilisateur enregistré"
        });
    }

    const results = [];
    for (const [userId, token] of pushTokensStore.entries()) {
        try {
            const result = await sendExpoPushNotification(token, title, body, data || {});
            results.push({ userId, success: true, result });
        } catch (error) {
            results.push({ userId, success: false, error: error.message });
        }
    }

    res.json({
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
    });
});

// Rappel de tâches programmé — à appeler via CRON ou manuellement
app.post("/send-task-reminder", async (req, res) => {
    const { userId, taskCount } = req.body;

    const title = "📋 Rappel de tâches";
    const body = taskCount
        ? `Vous avez ${taskCount} tâche(s) favorite(s) à compléter aujourd'hui !`
        : "N'oubliez pas de compléter vos tâches favorites aujourd'hui !";
    const data = {
        type: "task_reminder",
        screen: "CompleteTasks",
        redirectTo: "CompleteTasks",
        action: "navigate_to_tasks",
    };

    if (userId) {
        // Envoyer à un utilisateur spécifique
        const token = pushTokensStore.get(userId);
        if (!token) {
            return res.status(404).json({ success: false, error: "Token non trouvé" });
        }
        try {
            const result = await sendExpoPushNotification(token, title, body, data);
            return res.json({ success: true, result });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    } else {
        // Envoyer à tous
        const results = [];
        for (const [uid, token] of pushTokensStore.entries()) {
            try {
                const result = await sendExpoPushNotification(token, title, body, data);
                results.push({ userId: uid, success: true });
            } catch (error) {
                results.push({ userId: uid, success: false, error: error.message });
            }
        }
        return res.json({
            success: true,
            sent: results.filter(r => r.success).length,
            results,
        });
    }
});

// =============================================
// ROUTES EMAIL (existantes — inchangées)
// =============================================
app.post("/send-email", upload.single("file"), async (req, res) => {
    try {
        const { to, subject, message } = req.body;
        const file = req.file;

        if (!to || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: "Données manquantes: to, subject et message sont requis"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({ success: false, error: "Format d'email invalide" });
        }

        const mailOptions = {
            from: `"BFM App" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text: message,
            html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
        };

        if (file) {
            mailOptions.attachments = [{
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            }];
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email envoyé à ${to}, ID: ${info.messageId}`);
        res.json({ success: true, message: "Email envoyé avec succès!", messageId: info.messageId });
    } catch (error) {
        console.error("❌ Erreur email:", error);
        res.status(500).json({ success: false, error: "Erreur lors de l'envoi", details: error.message });
    }
});

app.post("/send-csv", upload.single("file"), async (req, res) => {
    try {
        const { to, subject, message, periode } = req.body;
        const file = req.file;

        if (!to || !subject || !periode) {
            return res.status(400).json({
                success: false,
                error: "Données manquantes: to, subject et periode sont requis"
            });
        }

        const mailOptions = {
            from: `"BFM App - ${periode}" <${process.env.MAIL_USER}>`,
            to,
            subject: `${subject} - ${periode}`,
            text: `${message}\n\nPériode: ${periode}`,
            html: `<h3>Récapitulatif des activités</h3><p>${message}</p><p><strong>Période:</strong> ${periode}</p>`,
        };

        if (file) {
            mailOptions.attachments = [{
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            }];
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 CSV envoyé à ${to}, ID: ${info.messageId}`);
        res.json({ success: true, message: "CSV envoyé avec succès!", messageId: info.messageId, periode });
    } catch (error) {
        console.error("❌ Erreur CSV:", error);
        res.status(500).json({ success: false, error: "Erreur lors de l'envoi du CSV", details: error.message });
    }
});

// =============================================
// DÉMARRAGE
// =============================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔══════════════════════════════════════╗
║       BFM Backend v2.0 🚀            ║
╠══════════════════════════════════════╣
║  Port    : ${PORT}                       ║
║  Email   : ✅ Configuré               ║
║  Push    : ✅ Expo Push prêt          ║
╚══════════════════════════════════════╝
    `);
});