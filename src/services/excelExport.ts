import * as XLSX from 'xlsx';
import type { Melding, Project, Urenregistratie, User } from '../types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ExportData {
  meldingen?: Melding[];
  projecten?: Project[];
  urenregistraties?: Urenregistratie[];
  users?: User[];
}

export async function exportToExcel(data: ExportData, filename: string = 'statistieken'): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Export Meldingen
  if (data.meldingen && data.meldingen.length > 0) {
    const meldingenData = data.meldingen.map(m => ({
      'ID': m.id,
      'Titel': m.titel,
      'Omschrijving': m.omschrijving,
      'Status': m.status,
      'Wijk': m.wijk,
      'Categorie': m.categorie,
      'Datum': format(m.timestamp, 'dd-MM-yyyy HH:mm', { locale: nl }),
      'Locatie': m.locatie ? `${m.locatie.lat}, ${m.locatie.lon}` : '-',
      'Afgerond': m.afgerondTimestamp ? format(m.afgerondTimestamp, 'dd-MM-yyyy HH:mm', { locale: nl }) : '-',
      'Aantal Updates': m.updates?.length || 0,
    }));

    const meldingenSheet = XLSX.utils.json_to_sheet(meldingenData);
    
    // Set column widths
    meldingenSheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 30 },  // Titel
      { wch: 40 },  // Omschrijving
      { wch: 15 },  // Status
      { wch: 20 },  // Wijk
      { wch: 20 },  // Categorie
      { wch: 18 },  // Datum
      { wch: 25 },  // Locatie
      { wch: 18 },  // Afgerond
      { wch: 15 },  // Aantal Updates
    ];

    XLSX.utils.book_append_sheet(workbook, meldingenSheet, 'Meldingen');
  }

  // Export Projecten
  if (data.projecten && data.projecten.length > 0) {
    const projectenData = data.projecten.map(p => ({
      'ID': p.id,
      'Titel': p.title,
      'Beschrijving': p.description || '-',
      'Status': p.status,
      'Startdatum': format(p.startDate, 'dd-MM-yyyy', { locale: nl }),
      'Einddatum': p.endDate ? format(p.endDate, 'dd-MM-yyyy', { locale: nl }) : '-',
      'Aantal Deelnemers': p.participantIds?.length || 0,
      'Budget': p.budget ? `€${p.budget}` : '-',
    }));

    const projectenSheet = XLSX.utils.json_to_sheet(projectenData);
    
    // Set column widths
    projectenSheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 30 },  // Titel
      { wch: 40 },  // Beschrijving
      { wch: 15 },  // Status
      { wch: 15 },  // Startdatum
      { wch: 15 },  // Einddatum
      { wch: 20 },  // Aantal Deelnemers
      { wch: 15 },  // Budget
    ];

    XLSX.utils.book_append_sheet(workbook, projectenSheet, 'Projecten');
  }

  // Export Urenregistraties
  if (data.urenregistraties && data.urenregistraties.length > 0 && data.users) {
    const urenData = data.urenregistraties.map(u => {
      const user = data.users?.find(usr => usr.id === u.gebruikerId);
      const durationMs = u.eind ? new Date(u.eind).getTime() - new Date(u.start).getTime() : 0;
      const durationHours = durationMs / (1000 * 60 * 60);

      return {
        'ID': u.id,
        'Gebruiker': user?.name || '-',
        'Activiteit': u.activiteit,
        'Project': u.projectName || '-',
        'Wijk': u.wijk || '-',
        'Start': format(u.start, 'dd-MM-yyyy HH:mm', { locale: nl }),
        'Eind': u.eind ? format(u.eind, 'dd-MM-yyyy HH:mm', { locale: nl }) : '-',
        'Duur (uren)': durationHours.toFixed(2),
      };
    });

    const urenSheet = XLSX.utils.json_to_sheet(urenData);
    
    // Set column widths
    urenSheet['!cols'] = [
      { wch: 10 },  // ID
      { wch: 25 },  // Gebruiker
      { wch: 20 },  // Activiteit
      { wch: 25 },  // Project
      { wch: 20 },  // Wijk
      { wch: 18 },  // Start
      { wch: 18 },  // Eind
      { wch: 15 },  // Duur
    ];

    XLSX.utils.book_append_sheet(workbook, urenSheet, 'Urenregistraties');
  }

  // Add summary sheet
  const summaryData = [
    { 'Categorie': 'Totaal Meldingen', 'Aantal': data.meldingen?.length || 0 },
    { 'Categorie': 'Totaal Projecten', 'Aantal': data.projecten?.length || 0 },
    { 'Categorie': 'Totaal Urenregistraties', 'Aantal': data.urenregistraties?.length || 0 },
    { 'Categorie': 'Export Datum', 'Aantal': format(new Date(), 'dd-MM-yyyy HH:mm', { locale: nl }) },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 30 },  // Categorie
    { wch: 20 },  // Aantal
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Samenvatting');

  // Generate Excel file
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const fullFilename = `${filename}-${timestamp}.xlsx`;
  
  XLSX.writeFile(workbook, fullFilename);
}

export function exportMeldingenToExcel(meldingen: Melding[]): Promise<void> {
  return exportToExcel({ meldingen }, 'meldingen');
}

export function exportProjectenToExcel(projecten: Project[]): Promise<void> {
  return exportToExcel({ projecten }, 'projecten');
}

export function exportUrenToExcel(urenregistraties: Urenregistratie[], users: User[]): Promise<void> {
  return exportToExcel({ urenregistraties, users }, 'urenregistraties');
}
