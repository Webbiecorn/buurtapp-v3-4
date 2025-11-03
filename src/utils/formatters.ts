import { Urenregistratie } from '../types';

export const formatUrenregistratieActiviteit = (uur: Urenregistratie): string => {
  // Eerst controleren op de nieuwe, gestructureerde data
  if (uur.activiteit) {
    switch (uur.activiteit) {
      case 'Project':
        return `Project: ${uur.projectName || uur.projectId || 'Onbekend'}`;
      case 'Wijkronde':
        return `Wijkronde: ${uur.wijk || 'Onbekende wijk'}`;
      case 'Extern overleg':
        return `Extern overleg: ${uur.overlegPartner || 'Onbekend'}`;
      case 'Intern overleg':
        return uur.omschrijving ? `Intern overleg: ${uur.omschrijving}` : 'Intern overleg';
      case 'Overig':
        return uur.omschrijving ? `Overig: ${uur.omschrijving}` : 'Overige werkzaamheden';
      default:
        // Vangt eventuele andere gedefinieerde activiteit types op
        return uur.omschrijving || uur.activiteit;
    }
  }

  // Fallback voor de oude datastructuur (alleen een omschrijving)
  if (uur.omschrijving) {
    return uur.omschrijving;
  }

  // Fallback voor de allereerste datastructuur
  const legacyUur = uur as any;
  if (legacyUur.details) {
    return legacyUur.details;
  }

  return 'Geen details';
};
