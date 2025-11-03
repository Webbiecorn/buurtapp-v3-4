import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Melding, Project, Urenregistratie, User } from '../types';

// Extend jsPDF type to include lastAutoTable property
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}

// Type for autoTable function
type AutoTableOptions = {
  startY?: number;
  head?: any[][];
  body: any[][];
  theme?: string;
  headStyles?: any;
  styles?: any;
  columnStyles?: any;
  margin?: any;
};

const PRIMARY_COLOR = [29, 78, 216]; // #1d4ed8 as RGB
const TEXT_COLOR = [31, 41, 55]; // #1f2937 as RGB
const WHITE = [255, 255, 255];
const GRAY = [128, 128, 128];

interface ExportData {
  meldingen?: Melding[];
  projecten?: Project[];
  urenregistraties?: Urenregistratie[];
  users?: User[];
  title?: string;
}

function addHeader(pdf: jsPDF, title: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Add header background
  pdf.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  pdf.rect(0, 0, pageWidth, 30, 'F');

  // Title
  pdf.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 15, 18);

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gegenereerd op: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: nl })}`, 15, 25);
  
  // Reset text color
  pdf.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
}

function addFooters(pdf: jsPDF) {
  const pageCount = (pdf as any).internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    pdf.text(
      `Buurtconciërge App - Pagina ${i} van ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

export async function exportStatisticsToPDF(data: ExportData): Promise<void> {
  return exportCompletePDF(data);
}

