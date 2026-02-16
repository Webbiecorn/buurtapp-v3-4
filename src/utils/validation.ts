/**
 * Zod Validation Schemas
 *
 * Centralized input validation schemas voor alle formulieren in de applicatie.
 * Dit verbetert security en data integrity.
 */

import { z } from 'zod';

// ============ Email & Auth ============

export const emailSchema = z.string()
  .email('Ongeldig e-mailadres')
  .min(5, 'E-mailadres te kort')
  .max(100, 'E-mailadres te lang');

export const passwordSchema = z.string()
  .min(8, 'Wachtwoord moet minimaal 8 tekens zijn')
  .max(128, 'Wachtwoord te lang')
  .regex(/[A-Z]/, 'Wachtwoord moet minimaal 1 hoofdletter bevatten')
  .regex(/[a-z]/, 'Wachtwoord moet minimaal 1 kleine letter bevatten')
  .regex(/[0-9]/, 'Wachtwoord moet minimaal 1 cijfer bevatten');

export const nameSchema = z.string()
  .min(2, 'Naam te kort')
  .max(100, 'Naam te lang')
  .regex(/^[a-zA-Z\s\u00C0-\u017F'-]+$/, 'Naam bevat ongeldige tekens');

// ============ User ============

export const userRoleSchema = z.enum(['beheerder', 'conciërge', 'viewer']);

export const inviteUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: userRoleSchema,
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: userRoleSchema.optional(),
  disabled: z.boolean().optional(),
});

// ============ Melding ============

export const meldingStatusSchema = z.enum([
  'Openstaand',
  'In behandeling',
  'Afgerond',
  'Uitgesteld',
]);

export const meldingCategorieSchema = z.enum([
  'Groen',
  'Afval',
  'Sociaal',
  'Onderhoud',
  'Overlast',
  'Overig',
]);

export const createMeldingSchema = z.object({
  titel: z.string()
    .min(3, 'Titel moet minimaal 3 tekens zijn')
    .max(100, 'Titel te lang'),
  omschrijving: z.string()
    .min(10, 'Omschrijving moet minimaal 10 tekens zijn')
    .max(1000, 'Omschrijving te lang'),
  wijk: z.string()
    .min(2, 'Wijk is verplicht')
    .max(100, 'Wijk te lang'),
  categorie: meldingCategorieSchema,
  status: meldingStatusSchema.optional(),
  locatie: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }).optional().nullable(),
});

export const updateMeldingSchema = z.object({
  omschrijving: z.string().min(10).max(1000).optional(),
  status: meldingStatusSchema.optional(),
  categorie: meldingCategorieSchema.optional(),
  prioriteit: z.enum(['Laag', 'Normaal', 'Hoog']).optional(),
  opmerking: z.string().max(500).optional(),
});

// ============ Project ============

export const projectStatusSchema = z.enum([
  'Gepland',
  'In uitvoering',
  'Afgerond',
  'Geannuleerd',
]);

export const createProjectSchema = z.object({
  naam: z.string()
    .min(3, 'Projectnaam moet minimaal 3 tekens zijn')
    .max(100, 'Projectnaam te lang'),
  beschrijving: z.string()
    .min(10, 'Beschrijving moet minimaal 10 tekens zijn')
    .max(2000, 'Beschrijving te lang'),
  locatie: z.string()
    .min(3, 'Locatie moet minimaal 3 tekens zijn')
    .max(200, 'Locatie te lang'),
  startDate: z.date(),
  endDate: z.date().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export const updateProjectSchema = z.object({
  naam: z.string().min(3).max(100).optional(),
  beschrijving: z.string().min(10).max(2000).optional(),
  status: projectStatusSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============ Dossier ============

export const dossierStatusSchema = z.enum([
  'Actief',
  'Afgesloten',
  'In behandeling',
]);

export const createDossierSchema = z.object({
  volledigheidadres: z.string()
    .min(5, 'Adres moet minimaal 5 tekens zijn')
    .max(200, 'Adres te lang'),
  straatnaam: z.string().min(2).max(100),
  huisnummer: z.string().min(1).max(10),
  postcode: z.string()
    .regex(/^[1-9][0-9]{3}\s?[A-Z]{2}$/i, 'Ongeldige postcode (formaat: 1234AB)'),
  woonplaats: z.string().min(2).max(100),
  woningType: z.enum(['Huurwoning', 'Koopwoning', 'Sociale huur', 'Onbekend']).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export const addDossierNotitieSchema = z.object({
  tekst: z.string()
    .min(5, 'Notitie moet minimaal 5 tekens zijn')
    .max(2000, 'Notitie te lang'),
  type: z.enum(['Algemeen', 'Belangrijk', 'Contact']).optional(),
});

export const addDossierBewonerSchema = z.object({
  naam: nameSchema,
  telefoon: z.string()
    .regex(/^(\+31|0)[1-9][0-9]{8}$/, 'Ongeldig Nederlands telefoonnummer')
    .optional()
    .or(z.literal('')),
  email: emailSchema.optional().or(z.literal('')),
  opmerking: z.string().max(500).optional(),
});

// ============ Urenregistratie ============

export const createUrenregistratieSchema = z.object({
  gebruikerId: z.string().min(1, 'Gebruiker is verplicht'),
  start: z.date(),
  eind: z.date(),
  omschrijving: z.string()
    .min(5, 'Omschrijving moet minimaal 5 tekens zijn')
    .max(500, 'Omschrijving te lang'),
  projectId: z.string().optional(),
  meldingId: z.string().optional(),
}).refine((data) => data.eind > data.start, {
  message: 'Eindtijd moet na starttijd liggen',
  path: ['eind'],
});

// ============ Helper functions ============

/**
 * Valideer data met een schema en geef gebruiksvriendelijke errors terug
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}

/**
 * Valideer en throw error als validatie faalt
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// ============ Type exports ============

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type CreateMeldingInput = z.infer<typeof createMeldingSchema>;
export type UpdateMeldingInput = z.infer<typeof updateMeldingSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateDossierInput = z.infer<typeof createDossierSchema>;
export type AddDossierNotitieInput = z.infer<typeof addDossierNotitieSchema>;
export type AddDossierBewonerInput = z.infer<typeof addDossierBewonerSchema>;
export type CreateUrenregistratieInput = z.infer<typeof createUrenregistratieSchema>;
