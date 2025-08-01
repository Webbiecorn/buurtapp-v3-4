

import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MessageSquareIcon, PhoneIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon, XIcon } from '../components/Icons';
import {
    differenceInHours,
    eachMonthOfInterval,
    endOfMonth,
    format,
    isWithinInterval,
} from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import startOfDay from 'date-fns/startOfDay';
import subMonths from 'date-fns/subMonths';
import nl from 'date-fns/locale/nl';
import * as ReactRouterDOM from 'react-router-dom';
import { Modal, StatCard } from '../components/ui';
import { Melding, MeldingStatus, User } from '../types';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";

// --- START: Reports Page ---

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e'];

const WijkRapport: React.FC<{ wijk: string }> = ({ wijk }) => {
    const { meldingen, theme } = useAppContext();
    const [aiSummary, setAiSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const wijkMeldingen = useMemo(() => meldingen.filter(m => m.wijk === wijk), [meldingen, wijk]);

    const stats = useMemo(() => {
        const afgerond = wijkMeldingen.filter(m => m.status === MeldingStatus.Afgerond);
        const doorlooptijden = afgerond
            .map(m => m.afgerondTimestamp ? differenceInHours(m.afgerondTimestamp, m.timestamp) : 0)
            .filter(h => h > 0);
        const gemiddeldeDoorlooptijd = doorlooptijden.length > 0 ? (doorlooptijden.reduce((a, b) => a + b, 0) / doorlooptijden.length).toFixed(1) : 'N/A';

        return {
            totaal: wijkMeldingen.length,
            open: wijkMeldingen.length - afgerond.length,
            afgerond: afgerond.length,
            gemiddeldeDoorlooptijd: gemiddeldeDoorlooptijd,
        };
    }, [wijkMeldingen]);

    const trendData = useMemo(() => {
        const months = eachMonthOfInterval({
            start: subMonths(new Date(), 5),
            end: new Date()
        });

        return months.map(monthStart => {
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
            const maand = format(monthStart, 'MMM', { locale: nl });
            
            const nieuw = wijkMeldingen.filter(m => m.timestamp >= monthStart && m.timestamp <= monthEnd).length;
            const opgelost = wijkMeldingen.filter(m => m.afgerondTimestamp && m.afgerondTimestamp >= monthStart && m.afgerondTimestamp <= monthEnd).length;

            return { maand, nieuw, opgelost };
        });
    }, [wijkMeldingen]);

    const categorieData = useMemo(() => {
        const counts = wijkMeldingen.reduce((acc, m) => {
            acc[m.categorie] = (acc[m.categorie] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [wijkMeldingen]);
    
    const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const tooltipStyle = theme === 'dark'
      ? { backgroundColor: '#1f2937', border: '1px solid #374151' }
      : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' };


    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setError('');
        setAiSummary('');

        if (!process.env.API_KEY) {
            setError('API key is niet ingesteld. Kan de samenvatting niet genereren.');
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const prompt = `
Je bent een data-analist voor een gemeente. Analyseer de volgende data over meldingen in wijk '${wijk}' en genereer een korte, duidelijke managementsamenvatting in het Nederlands.

**Gegevens:**
- Totaal aantal meldingen (historisch): ${stats.totaal}
- Aantal openstaande meldingen: ${stats.open}
- Aantal afgeronde meldingen: ${stats.afgerond}
- Gemiddelde doorlooptijd (in uren): ${stats.gemiddeldeDoorlooptijd}

**Probleemgebieden (verdeling per categorie):**
${categorieData.map(c => `- ${c.name}: ${c.value} melding(en)`).join('\n')}

**Trends (nieuwe vs opgeloste meldingen, laatste 6 maanden):**
${trendData.map(t => `- ${t.maand}: ${t.nieuw} nieuw, ${t.opgelost} opgelost`).join('\n')}

**Analyseer de data en geef in markdown-formaat:**
1.  **Conclusie:** Een algehele conclusie over de 'gezondheid' van de wijk.
2.  **Trends & Inzichten:** De belangrijkste trends of opvallende zaken.
3.  **Aanbevelingen:** Concrete, uitvoerbare aanbevelingen voor de wijkmanager.
`;
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            
            setAiSummary(response.text);

        } catch (err) {
            console.error(err);
            setError('Er is een fout opgetreden bij het genereren van de samenvatting. Controleer de API-sleutel en probeer het opnieuw.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<AlertTriangleIcon className="h-6 w-6 text-white" />} title="Open Meldingen" value={stats.open} color="bg-yellow-500" />
                <StatCard icon={<CheckCircleIcon className="h-6 w-6 text-white" />} title="Afgeronde Meldingen" value={stats.afgerond} color="bg-green-500" />
                <StatCard icon={<ClockIcon className="h-6 w-6 text-white" />} title="Gem. Doorlooptijd (uur)" value={stats.gemiddeldeDoorlooptijd} color="bg-blue-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Trends: Nieuw vs Opgelost</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="maand" stroke={tickColor} fontSize={12} />
                            <YAxis stroke={tickColor} fontSize={12} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{color: tickColor}}/>
                            <Line type="monotone" dataKey="nieuw" stroke="#3b82f6" name="Nieuw" strokeWidth={2} />
                            <Line type="monotone" dataKey="opgelost" stroke="#22c55e" name="Opgelost" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Probleemgebieden</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={categorieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {categorieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">AI Managementsamenvatting</h3>
                     <button onClick={handleGenerateSummary} disabled={isLoading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isLoading ? <SparklesIcon className="h-5 w-5 mr-2 animate-spin" /> : <SparklesIcon className="h-5 w-5 mr-2" />}
                        Genereer Samenvatting
                    </button>
                </div>
                {isLoading && (
                     <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-dark-text-secondary">Analyse wordt uitgevoerd, een moment geduld...</p>
                    </div>
                )}
                {error && <p className="text-red-500">{error}</p>}
                {aiSummary && (
                    <div className="prose prose-invert prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
                )}
            </div>
        </div>
    )
}

const PrintableReport: React.FC<{ data: any }> = ({ data }) => {
    const { reportPeriod, generatedAt, summary, stats } = data;

    const periodLabels = {
        month: 'Laatste Maand',
        quarter: 'Laatste Kwartaal',
        year: 'Laatste Jaar',
    };

    return (
        <div className="printable-report p-8 font-sans text-black bg-white">
            <header className="mb-8 border-b-2 border-gray-300 pb-4">
                <h1 className="text-4xl font-bold text-gray-800">Periodiek Rapport</h1>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{periodLabels[reportPeriod as keyof typeof periodLabels]}</span>
                    <span>Gegenereerd op: {format(generatedAt, 'dd-MM-yyyy HH:mm')}</span>
                </div>
            </header>
            
            <section className="mb-8">
                <h2 className="text-2xl font-semibold border-b border-gray-200 pb-2 mb-4">Managementsamenvatting</h2>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
            </section>
            
            <section>
                <h2 className="text-2xl font-semibold border-b border-gray-200 pb-2 mb-4">Kerncijfers</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-3xl font-bold">{stats.newIssues}</p>
                        <p className="text-sm text-gray-600">Nieuwe Meldingen</p>
                    </div>
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-3xl font-bold">{stats.resolvedIssues}</p>
                        <p className="text-sm text-gray-600">Opgeloste Meldingen</p>
                    </div>
                     <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-3xl font-bold">{stats.newProjects}</p>
                        <p className="text-sm text-gray-600">Nieuwe Projecten</p>
                    </div>
                    <div className="p-4 bg-gray-100 rounded-lg">
                        <p className="text-3xl font-bold">{stats.totalHours.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Geregistreerde Uren</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Meldingen per Categorie</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-200">
                                <tr><th className="p-2">Categorie</th><th className="p-2">Aantal</th></tr>
                            </thead>
                            <tbody>
                                {Object.entries(stats.issuesByCategory).map(([cat, count]) => (
                                    <tr key={cat} className="border-b"><td className="p-2">{cat}</td><td className="p-2">{count as number}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Uren per Activiteit</h3>
                        <table className="w-full text-left text-sm">
                             <thead className="bg-gray-200">
                                <tr><th className="p-2">Activiteit</th><th className="p-2">Uren</th></tr>
                            </thead>
                            <tbody>
                                 {Object.entries(stats.hoursByActivity).map(([act, hours]) => (
                                    <tr key={act} className="border-b"><td className="p-2">{act}</td><td className="p-2">{(hours as number).toFixed(2)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export const ReportsPage: React.FC = () => {
    const { meldingen, projecten, urenregistraties } = useAppContext();
    const [selectedWijk, setSelectedWijk] = useState('');
    const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [generatedReport, setGeneratedReport] = useState<any>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfError, setPdfError] = useState('');

    const wijken = useMemo(() => {
        const wijkSet = new Set(meldingen.map(m => m.wijk));
        return Array.from(wijkSet).sort();
    }, [meldingen]);

    useEffect(() => {
        if(wijken.length > 0 && !selectedWijk) {
            setSelectedWijk(wijken[0]);
        }
    }, [wijken, selectedWijk]);

    const handleGeneratePdfReport = async () => {
        setIsGeneratingPdf(true);
        setPdfError('');

        if (!process.env.API_KEY) {
            setPdfError('API key is niet ingesteld. Kan het rapport niet genereren.');
            setIsGeneratingPdf(false);
            return;
        }

        const today = startOfDay(new Date());
        let startDate: Date;
        switch (reportPeriod) {
            case 'month': startDate = subMonths(today, 1); break;
            case 'quarter': startDate = subMonths(today, 3); break;
            case 'year': startDate = subMonths(today, 12); break;
        }
        const interval = { start: startDate, end: today };

        // Filter data
        const filteredMeldingen = meldingen.filter(m => isWithinInterval(m.timestamp, interval));
        const resolvedMeldingen = filteredMeldingen.filter(m => m.status === MeldingStatus.Afgerond);
        const filteredProjecten = projecten.filter(p => isWithinInterval(p.startDate, interval));
        const filteredUren = urenregistraties.filter(u => u.eindtijd && isWithinInterval(u.starttijd, interval));

        // Summarize data
        const issuesByCategory = filteredMeldingen.reduce((acc, m) => {
            acc[m.categorie] = (acc[m.categorie] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const hoursByActivity = filteredUren.reduce((acc, u) => {
            const hours = differenceInHours(u.eindtijd!, u.starttijd);
            acc[u.activiteit] = (acc[u.activiteit] || 0) + hours;
            return acc;
        }, {} as Record<string, number>);

        const totalHours = Object.values(hoursByActivity).reduce((sum, h) => sum + h, 0);

        const stats = {
            newIssues: filteredMeldingen.length,
            resolvedIssues: resolvedMeldingen.length,
            newProjects: filteredProjecten.length,
            totalHours: totalHours,
            issuesByCategory: issuesByCategory,
            hoursByActivity: hoursByActivity
        };

        const periodLabels = { month: 'afgelopen maand', quarter: 'afgelopen kwartaal', year: 'afgelopen jaar' };
        const prompt = `
Je bent een expert data-analist voor een gemeente. Jouw taak is om een professioneel managementrapport te schrijven op basis van de verstrekte gegevens voor de ${periodLabels[reportPeriod]}. Het rapport wordt als PDF gedownload door een beheerder.

**Gegevens voor de ${periodLabels[reportPeriod]}:**
- **Meldingen:**
  - Nieuwe meldingen: ${stats.newIssues}
  - Opgeloste meldingen: ${stats.resolvedIssues}
  - Verdeling per categorie: ${JSON.stringify(stats.issuesByCategory)}
- **Projecten:**
  - Nieuwe projecten gestart: ${stats.newProjects}
- **Urenregistratie:**
  - Totaal geregistreerde uren: ${stats.totalHours.toFixed(2)}
  - Uren per activiteit: ${JSON.stringify(stats.hoursByActivity)}

**Instructies:**
1.  **Schrijf een beknopte "Managementsamenvatting"**: Begin met een overzicht op hoog niveau. Wat zijn de belangrijkste conclusies uit deze periode?
2.  **Analyseer de gegevens**: Geef inzicht in trends. Is er een toename van specifieke meldingstypen? Hoe ontwikkelt de projectactiviteit zich? Worden de uren effectief geregistreerd?
3.  **Geef concrete "Aanbevelingen"**: Stel op basis van je analyse 2-3 concrete stappen voor aan het managementteam.
4.  **Opmaak**: Gebruik Markdown voor duidelijkheid (kopjes, vetgedrukte tekst, opsommingstekens). Voeg geen aanhef of afsluiting toe, alleen het rapport zelf.
`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedReport({
                reportPeriod,
                generatedAt: new Date(),
                summary: response.text,
                stats: stats
            });
        } catch(err) {
            console.error(err);
            setPdfError("Fout bij het genereren van de AI-samenvatting.");
        } finally {
            setIsGeneratingPdf(false);
        }

    };


    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Wijk Gezondheidsrapport</h1>
                    <div>
                         <label htmlFor="wijk-select" className="sr-only">Kies een wijk</label>
                         <select 
                            id="wijk-select"
                            value={selectedWijk}
                            onChange={(e) => setSelectedWijk(e.target.value)}
                            className="w-full md:w-64 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="" disabled className="bg-white dark:bg-dark-surface">Selecteer een wijk</option>
                            {wijken.map(w => <option key={w} value={w} className="bg-white dark:bg-dark-surface">{w}</option>)}
                        </select>
                    </div>
                </div>

                {selectedWijk ? (
                    <WijkRapport wijk={selectedWijk} />
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-lg">
                        <p className="text-gray-500 dark:text-dark-text-secondary">Selecteer een wijk om het rapport te bekijken.</p>
                    </div>
                )}

                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 mt-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">Algemeen Periodiek Rapport</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                         <div className="flex-grow w-full">
                            <label htmlFor="period-select" className="sr-only">Kies een periode</label>
                            <select 
                                id="period-select"
                                value={reportPeriod}
                                onChange={(e) => setReportPeriod(e.target.value as any)}
                                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                            >
                                <option value="month" className="bg-white dark:bg-dark-surface">Afgelopen Maand</option>
                                <option value="quarter" className="bg-white dark:bg-dark-surface">Afgelopen Kwartaal</option>
                                <option value="year" className="bg-white dark:bg-dark-surface">Afgelopen Jaar</option>
                            </select>
                         </div>
                         <button 
                            onClick={handleGeneratePdfReport} 
                            disabled={isGeneratingPdf}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isGeneratingPdf ? 'Rapport wordt gemaakt...' : 'Genereer en Download PDF'}
                        </button>
                    </div>
                    {pdfError && <p className="text-red-500 mt-4">{pdfError}</p>}
                </div>
            </div>

            {generatedReport && (
                <div className="fixed inset-0 bg-gray-900 dark:bg-dark-bg bg-opacity-95 z-50 flex flex-col p-4 sm:p-8">
                    <div className="flex-shrink-0 flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-white dark:text-dark-text-primary">Rapport Voorbeeld</h2>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
                            >
                                Download als PDF / Afdrukken
                            </button>
                            <button
                                onClick={() => setGeneratedReport(null)}
                                className="text-gray-300 dark:text-dark-text-secondary bg-gray-800 dark:bg-dark-surface hover:bg-gray-700 dark:hover:bg-dark-border rounded-full p-2"
                            >
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto bg-white rounded-lg">
                        <PrintableReport data={generatedReport} />
                    </div>
                </div>
            )}
        </>
    );
};
// --- END: New Reports Page ---

export const ActiveColleaguesPage: React.FC = () => {
    const { users, urenregistraties, currentUser } = useAppContext();
    const [isMessageModalOpen, setIsMessageModalOpen] = React.useState(false);
    const [selectedColleague, setSelectedColleague] = React.useState<User | null>(null);
    const [message, setMessage] = React.useState('');

    const activeEntries = urenregistraties.filter(u => !u.eindtijd);
    const activeUserIds = activeEntries.map(e => e.gebruikerId);
    const activeUsers = users.filter(u => activeUserIds.includes(u.id));

    const handleOpenMessageModal = (user: User) => {
        setSelectedColleague(user);
        setIsMessageModalOpen(true);
    };

    const handleCloseMessageModal = () => {
        setSelectedColleague(null);
        setIsMessageModalOpen(false);
        setMessage('');
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && selectedColleague) {
            alert(`Bericht verzonden naar ${selectedColleague.name}:\n\n"${message}"`);
            handleCloseMessageModal();
        }
    };

    const handleCall = (user: User) => {
        if (user.phone) {
            window.location.href = `tel:${user.phone}`;
        } else {
            alert(`${user.name} heeft geen telefoonnummer ingesteld.`);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Actieve Collega's</h1>
             <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Naam</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Actieve Taak</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Starttijd</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary text-center">Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map(user => {
                                const entry = activeEntries.find(e => e.gebruikerId === user.id);
                                return (
                                    <tr key={user.id} className="border-b border-gray-200 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg">
                                        <td className="p-3 text-gray-800 dark:text-dark-text-primary flex items-center">
                                            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full mr-3" />
                                            {user.name}
                                        </td>
                                        <td className="p-3 text-gray-800 dark:text-dark-text-primary">{entry?.activiteit} - {entry?.details}</td>
                                        <td className="p-3 text-gray-800 dark:text-dark-text-primary">{entry && format(entry.starttijd, 'HH:mm', { locale: nl })}</td>
                                        <td className="p-3 text-center">
                                            {currentUser?.id !== user.id ? (
                                                <div className="flex justify-center items-center space-x-2">
                                                    <button onClick={() => handleOpenMessageModal(user)} title={`Bericht sturen naar ${user.name}`} className="p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border hover:text-brand-primary transition-colors">
                                                        <MessageSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleCall(user)} title={`Bellen met ${user.name}`} className="p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border hover:text-green-500 transition-colors">
                                                        <PhoneIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Dit ben jij</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                             {activeUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-6 text-gray-500 dark:text-dark-text-secondary">Geen collega's actief op dit moment.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
             {selectedColleague && (
                <Modal isOpen={isMessageModalOpen} onClose={handleCloseMessageModal} title={`Bericht sturen naar ${selectedColleague.name}`}>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                        <div>
                            <label htmlFor="message-text" className="sr-only">Bericht</label>
                            <textarea
                                id="message-text"
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                placeholder={`Typ je bericht hier...`}
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary"
                            >
                                Verstuur
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export const NotificationsPage: React.FC = () => {
    const { notificaties, currentUser } = useAppContext();
    const navigate = ReactRouterDOM.useNavigate();
    const userNotifications = notificaties.filter(n => n.userId === currentUser?.id).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Notificaties</h1>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg">
                <ul className="divide-y divide-gray-200 dark:divide-dark-border">
                    {userNotifications.map(n => (
                        <li key={n.id} onClick={() => navigate(n.link)} className={`p-4 flex items-center space-x-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg ${!n.isRead ? 'bg-brand-primary/10' : ''}`}>
                             {!n.isRead && <div className="h-2 w-2 rounded-full bg-brand-primary flex-shrink-0"></div>}
                             <div className={n.isRead ? 'ml-4' : ''}>
                                <p className="text-sm text-gray-800 dark:text-dark-text-primary">{n.message}</p>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{format(n.timestamp, "dd MMM yyyy 'om' HH:mm", {locale: nl})}</p>
                             </div>
                        </li>
                    ))}
                    {userNotifications.length === 0 && (
                        <li className="p-6 text-center text-gray-500 dark:text-dark-text-secondary">Je hebt geen notificaties.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};