export async function exportMeldingenToPDF(meldingen: Melding[]): Promise<void> {
  if (!meldingen || meldingen.length === 0) {
    throw new Error('Geen meldingen beschikbaar om te exporteren');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  
  addHeader(pdf, 'Meldingen Rapport');

  // Summary
  pdf.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Samenvatting', 15, 40);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Totaal aantal meldingen: ${meldingen.length}`, 15, 48);

  // Status breakdown
  const statusCount = meldingen.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let yPos = 54;
  Object.entries(statusCount).forEach(([status, count]) => {
    pdf.text(`${status}: ${count}`, 20, yPos);
    yPos += 5;
  });

  // Meldingen table
  const tableData = meldingen.map(m => [
    m.id.substring(0, 8),
    m.titel.length > 25 ? m.titel.substring(0, 25) + '...' : m.titel,
    m.wijk,
    m.categorie,
    m.status,
    format(m.timestamp, 'dd-MM-yyyy', { locale: nl }),
  ]);

  autoTable(pdf, {
    startY: yPos + 10,
    head: [['ID', 'Titel', 'Wijk', 'Categorie', 'Status', 'Datum']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR as [number, number, number],
      textColor: WHITE as [number, number, number],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  addFooters(pdf);

  const filename = `meldingen-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  pdf.save(filename);
}

export async function exportProjectenToPDF(projecten: Project[]): Promise<void> {
  if (!projecten || projecten.length === 0) {
    throw new Error('Geen projecten beschikbaar om te exporteren');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  
  addHeader(pdf, 'Projecten Rapport');

  // Summary
  pdf.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Samenvatting', 15, 40);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Totaal aantal projecten: ${projecten.length}`, 15, 48);

  const lopendeProjecten = projecten.filter(p => p.status === 'Lopend').length;
  const afgerondeProjecten = projecten.filter(p => p.status === 'Afgerond').length;

  pdf.text(`Lopend: ${lopendeProjecten}`, 20, 54);
  pdf.text(`Afgerond: ${afgerondeProjecten}`, 20, 60);

  // Projecten table
  const tableData = projecten.map(p => [
    p.id.substring(0, 8),
    p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title,
    p.status,
    format(p.startDate, 'dd-MM-yyyy', { locale: nl }),
    p.endDate ? format(p.endDate, 'dd-MM-yyyy', { locale: nl }) : '-',
    (p.participantIds?.length || 0).toString(),
  ]);

  autoTable(pdf, {
    startY: 70,
    head: [['ID', 'Titel', 'Status', 'Start', 'Eind', 'Deelnemers']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR as [number, number, number],
      textColor: WHITE as [number, number, number],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 55 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  addFooters(pdf);

  const filename = `projecten-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  pdf.save(filename);
}

export async function exportCompletePDF(data: ExportData): Promise<void> {
  if (!data.meldingen && !data.projecten && !data.urenregistraties) {
    throw new Error('Geen data beschikbaar om te exporteren');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  
  addHeader(pdf, data.title || 'Buurtconciërge Volledig Rapport');

  let yPosition = 40;

  // Summary section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  pdf.text('Samenvatting', 15, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  if (data.meldingen) {
    const statusCount = data.meldingen.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    pdf.text(`Totaal aantal meldingen: ${data.meldingen.length}`, 15, yPosition);
    yPosition += 5;
    Object.entries(statusCount).forEach(([status, count]) => {
      pdf.text(`  • ${status}: ${count}`, 20, yPosition);
      yPosition += 5;
    });
    yPosition += 3;
  }
  
  if (data.projecten) {
    const lopend = data.projecten.filter(p => p.status === 'Lopend').length;
    const afgerond = data.projecten.filter(p => p.status === 'Afgerond').length;
    pdf.text(`Totaal aantal projecten: ${data.projecten.length}`, 15, yPosition);
    yPosition += 5;
    pdf.text(`  • Lopend: ${lopend}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`  • Afgerond: ${afgerond}`, 20, yPosition);
    yPosition += 8;
  }
  
  if (data.urenregistraties) {
    const totalHours = data.urenregistraties
      .filter(u => u.eind)
      .reduce((acc, u) => acc + (new Date(u.eind!).getTime() - new Date(u.start).getTime()), 0) / (1000 * 60 * 60);
    pdf.text(`Totaal geregistreerde uren: ${totalHours.toFixed(2)} uur`, 15, yPosition);
    yPosition += 10;
  }

  // Add Meldingen table if available
  if (data.meldingen && data.meldingen.length > 0) {
    if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Meldingen Overzicht', 15, yPosition);
    yPosition += 5;

    const meldingenData = data.meldingen.slice(0, 50).map(m => [ // Max 50 for performance
      m.id.substring(0, 8),
      m.titel.length > 20 ? m.titel.substring(0, 20) + '...' : m.titel,
      m.wijk.substring(0, 15),
      m.status,
      format(m.timestamp, 'dd-MM', { locale: nl }),
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [['ID', 'Titel', 'Wijk', 'Status', 'Datum']],
      body: meldingenData,
      theme: 'striped',
      headStyles: {
        fillColor: PRIMARY_COLOR as [number, number, number],
        textColor: WHITE as [number, number, number],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
      },
      margin: { left: 15, right: 15 },
    });

    yPosition = pdf.lastAutoTable?.finalY || yPosition + 50;
    
    if (data.meldingen.length > 50) {
      yPosition += 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`(Eerste 50 van ${data.meldingen.length} meldingen getoond)`, 15, yPosition);
      yPosition += 5;
    }
  }

  // Add Projecten table if available
  if (data.projecten && data.projecten.length > 0) {
    if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    } else {
      yPosition += 10;
    }
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    pdf.text('Projecten Overzicht', 15, yPosition);
    yPosition += 5;

    const projectenData = data.projecten.slice(0, 30).map(p => [ // Max 30 for performance
      p.id.substring(0, 8),
      p.title.length > 25 ? p.title.substring(0, 25) + '...' : p.title,
      p.status,
      format(p.startDate, 'dd-MM', { locale: nl }),
      p.endDate ? format(p.endDate, 'dd-MM', { locale: nl }) : '-',
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [['ID', 'Titel', 'Status', 'Start', 'Eind']],
      body: projectenData,
      theme: 'striped',
      headStyles: {
        fillColor: PRIMARY_COLOR as [number, number, number],
        textColor: WHITE as [number, number, number],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 70 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
      },
      margin: { left: 15, right: 15 },
    });
    
    if (data.projecten.length > 30) {
      const finalY = pdf.lastAutoTable?.finalY || yPosition;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`(Eerste 30 van ${data.projecten.length} projecten getoond)`, 15, finalY + 5);
    }
  }

  addFooters(pdf);

  const filename = `volledig-rapport-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  pdf.save(filename);
}
