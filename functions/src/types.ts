// Dit bestand deelt de 'UserRole' enum tussen de frontend en de backend (Firebase Functions)
// Zorg ervoor dat dit bestand synchroon blijft met `src/types.ts` op de frontend.

export enum UserRole {
  Concierge = 'Concierge',
  Beheerder = 'Beheerder',
  Viewer = 'Viewer',
}
