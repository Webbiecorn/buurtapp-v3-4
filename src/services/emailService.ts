import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Stuurt een wachtwoord reset email naar een nieuw uitgenodigde gebruiker
 * @param email - Het email adres van de nieuwe gebruiker
 * @returns Promise die resolved wanneer de email is verzonden
 */
export async function sendInvitationEmail(email: string): Promise<void> {
  try {
    // Firebase's ingebouwde password reset email
    // Dit gebruikt de email templates die geconfigureerd zijn in Firebase Console
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`, // Redirect naar login na reset
      handleCodeInApp: false,
    });
    
    console.log(`✅ Wachtwoord reset email verzonden naar ${email}`);
  } catch (error: any) {
    console.error(`❌ Fout bij verzenden email naar ${email}:`, error);
    
    // Specifieke error handling
    if (error.code === 'auth/user-not-found') {
      throw new Error('Gebruiker niet gevonden. De gebruiker moet eerst aangemaakt zijn in Firebase Authentication.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Ongeldig email adres.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Te veel verzoeken. Probeer het later opnieuw.');
    }
    
    throw error;
  }
}

/**
 * Stuurt een custom uitnodigings email via een Cloud Function
 * Deze functie kan gebruikt worden als je custom email templates wilt
 * @param email - Email adres van de nieuwe gebruiker
 * @param name - Naam van de nieuwe gebruiker
 * @param role - Rol van de nieuwe gebruiker
 */
export async function sendCustomInvitationEmail(
  email: string,
  name: string,
  role: string
): Promise<void> {
  // TODO: Implementeer dit met een Cloud Function die Nodemailer of SendGrid gebruikt
  // Voor nu gebruiken we de standaard Firebase email
  await sendInvitationEmail(email);
}
