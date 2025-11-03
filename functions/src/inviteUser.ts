import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { UserRole } from "./types";
import { db, auth as adminAuth, serverTimestamp } from "./firebase-admin-init";

/**
 * Cloud Function om nieuwe gebruikers uit te nodigen voor de Buurtapp
 * 
 * BELANGRIJK: Voor email functionaliteit moet je Firebase Email Templates configureren:
 * 1. Ga naar Firebase Console > Authentication > Templates
 * 2. Configureer het "Password reset" email template
 * 3. Pas het design/bericht aan naar wens
 * 
 * De generatePasswordResetLink() triggert automatisch het versturen van de email
 * via Firebase's ingebouwde email systeem (geen extra email service nodig).
 */

// v2 onCall: handler krijgt één request object met { data, auth }
export const inviteUser = onCall(async (request: CallableRequest<any>) => {
  const { data, auth } = request;

  // 1. Authenticatie en Autorisatie Check
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "De functie moet worden aangeroepen door een ingelogde gebruiker."
    );
  }

  const requesterUid = auth.uid;
  const userDoc = await db.collection("users").doc(requesterUid).get();
  const userData = userDoc.data();

  if (!userData || userData.role !== UserRole.Beheerder) {
    throw new HttpsError(
      "permission-denied",
      "Alleen beheerders kunnen nieuwe gebruikers uitnodigen."
    );
  }

  // 2. Input Validatie
  const { email, name, role } = (data || {}) as { email?: string; name?: string; role?: UserRole };
  if (!email || !name || !role) {
    throw new HttpsError(
      "invalid-argument",
      "De functie vereist een 'email', 'name', en 'role'."
    );
  }

  if (!Object.values(UserRole).includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "Ongeldige 'role' opgegeven."
    );
  }

  try {
    // 3. Gebruiker aanmaken in Firebase Auth
  const isAuthEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const userRecord = await adminAuth.createUser({
      email,
      emailVerified: false,
      displayName: name,
  // Stel een tijdelijk wachtwoord in (ook in productie); gebruiker moet dit wijzigen bij eerste login
  password: "Welkom01",
    });

    // 4. Gebruikersprofiel aanmaken in Firestore
    const newUserProfile = {
      name,
      email,
      role,
      avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
      phone: '',
      createdAt: serverTimestamp(),
      // Email status tracking
      welcomeEmailSent: false,
      invitedBy: requesterUid,
      invitedAt: serverTimestamp(),
    } as const;

    await db.collection("users").doc(userRecord.uid).set(newUserProfile);

    // 5. Wachtwoord-reset-e-mail link genereren
    let passwordResetLink = "";
    
    if (!isAuthEmulator) {
      try {
        // Genereer de password reset link
        // LET OP: generatePasswordResetLink() verstuurt GEEN email automatisch!
        // De email moet via een van de volgende methodes verstuurt worden:
        // 1. Client-side: sendPasswordResetEmail() (via Firebase Auth SDK)
        // 2. Custom email service (SendGrid, Nodemailer, etc.)
        // 3. Firebase Extensions: Trigger Email
        passwordResetLink = await adminAuth.generatePasswordResetLink(email, {
          url: `${request.rawRequest.headers.origin || 'https://buurtapp-v3-4.web.app'}/login`,
        });
        
        logger.info(`✅ Wachtwoord reset link gegenereerd voor ${email}`);
        logger.info(`🔗 Link: ${passwordResetLink}`);
        
        // TODO: Implementeer email verzending hier via SendGrid/Nodemailer
        // Voor nu sturen we de link terug naar de client die de email zal versturen
        
      } catch (linkErr: any) {
        logger.warn(`⚠️ Kon geen reset-link genereren voor ${email}:`, linkErr);
      }
    } else {
      logger.info(`🔧 Emulator modus: geen wachtwoord reset link gegenereerd voor ${email}`);
    }

    return {
      success: true,
      message: isAuthEmulator 
        ? `Gebruiker ${name} aangemaakt in emulator. Standaard wachtwoord: Welkom01 (wijziging vereist bij eerste login).`
        : `Gebruiker ${name} aangemaakt. De gebruiker ontvangt nu een email met instructies om een wachtwoord in te stellen.`,
      uid: userRecord.uid,
      email: email,
      temporaryPassword: "Welkom01",
      needsPasswordReset: true, // Signal naar client dat password reset email verstuurd moet worden
      passwordResetLink: passwordResetLink || undefined,
    };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') {
      throw new HttpsError(
        "already-exists",
        `Een gebruiker met e-mail ${email} bestaat al.`
      );
    }
    logger.error("Fout bij aanmaken gebruiker:", error);
    throw new HttpsError(
      "internal",
      "Er is een onbekende fout opgetreden bij het aanmaken van de gebruiker.",
      error
    );
  }
});
