// backend/server.js
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();
const app = express();

// CORS config pour mobile
app.use(cors({
    origin: '*', // Pour développement, limitez en production
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// Vérification de la connexion SMTP
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Erreur de connexion SMTP:", error);
    } else {
        console.log("✅ Serveur SMTP prêt à envoyer des emails");
    }
});

// Route de test
app.get("/", (req, res) => {
    res.json({
        message: "BFM Backend is running!",
        version: "1.0.0",
        emailService: "Active"
    });
});

// Route de vérification de santé
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "email-service"
    });
});

// Route d'envoi d'email
app.post("/send-email", upload.single("file"), async (req, res) => {
    try {
        const { to, subject, message } = req.body;
        const file = req.file;

        // Validation des données
        if (!to || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: "Données manquantes: to, subject et message sont requis"
            });
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({
                success: false,
                error: "Format d'email invalide"
            });
        }

        const mailOptions = {
            from: `"BFM App" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text: message,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`
        };

        if (file) {
            mailOptions.attachments = [
                {
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                },
            ];
        }

        const info = await transporter.sendMail(mailOptions);

        console.log(`📧 Email envoyé à ${to}, ID: ${info.messageId}`);

        res.json({
            success: true,
            message: "Email envoyé avec succès!",
            messageId: info.messageId
        });
    } catch (error) {
        console.error("❌ Erreur d'envoi email:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi de l'email",
            details: error.message
        });
    }
});

// backend/server.js
// ... (garder les imports existants)

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
            text: `${message}\n\nPériode: ${periode}\nFichier CSV joint.`,
            html: `
        <h3>Récapitulatif des activités</h3>
        <p>${message}</p>
        <p><strong>Période:</strong> ${periode}</p>
        <p>Veuillez trouver ci-joint le fichier CSV contenant les détails des activités.</p>
      `
        };

        if (file) {
            mailOptions.attachments = [
                {
                    filename: file.originalname,
                    content: file.buffer,
                    contentType: file.mimetype
                },
            ];
        }

        const info = await transporter.sendMail(mailOptions);

        console.log(`📧 CSV envoyé à ${to}, ID: ${info.messageId}`);

        res.json({
            success: true,
            message: "CSV envoyé avec succès!",
            messageId: info.messageId,
            periode: periode
        });
    } catch (error) {
        console.error("❌ Erreur d'envoi CSV:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de l'envoi du CSV",
            details: error.message
        });
    }
});

// ... (garder le reste du fichier)

const IP_ADDRESS = '10.200.222.124';
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend démarré sur:
    - Local: http://localhost:${PORT}
    - Réseau: http://${IP_ADDRESS}:${PORT}
    `);
    console.log(`📧 Service d'email configuré avec ${process.env.MAIL_USER}`);
    console.log(`🌐 Accessible depuis le réseau local`);
});