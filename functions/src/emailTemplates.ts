/**
 * Email HTML Templates voor BuurtApp
 * Klaar voor nodemailer — activeer door in sendWelcomeEmail.ts de transporter te koppelen.
 */

const APP_URL = process.env.GCLOUD_PROJECT
  ? `https://${process.env.GCLOUD_PROJECT}.web.app`
  : 'https://buurtapp-v3-4.web.app';

// APP_URL is used in nodemailer blocks — exported for use in future email sends
export { APP_URL };

const APP_NAME = 'BuurtApp Lelystad';
const LOGO_COLOR = '#1e40af'; // brand-primary blauw

/** Gemeenschappelijke HTML-schil */
const emailShell = (title: string, body: string): string => `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${LOGO_COLOR};padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Wijkbeheer platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Dit is een automatisch bericht van ${APP_NAME}.<br />
                Vragen? Neem contact op met je beheerder.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                © ${new Date().getFullYear()} ${APP_NAME} — Webbiecorn
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/** Knop-helper */
const ctaButton = (href: string, label: string): string => `
  <table cellpadding="0" cellspacing="0" style="margin:32px auto;">
    <tr>
      <td align="center" style="background:${LOGO_COLOR};border-radius:8px;">
        <a href="${href}"
           style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

// ==========================================================================
// Uitnodigingsmail
// ==========================================================================

export interface InviteEmailData {
  name: string;
  email: string;
  role: string;
  organisatie?: string;
  allowedModules?: string[];
  invitedByName: string;
  passwordResetLink: string;
}

export function buildInviteEmailHtml(data: InviteEmailData): string {
  const modulesText = data.allowedModules && data.allowedModules.length > 0
    ? data.allowedModules.join(', ')
    : 'alle modules';

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Welkom bij ${APP_NAME}, ${data.name}!</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;">
      <strong>${data.invitedByName}</strong> heeft je uitgenodigd voor <strong>${APP_NAME}</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0f7ff;border-radius:8px;border:1px solid #bfdbfe;margin:0 0 24px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Jouw account</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:3px 0;font-size:14px;color:#374151;width:120px;font-weight:600;">E-mail</td><td style="padding:3px 0;font-size:14px;color:#111827;">${data.email}</td></tr>
            <tr><td style="padding:3px 0;font-size:14px;color:#374151;font-weight:600;">Rol</td><td style="padding:3px 0;font-size:14px;color:#111827;">${data.role}</td></tr>
            ${data.organisatie ? `<tr><td style="padding:3px 0;font-size:14px;color:#374151;font-weight:600;">Organisatie</td><td style="padding:3px 0;font-size:14px;color:#111827;">${data.organisatie}</td></tr>` : ''}
            <tr><td style="padding:3px 0;font-size:14px;color:#374151;font-weight:600;">Toegang tot</td><td style="padding:3px 0;font-size:14px;color:#111827;">${modulesText}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:15px;color:#4b5563;">
      Klik op de knop hieronder om je wachtwoord in te stellen en direct aan de slag te gaan.
      De link is <strong>7 dagen</strong> geldig.
    </p>

    ${ctaButton(data.passwordResetLink, 'Wachtwoord instellen & inloggen')}

    <p style="margin:0;font-size:13px;color:#9ca3af;">
      Of kopieer deze link in je browser:<br />
      <span style="color:#1e40af;word-break:break-all;">${data.passwordResetLink}</span>
    </p>
  `;

  return emailShell(`Uitnodiging ${APP_NAME}`, body);
}

export function buildInviteEmailText(data: InviteEmailData): string {
  return `Welkom bij ${APP_NAME}, ${data.name}!

${data.invitedByName} heeft je uitgenodigd.

E-mail: ${data.email}
Rol: ${data.role}
${data.organisatie ? `Organisatie: ${data.organisatie}\n` : ''}
Stel je wachtwoord in via:
${data.passwordResetLink}

De link is 7 dagen geldig.`;
}

export function buildInviteEmailSubject(): string {
  return `Uitnodiging: je account voor ${APP_NAME}`;
}

// ==========================================================================
// Herinneringsmail (dag 3)
// ==========================================================================

export interface ReminderEmailData {
  name: string;
  email: string;
  role: string;
  freshPasswordResetLink: string;
  daysLeft: number;
}

export function buildReminderEmailHtml(data: ReminderEmailData): string {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Herinnering: account nog niet geactiveerd</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;">
      Hoi <strong>${data.name}</strong>, je hebt je uitnodiging voor ${APP_NAME} nog niet gebruikt.
      Je account is nog <strong>${data.daysLeft} dagen</strong> geldig.
    </p>

    <p style="margin:0 0 8px;font-size:15px;color:#4b5563;">
      Klik hieronder om je wachtwoord in te stellen. Dit is een nieuwe link — de vorige is verlopen.
    </p>

    ${ctaButton(data.freshPasswordResetLink, 'Account activeren')}

    <p style="margin:0;font-size:13px;color:#9ca3af;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:12px;">
      ⏰ Activeer je account vóór de link verloopt. Daarna moet een beheerder je opnieuw uitnodigen.
    </p>
  `;

  return emailShell(`Herinnering: activeer je ${APP_NAME} account`, body);
}

export function buildReminderEmailSubject(): string {
  return `Herinnering: activeer je ${APP_NAME} account`;
}
