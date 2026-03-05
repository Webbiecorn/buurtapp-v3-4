import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";
import { auth as adminAuth } from "./firebase-admin-init";
import { buildInviteEmailHtml, buildInviteEmailSubject } from "./emailTemplates";

const gmailUser = defineSecret("GMAIL_USER");
const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");
const APP_NAME = "BuurtApp Lelystad";

/**
 * Cloud Function die triggert wanneer een nieuw gebruikersdocument wordt aangemaakt in Firestore.
 * Genereert een uitnodigingsmail (HTML + tekst) en slaat deze op in het gebruikersdocument.
 *
 * Verstuurt een uitnodigingsmail via Gmail zodra een nieuw gebruikersprofiel is aangemaakt.
 * Secrets GMAIL_USER + GMAIL_APP_PASSWORD zijn ingesteld via Firebase Secrets.
 */
export const sendWelcomeEmail = onDocumentCreated(
  { document: "users/{userId}", secrets: [gmailUser, gmailPassword] },
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

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser.value(),
          pass: gmailPassword.value(),
        },
      });
      await transporter.sendMail({
        from: `"${APP_NAME}" <${gmailUser.value()}>`,
        to: userData.email,
        subject: emailSubject,
        html: emailHtml,
      });
      logger.info(`✅ Uitnodigingsmail verzonden naar ${userData.email}`);

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

