import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";
import { db, auth as adminAuth } from "./firebase-admin-init";
import { Timestamp } from "firebase-admin/firestore";
import { buildReminderEmailHtml, buildReminderEmailSubject } from "./emailTemplates";

const gmailUser = defineSecret("GMAIL_USER");
const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");
const APP_NAME = "BuurtApp Lelystad";

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
    secrets: [gmailUser, gmailPassword],
  },
  async () => {
    const now = Timestamp.now();
    const threeDaysAgo = Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser.value(),
        pass: gmailPassword.value(),
      },
    });

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

      // Stuur herinneringsmail met verse reset-link
      try {
        const daysLeft = 7 - Math.floor((Date.now() - invite.invitedAt.toMillis()) / (1000 * 60 * 60 * 24));
        const freshResetLink = await adminAuth.generatePasswordResetLink(invite.email, {
          url: `https://buurtapp-v3-4.web.app/#/login`,
        });
        await transporter.sendMail({
          from: `"${APP_NAME}" <${gmailUser.value()}>`,
          to: invite.email,
          subject: buildReminderEmailSubject(),
          html: buildReminderEmailHtml({
            name: invite.name,
            email: invite.email,
            role: invite.role,
            freshPasswordResetLink: freshResetLink,
            daysLeft: Math.max(0, daysLeft),
          }),
        });
        logger.info(`📧 Herinneringsmail verstuurd naar ${invite.email}`);
      } catch (mailErr) {
        logger.warn(`⚠️ Herinneringsmail mislukt voor ${invite.email}:`, mailErr);
      }

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

      // Stuur melding naar beheerder dat uitnodiging is verlopen
      try {
        await transporter.sendMail({
          from: `"${APP_NAME}" <${gmailUser.value()}>`,
          to: invite.invitedByEmail,
          subject: `Uitnodiging verlopen — ${invite.name}`,
          html: `<p>De uitnodiging voor <strong>${invite.name}</strong> (${invite.email}) is verlopen.</p>
                 <p><a href="https://buurtapp-v3-4.web.app/#/admin?tab=users">Stuur een nieuwe uitnodiging →</a></p>`,
        });
        logger.info(`📧 Verlopen-mail verstuurd naar ${invite.invitedByEmail}`);
      } catch (mailErr) {
        logger.warn(`⚠️ Verlopen-mail mislukt voor ${invite.email}:`, mailErr);
      }

      expiredCount++;
      logger.info(`⏱️ Uitnodiging verlopen voor ${invite.email}`);
    }

    logger.info(
      `✅ checkExpiredInvites klaar — ${reminderCount} herinnering(en) gepland, ${expiredCount} uitnodiging(en) verlopen`
    );
  }
);
