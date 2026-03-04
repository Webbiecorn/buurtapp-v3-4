import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { db } from "./firebase-admin-init";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Geplande Cloud Function — draait elke dag om 08:00 Amsterdam-tijd.
 *
 * Twee taken:
 * A) Herinnering markeren (dag 3): uitnodigingen die 3+ dagen oud zijn, nog pending
 *    zijn en nog geen herinnering hebben gekregen → zet `reminderDue: true` + in-app notificatie
 *
 * B) Verlopen markeren (dag 7): uitnodigingen waarvan expiresAt verstreken is → zet
 *    status 'expired' + in-app notificatie naar de uitnodigende beheerder
 *
 * Wanneer Gmail/SMTP geconfigureerd is (GMAIL_USER + GMAIL_APP_PASSWORD env vars),
 * worden de notificaties ook per e-mail verstuurd.
 */
export const checkExpiredInvites = onSchedule(
  {
    schedule: "0 8 * * *",       // elke dag 08:00 UTC (= 09:00 / 10:00 Amsterdam)
    timeZone: "Europe/Amsterdam",
  },
  async () => {
    const now = Timestamp.now();
    const threeDaysAgo = Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // ─── A) Herinnering markeren na 3 dagen ───────────────────────────────────
    const reminderSnap = await db
      .collection("invites")
      .where("status", "==", "pending")
      .where("invitedAt", "<=", threeDaysAgo)
      .get();

    let reminderCount = 0;
    for (const inviteDoc of reminderSnap.docs) {
      const invite = inviteDoc.data();
      if (invite.reminderSentAt !== null) continue; // al een herinnering gehad

      await inviteDoc.ref.update({ reminderDue: true });

      // In-app notificatie naar de beheerder die de uitnodiging verstuurde
      await db.collection("notificaties").add({
        userId: invite.invitedBy,
        message: `⏰ Herinnering nodig: ${invite.name} (${invite.email}) heeft de uitnodiging nog niet geaccepteerd. Stuur een herinnering via Beheer → Gebruikers.`,
        link: "/#/admin?tab=users",
        isRead: false,
        timestamp: now,
        targetId: inviteDoc.id,
        targetType: "melding",
      });

      reminderCount++;
      logger.info(`📧 reminderDue gezet voor ${invite.email}`);
    }

    // ─── B) Verlopen markeren na 7 dagen ─────────────────────────────────────
    const expiredSnap = await db
      .collection("invites")
      .where("status", "in", ["pending", "reminded"])
      .where("expiresAt", "<=", now)
      .get();

    let expiredCount = 0;
    for (const inviteDoc of expiredSnap.docs) {
      const invite = inviteDoc.data();

      await inviteDoc.ref.update({ status: "expired" });

      // In-app notificatie — link gaat naar beheer zodat admin nieuwe uitnodiging kan sturen
      await db.collection("notificaties").add({
        userId: invite.invitedBy,
        message: `❌ Uitnodiging verlopen: ${invite.name} (${invite.email}) heeft de uitnodiging niet op tijd geaccepteerd. Stuur een nieuwe uitnodiging via Beheer → Gebruikers.`,
        link: "/#/admin?tab=users",
        isRead: false,
        timestamp: now,
        targetId: inviteDoc.id,
        targetType: "melding",
      });

      expiredCount++;
      logger.info(`⏱️ Uitnodiging verlopen voor ${invite.email}`);
    }

    // ─── TODO: Gmail e-mail verzenden ─────────────────────────────────────────
    // Zodra je DNS-records en een Gmail App Password hebt:
    //   1. Voeg toe aan Firebase Secrets:
    //      firebase functions:secrets:set GMAIL_USER
    //      firebase functions:secrets:set GMAIL_APP_PASSWORD
    //   2. Verwijder onderstaand commentaar en installeer nodemailer:
    //      cd functions && npm install nodemailer @types/nodemailer
    //
    // import nodemailer from "nodemailer";
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.GMAIL_USER,
    //     pass: process.env.GMAIL_APP_PASSWORD,
    //   },
    // });
    //
    // Stuur mail bij verlopen uitnodiging:
    // await transporter.sendMail({
    //   from: `"Buurtconciërge App" <${process.env.GMAIL_USER}>`,
    //   to: invite.invitedByEmail,
    //   subject: "Uitnodiging verlopen",
    //   html: `<p>De uitnodiging voor <strong>${invite.name}</strong> (${invite.email}) is verlopen.</p>
    //          <p><a href="https://buurtapp-v3-4.web.app/#/admin?tab=users">Stuur een nieuwe uitnodiging →</a></p>`,
    // });

    logger.info(
      `✅ checkExpiredInvites klaar — ${reminderCount} herinnering(en) gepland, ${expiredCount} uitnodiging(en) verlopen`
    );
  }
);
