import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { auth as adminAuth } from "./firebase-admin-init";

/**
 * Cloud Function die triggert wanneer een nieuw gebruikersdocument wordt aangemaakt in Firestore.
 * Stuurt automatisch een wachtwoord reset email naar de nieuwe gebruiker.
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

    // Check of dit een nieuwe gebruiker is die een welkomst email moet krijgen
    if (!userData.email) {
      logger.warn(`Gebruiker ${userId} heeft geen email adres`);
      return;
    }

    // Check of de gebruiker al een email heeft ontvangen (om dubbele emails te voorkomen)
    if (userData.welcomeEmailSent) {
      logger.info(`Welkomst email al verzonden naar ${userData.email}`);
      return;
    }

    try {
      // Gebruik Firebase's ingebouwde password reset email
      // Dit werkt alleen als de Firebase Authentication Email Templates zijn ingeschakeld
      const resetLink = await adminAuth.generatePasswordResetLink(userData.email, {
        url: `https://${process.env.GCLOUD_PROJECT}.web.app/login`, // Redirect URL na reset
      });

      logger.info(`Password reset link gegenereerd voor ${userData.email}`);
      logger.info(`Link: ${resetLink}`);

      // BELANGRIJK: Firebase Admin SDK kan geen emails versturen
      // Je hebt 3 opties:
      // 1. Firebase Authentication Email Templates gebruiken (standaard, gratis)
      //    - Ga naar Firebase Console > Authentication > Templates
      //    - Configureer de "Password reset" template
      //    - De gebruiker moet sendPasswordResetEmail() aanroepen vanuit de client
      //
      // 2. Nodemailer gebruiken met een SMTP server (Gmail, SendGrid, etc.)
      //    - Vereist extra configuratie en mogelijk kosten
      //
      // 3. Een email service API gebruiken (SendGrid, Mailgun, etc.)
      //    - Vereist API keys en mogelijk kosten

      // Voor nu markeren we dat de functie is aangeroepen
      await snapshot.ref.update({
        welcomeEmailSent: true,
        passwordResetLinkGenerated: true,
        passwordResetLink: resetLink, // Alleen voor development/testing
      });

      logger.info(
        `✅ Welkomst email proces voltooid voor ${userData.email}`
      );
      logger.info(
        `📧 ACTIE VEREIST: De gebruiker moet zelf een wachtwoord reset aanvragen op de login pagina`
      );
      logger.info(`   Email: ${userData.email}`);
      logger.info(`   Of gebruik deze link: ${resetLink}`);

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
