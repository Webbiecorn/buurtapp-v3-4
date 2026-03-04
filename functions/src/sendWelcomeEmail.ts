import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { auth as adminAuth } from "./firebase-admin-init";
import { buildInviteEmailHtml, buildInviteEmailSubject } from "./emailTemplates";

/**
 * Cloud Function die triggert wanneer een nieuw gebruikersdocument wordt aangemaakt in Firestore.
 * Genereert een uitnodigingsmail (HTML + tekst) en slaat deze op in het gebruikersdocument.
 *
 * EMAIL VERZENDING — ACTIVEREN:
 * 1. firebase functions:secrets:set GMAIL_USER
 * 2. firebase functions:secrets:set GMAIL_APP_PASSWORD
 * 3. cd functions && npm install nodemailer @types/nodemailer
 * 4. Uncomment het nodemailer blok hieronder
 */
export const sendWelcomeEmail = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("Geen document data beschikbaar");
      return;
    }

    const userData = snapshot.data();
    const userId = event.params.userId;

    if (!userData.email) {
      logger.warn(`Gebruiker ${userId} heeft geen email adres`);
      return;
    }

    if (userData.welcomeEmailSent) {
      logger.info(`Welkomst email al verzonden naar ${userData.email}`);
      return;
    }

    try {
      const resetLink = await adminAuth.generatePasswordResetLink(userData.email, {
        url: `https://${process.env.GCLOUD_PROJECT}.web.app/#/login`,
      });

      // Bouw HTML-email op via template
      const emailHtml = buildInviteEmailHtml({
        name: userData.name || userData.email,
        email: userData.email,
        role: userData.role || 'Viewer',
        organisatie: userData.organisatie,
        allowedModules: userData.allowedModules,
        invitedByName: userData.invitedByName || 'een beheerder',
        passwordResetLink: resetLink,
      });
      const emailSubject = buildInviteEmailSubject();

      // Sla de HTML op in het document (voor preview/debug; verwijder in productie als je wil)
      await snapshot.ref.update({
        welcomeEmailSent: true,
        passwordResetLink: resetLink,
        inviteEmailHtml: emailHtml,  // Handig als je de mail wil bekijken / handmatig sturen
        inviteEmailSubject: emailSubject,
      });

      // ── NODEMAILER (activeren zodra GMAIL_USER + GMAIL_APP_PASSWORD beschikbaar zijn) ──
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   service: 'gmail',
      //   auth: {
      //     user: process.env.GMAIL_USER,
      //     pass: process.env.GMAIL_APP_PASSWORD,
      //   },
      // });
      // await transporter.sendMail({
      //   from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      //   to: userData.email,
      //   subject: emailSubject,
      //   text: emailText,
      //   html: emailHtml,
      // });
      // logger.info(`✅ Uitnodigingsmail verzonden naar ${userData.email}`);

      logger.info(`✅ Uitnodigings-HTML gegenereerd voor ${userData.email}`);
      logger.info(`🔗 Reset-link: ${resetLink}`);
      logger.info(`📧 Activeer nodemailer om emails te versturen (zie TODO in sendWelcomeEmail.ts)`);

      return { success: true };
    } catch (error) {
      logger.error(
        `❌ Fout bij het verwerken van welkomst email voor ${userData.email}:`,
        error
      );
      throw error;
    }
  }
);

