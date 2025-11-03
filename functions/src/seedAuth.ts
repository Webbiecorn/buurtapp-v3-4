import * as admin from 'firebase-admin';
import { UserRole } from './types'; 
import { app } from './firebase-admin-init'; // Importeer de geïnitialiseerde app

const db = admin.firestore(app);
const auth = admin.auth(app);

const seedUsers = async () => {
  // Seed Admin User
  const adminEmail = 'kevin@webbiecorn.nl';
  const adminPassword = 'Welkom01';
  const adminName = 'Kevin Beheerder';

  console.log(`Controleren voor beheerder: ${adminEmail}...`);
  await seedUser(adminEmail, adminPassword, adminName, UserRole.Beheerder);

  // Seed Concierge User
  const conciergeEmail = 'kevin@buurtteamlelystad.nl';
  const conciergePassword = 'Welkom01';
  const conciergeName = 'Kevin Conciërge';

  console.log(`Controleren voor conciërge: ${conciergeEmail}...`);
  await seedUser(conciergeEmail, conciergePassword, conciergeName, UserRole.Concierge);

  console.log('Seeden voltooid!');
};

const seedUser = async (email: string, password: string, name: string, role: UserRole) => {
  let userUid: string;

  try {
    const userRecord = await auth.getUserByEmail(email);
    userUid = userRecord.uid;
    console.log(`Gebruiker ${email} bestaat al.`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`Gebruiker ${email} niet gevonden, nieuwe wordt aangemaakt...`);
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });
      userUid = userRecord.uid;
      console.log(`Nieuwe gebruiker succesvol aangemaakt met UID: ${userUid}`);
    } else {
      throw error;
    }
  }

  console.log(`Firestore profiel verzekeren voor UID: ${userUid}`);

  const userDocRef = db.collection('users').doc(userUid);
  await userDocRef.set({
    name: name,
    email: email,
    role: role,
    avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
  }, { merge: true });

  console.log(`Firestore profiel voor ${email} is bijgewerkt.`);
}

seedUsers().catch((error) => {
  console.error('Fout tijdens seeden:', error);
  process.exit(1);
});
