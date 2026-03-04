import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db } from "./firebase-admin-init";
import { UserRole } from "./types";

/**
 * Callable Cloud Function: stuur een herinnering voor een openstaande uitnodiging.
 *
 * Input:  { uid: string }  — de UID van de uitgenodigde gebruiker
 * Output: { success: true, email: string }
 *
 * De client gebruikt het teruggegeven email-adres om via Firebase client SDK
 * sendPasswordResetEmail() aan te roepen, zodat de gebruiker een verse link ontvangt.
 */
export const sendInviteReminder = onCall(async (request: CallableRequest<any>) => {
  const { data, auth } = request;

  // 1. Auth check — alleen beheerders
  if (!auth) {
    throw new HttpsError("unauthenticated", "Niet ingelogd.");
  }

  const callerDoc = await db.collection("users").doc(auth.uid).get();
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== UserRole.Beheerder) {
    throw new HttpsError("permission-denied", "Alleen beheerders kunnen herinneringen sturen.");
  }

  const { uid } = data as { uid: string };
  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is vereist.");
  }

  // 2. Haal uitnodiging op
  const inviteDoc = await db.collection("invites").doc(uid).get();
  if (!inviteDoc.exists) {
    throw new HttpsError("not-found", "Uitnodiging niet gevonden.");
  }

  const invite = inviteDoc.data()!;

  // 3. Valideer status
  if (invite.status === "accepted") {
    throw new HttpsError("failed-precondition", "Deze gebruiker heeft de uitnodiging al geaccepteerd.");
  }
  if (invite.status === "expired") {
    throw new HttpsError("failed-precondition", "Deze uitnodiging is verlopen. Maak een nieuwe uitnodiging aan.");
  }

  const now = Date.now();
  if (invite.expiresAt.toMillis() < now) {
    // Markeer als verlopen als dat nog niet was
    await inviteDoc.ref.update({ status: "expired" });
    throw new HttpsError("failed-precondition", "Deze uitnodiging is verlopen. Maak een nieuwe uitnodiging aan.");
  }

  // 4. Update Firestore
  await inviteDoc.ref.update({
    reminderSentAt: new Date(),
    reminderDue: false,
    status: "reminded",
  });

  logger.info(`✅ Herinnering geregistreerd voor ${invite.email}`);

  // 5. Geef email terug — client stuurt sendPasswordResetEmail()
  return {
    success: true,
    email: invite.email as string,
  };
});
