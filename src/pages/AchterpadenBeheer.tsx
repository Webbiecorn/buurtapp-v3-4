import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Type definition for jsPDF with autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const AchterpadenBeheer: React.FC = () => {
  const [registraties, setRegistraties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedWijk, setSelectedWijk] = useState<string>('alle');
  const [enqueteVragen, setEnqueteVragen] = useState<string[]>([
    'Gebruikt u dit achterpad regelmatig?',
    'Hoe veilig voelt u zich op dit achterpad?',
    'Welke verbeteringen zijn volgens u nodig?',
    'Overige opmerkingen'
  ]);
  const [nieuwVraag, setNieuwVraag] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'achterpaden'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistraties(data);
      
      // Load enquete vragen from Firestore if exists
      const configSnapshot = await getDocs(collection(db, 'config'));
      const enqueteConfig = configSnapshot.docs.find(d => d.id === 'enqueteVragen');
      if (enqueteConfig) {
        setEnqueteVragen(enqueteConfig.data().vragen || enqueteVragen);
      }
    } catch (error) {
      console.error('Fout bij laden data:', error);
    }
    setLoading(false);
  };

  const saveEnqueteVragen = async () => {
    try {
      await setDoc(doc(db, 'config', 'enqueteVragen'), {
        vragen: enqueteVragen,
        updatedAt: new Date()
      });
      alert('Enquête vragen opgeslagen!');
    } catch (error) {
      console.error('Fout bij opslaan:', error);
      alert('Fout bij opslaan enquête vragen');
    }
  };

  const addVraag = () => {
    if (!nieuwVraag.trim()) return;
    setEnqueteVragen([...enqueteVragen, nieuwVraag]);
    setNieuwVraag('');
  };

  const deleteVraag = (index: number) => {
    setEnqueteVragen(enqueteVragen.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(enqueteVragen[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const updated = [...enqueteVragen];
      updated[editingIndex] = editingText;
      setEnqueteVragen(updated);
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...enqueteVragen];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setEnqueteVragen(updated);
  };

  const moveDown = (index: number) => {
    if (index === enqueteVragen.length - 1) return;
    const updated = [...enqueteVragen];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setEnqueteVragen(updated);
  };

  // Filter registraties
  const filtered = selectedWijk === 'alle' 
    ? registraties 
    : registraties.filter(r => r.wijk === selectedWijk);

  // Get available wijken
  const wijken = Array.from(new Set(registraties.map(r => r.wijk).filter(Boolean))).sort();

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text('Achterpaden Rapport', 14, 20);
      doc.setFontSize(11);
      doc.text(`Wijk: ${selectedWijk === 'alle' ? 'Alle wijken' : selectedWijk}`, 14, 28);
      doc.text(`Totaal: ${filtered.length} registraties`, 14, 34);
      doc.text(`Gegenereerd: ${new Date().toLocaleString('nl-NL')}`, 14, 40);

      // Table data
      const tableData = filtered.map(r => {
        const veiligheidScore = r.veiligheid?.score ? '⭐'.repeat(r.veiligheid.score) : r.staat || '-';
        const urgentie = r.onderhoud?.urgentie || '-';
        const medewerker = r.registeredBy?.userName || r.registeredBy?.userRole || '-';
        const datum = r.createdAt?.seconds 
          ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('nl-NL')
          : '-';

        return [
          datum,
          r.wijk || '-',
          r.straat || '-',
          veiligheidScore,
          urgentie,
          r.lengte ? `${Math.round(r.lengte)}m` : '-',
          medewerker
        ];
      });

      doc.autoTable({
        startY: 48,
        head: [['Datum', 'Wijk', 'Straat', 'Veiligheid', 'Urgentie', 'Lengte', 'Medewerker']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`achterpaden_${selectedWijk}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Fout bij PDF export:', error);
      alert('Fout bij exporteren naar PDF');
    }
    setExporting(false);
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      const excelData = filtered.map(r => {
        const veiligheidScore = r.veiligheid?.score || '';
        const urgentie = r.onderhoud?.urgentie || '';
        const medewerker = r.registeredBy?.userName || r.registeredBy?.userRole || '';
        const datum = r.createdAt?.seconds 
          ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('nl-NL')
          : '';

        return {
          'Datum': datum,
          'Wijk': r.wijk || '',
          'Straat': r.straat || '',
          'Huisnummers': r.huisnummers || '',
          'Lengte (m)': r.lengte ? Math.round(r.lengte) : '',
          'Veiligheid Score': veiligheidScore,
          'Verlichting': r.veiligheid?.verlichting || '',
          'Zichtbaarheid': r.veiligheid?.zichtbaarheid || '',
          'Urgentie': urgentie,
          'Bestrating': r.onderhoud?.bestrating || '',
          'Begroeiing': r.onderhoud?.begroeiing || '',
          'Vervuiling': r.onderhoud?.vervuiling || '',
          'Beschrijving': r.beschrijving || '',
          'Bewoner Enquêtes': r.bewonerEnquetes?.length || 0,
          'Medewerker': medewerker
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Achterpaden');
      
      // Auto-width columns
      const maxWidth = 50;
      const colWidths = Object.keys(excelData[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...excelData.map(row => String(row[key as keyof typeof row] || '').length)
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `achterpaden_${selectedWijk}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Fout bij Excel export:', error);
      alert('Fout bij exporteren naar Excel');
    }
    setExporting(false);
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Laden...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-dark-text-primary">Beheer Achterpaden</h1>

      {/* Enquête Management Section */}
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Enquête Vragen Beheren</span>
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Beheer de vragen die gesteld worden tijdens de bewoner enquête in de registratie.
        </p>

        <div className="space-y-3 mb-4">
          {enqueteVragen.map((vraag, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-dark-bg p-3 rounded">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">{index + 1}.</span>
              
              {editingIndex === index ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-surface"
                  autoFocus
                />
              ) : (
                <span className="flex-1">{vraag}</span>
              )}

              <div className="flex items-center gap-1">
                {editingIndex === index ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      title="Opslaan"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                      title="Annuleren"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                      title="Omhoog"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === enqueteVragen.length - 1}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                      title="Omlaag"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => startEdit(index)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 rounded"
                      title="Bewerken"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteVraag(index)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded"
                      title="Verwijderen"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={nieuwVraag}
            onChange={(e) => setNieuwVraag(e.target.value)}
            placeholder="Nieuwe vraag toevoegen..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-surface"
            onKeyDown={(e) => e.key === 'Enter' && addVraag()}
          />
          <button
            onClick={addVraag}
            className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-blue-700"
          >
            + Toevoegen
          </button>
        </div>

        <button
          onClick={saveEnqueteVragen}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          💾 Opslaan naar Database
        </button>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📤</span>
          <span>Data Export</span>
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exporteer achterpaden data naar PDF of Excel formaat.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Selecteer wijk</label>
            <select
              value={selectedWijk}
              onChange={(e) => setSelectedWijk(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-surface"
            >
              <option value="alle">Alle wijken ({registraties.length})</option>
              {wijken.map(wijk => (
                <option key={wijk} value={wijk}>
                  {wijk} ({registraties.filter(r => r.wijk === wijk).length})
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filtered.length} registratie{filtered.length !== 1 ? 's' : ''} geselecteerd
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportToPDF}
            disabled={exporting || filtered.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>📄</span>
            <span>Exporteer naar PDF</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting || filtered.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>📊</span>
            <span>Exporteer naar Excel</span>
          </button>
        </div>

        {exporting && (
          <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
            Bezig met exporteren...
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>👁️</span>
          <span>Preview Geselecteerde Data</span>
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th className="text-left p-2">Datum</th>
                <th className="text-left p-2">Wijk</th>
                <th className="text-left p-2">Straat</th>
                <th className="text-left p-2">Veiligheid</th>
                <th className="text-left p-2">Urgentie</th>
                <th className="text-left p-2">Lengte</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((r, index) => {
                const datum = r.createdAt?.seconds 
                  ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('nl-NL')
                  : '-';
                const veiligheidScore = r.veiligheid?.score ? '⭐'.repeat(r.veiligheid.score) : r.staat || '-';
                const urgentie = r.onderhoud?.urgentie || '-';

                return (
                  <tr key={r.id || index} className="border-b border-gray-100 dark:border-dark-border">
                    <td className="p-2">{datum}</td>
                    <td className="p-2">{r.wijk || '-'}</td>
                    <td className="p-2">{r.straat || '-'}</td>
                    <td className="p-2">{veiligheidScore}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        urgentie === 'spoed' ? 'bg-red-100 text-red-800' :
                        urgentie === 'hoog' ? 'bg-orange-100 text-orange-800' :
                        urgentie === 'normaal' ? 'bg-yellow-100 text-yellow-800' :
                        urgentie === 'laag' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {urgentie}
                      </span>
                    </td>
                    <td className="p-2">{r.lengte ? `${Math.round(r.lengte)}m` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 10 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Toont eerste 10 van {filtered.length} registraties
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchterpadenBeheer;
