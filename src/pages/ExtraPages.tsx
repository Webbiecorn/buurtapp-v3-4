import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MessageSquareIcon, PhoneIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon, ClockIcon, XIcon, PencilIcon, TrashIcon } from '../components/Icons';
import {
    differenceInHours,
    eachMonthOfInterval,
    format,
    isWithinInterval,
    startOfDay,
    subMonths,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import * as ReactRouterDOM from 'react-router-dom';
import { Modal, StatCard } from '../components/ui';
import { MeldingStatus, Notificatie, User, ProjectStatus } from '../types';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MOCK_WIJKEN } from '../data/mockData';
import { ExternalContact } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            setError('API key is niet ingesteld. Controleer de naam VITE_GEMINI_API_KEY in je .env.local bestand.');
            setIsLoading(false);
            return;
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            setAiSummary(text);

        } catch (err: any) {
            console.error('Gemini API Error:', err);
            const errorMessage = err?.message || err?.toString() || 'Onbekende fout';
            setError(`Er is een fout opgetreden: ${errorMessage}. Controleer of de API-sleutel geldig is en of de Gemini API is ingeschakeld in Google Cloud Console.`);
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
                                {categorieData.map((_entry, index) => (
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
                    <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
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
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-2">Totaal Uren per Medewerker</h3>
                    <table className="w-full text-left text-sm">
                            <thead className="bg-gray-200">
                            <tr><th className="p-2">Medewerker</th><th className="p-2">Uren</th></tr>
                        </thead>
                        <tbody>
                                {Object.entries(stats.hoursByUser).map(([user, hours]) => (
                                <tr key={user} className="border-b"><td className="p-2">{user}</td><td className="p-2">{(hours as number).toFixed(2)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export const ReportsPage: React.FC = () => {
    const { meldingen, projecten, urenregistraties, users } = useAppContext();
    const [selectedWijk, setSelectedWijk] = useState('alle');
    const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year' | 'all' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [dossiers, setDossiers] = useState<any[]>([]);
    const [achterpaden, setAchterpaden] = useState<any[]>([]);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    // Load dossiers and achterpaden
    useEffect(() => {
        const unsubDossiers = onSnapshot(collection(db, 'dossiers'), (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return { id: doc.id, ...docData };
            });
            console.log('📁 Loaded dossiers:', data.length, data);
            setDossiers(data);
        });

        const unsubAchterpaden = onSnapshot(collection(db, 'achterpaden'), (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return { id: doc.id, ...docData };
            });
            console.log('🚶 Loaded achterpaden:', data.length, data);
            setAchterpaden(data);
        });

        return () => {
            unsubDossiers();
            unsubAchterpaden();
        };
    }, []);

    const wijken = useMemo(() => {
        const wijkSet = new Set(meldingen.map(m => m.wijk));
        return ['alle', ...Array.from(wijkSet).sort()];
    }, [meldingen]);

    // Calculate date range
    const dateRange = useMemo(() => {
        const today = startOfDay(new Date());
        let startDate: Date;
        let endDate: Date = today;
        switch (reportPeriod) {
            case 'month': startDate = subMonths(today, 1); break;
            case 'quarter': startDate = subMonths(today, 3); break;
            case 'year': startDate = subMonths(today, 12); break;
            case 'all': startDate = new Date(2020, 0, 1); break;
            case 'custom':
                startDate = customStartDate ? startOfDay(new Date(customStartDate)) : subMonths(today, 1);
                endDate = customEndDate ? startOfDay(new Date(customEndDate)) : today;
                break;
        }
        return { start: startDate, end: endDate };
    }, [reportPeriod, customStartDate, customEndDate]);

    // Filter data by period and wijk
    const filteredData = useMemo(() => {
        const { start, end } = dateRange;

        let filteredMeldingen = meldingen.filter(m => isWithinInterval(m.timestamp, { start, end }));
        const filteredProjecten = projecten.filter(p => isWithinInterval(p.startDate, { start, end }));
        const filteredUren = urenregistraties.filter(u => u.eind && isWithinInterval(u.start, { start, end }));

        if (selectedWijk !== 'alle') {
            filteredMeldingen = filteredMeldingen.filter(m => m.wijk === selectedWijk);
            // Note: Projects don't have wijk property in the current type definition
        }

        // Filter dossiers
        const filteredDossiers = dossiers.filter(d => {
            // For 'all' period, show all dossiers
            if (reportPeriod === 'all') return true;

            // Check if dossier has a createdAt field
            if (!d.createdAt) {
                console.log('⚠️ Dossier without createdAt:', d.id);
                return true; // Include dossiers without date in report
            }

            try {
                // Handle Firestore Timestamp
                let createdDate: Date;
                if (d.createdAt.toDate) {
                    createdDate = d.createdAt.toDate();
                } else if (d.createdAt instanceof Date) {
                    createdDate = d.createdAt;
                } else if (d.createdAt.seconds) {
                    createdDate = new Date(d.createdAt.seconds * 1000);
                } else {
                    createdDate = new Date(d.createdAt);
                }
                return isWithinInterval(createdDate, { start, end });
            } catch (error) {
                console.error('Error parsing dossier date:', d.id, error);
                return true; // Include in report on error
            }
        });

        // Filter achterpaden
        const filteredAchterpaden = achterpaden.filter(a => {
            // For 'all' period, show all achterpaden
            if (reportPeriod === 'all') return true;

            // Check if achterpad has a timestamp field
            if (!a.timestamp) {
                console.log('⚠️ Achterpad without timestamp:', a.id);
                return true; // Include achterpaden without date in report
            }

            try {
                // Handle Firestore Timestamp
                let timestamp: Date;
                if (a.timestamp.toDate) {
                    timestamp = a.timestamp.toDate();
                } else if (a.timestamp instanceof Date) {
                    timestamp = a.timestamp;
                } else if (a.timestamp.seconds) {
                    timestamp = new Date(a.timestamp.seconds * 1000);
                } else {
                    timestamp = new Date(a.timestamp);
                }
                return isWithinInterval(timestamp, { start, end });
            } catch (error) {
                console.error('Error parsing achterpad date:', a.id, error);
                return true; // Include in report on error
            }
        });

        console.log('📊 Filtered data:', {
            meldingen: filteredMeldingen.length,
            projecten: filteredProjecten.length,
            uren: filteredUren.length,
            dossiers: filteredDossiers.length,
            achterpaden: filteredAchterpaden.length
        });

        return {
            meldingen: filteredMeldingen,
            projecten: filteredProjecten,
            uren: filteredUren,
            dossiers: filteredDossiers,
            achterpaden: filteredAchterpaden
        };
    }, [dateRange, selectedWijk, reportPeriod, meldingen, projecten, urenregistraties, dossiers, achterpaden]);

    // Calculate comprehensive statistics
    const statistics = useMemo(() => {
        const { meldingen: filtMeld, projecten: filtProj, uren: filtUren, dossiers: filtDoss, achterpaden: filtAchter } = filteredData;

        // Meldingen stats
        const meldingenAfgerond = filtMeld.filter(m => m.status === MeldingStatus.Afgerond).length;
        const meldingenByCategorie = filtMeld.reduce((acc, m) => {
            acc[m.categorie] = (acc[m.categorie] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const meldingenByWijk = filtMeld.reduce((acc, m) => {
            acc[m.wijk] = (acc[m.wijk] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Projecten stats
        const projectenAfgerond = filtProj.filter(p => p.status === 'Afgerond').length;
        const projectenLopend = filtProj.filter(p => p.status === 'Lopend').length;

        // Uren stats
        const totalUren = filtUren.reduce((sum, u) => {
            if (u.eind) {
                return sum + (new Date(u.eind).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60);
            }
            return sum;
        }, 0);
        const urenByActiviteit = filtUren.reduce((acc, u) => {
            if (u.eind) {
                const hours = (new Date(u.eind).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60);
                acc[u.activiteit] = (acc[u.activiteit] || 0) + hours;
            }
            return acc;
        }, {} as Record<string, number>);
        const urenByUser = filtUren.reduce((acc, u) => {
            if (u.eind) {
                const hours = (new Date(u.eind).getTime() - new Date(u.start).getTime()) / (1000 * 60 * 60);
                const userName = users.find(user => user.id === u.gebruikerId)?.name || 'Onbekend';
                acc[userName] = (acc[userName] || 0) + hours;
            }
            return acc;
        }, {} as Record<string, number>);

        // Dossiers stats
        const dossiersActief = filtDoss.filter(d => d.status === 'actief').length;
        const dossiersAfgerond = filtDoss.filter(d => d.status === 'afgerond').length;

        // Achterpaden stats
        const achterpadenSchoon = filtAchter.filter(a => a.status === 'schoon').length;
        const achterpadenVervuild = filtAchter.filter(a => a.status === 'vervuild').length;

        return {
            meldingen: {
                totaal: filtMeld.length,
                afgerond: meldingenAfgerond,
                byCategorie: meldingenByCategorie,
                byWijk: meldingenByWijk,
                afgerondPercentage: filtMeld.length > 0 ? Math.round((meldingenAfgerond / filtMeld.length) * 100) : 0
            },
            projecten: {
                totaal: filtProj.length,
                afgerond: projectenAfgerond,
                lopend: projectenLopend,
                afgerondPercentage: filtProj.length > 0 ? Math.round((projectenAfgerond / filtProj.length) * 100) : 0
            },
            uren: {
                totaal: totalUren,
                registraties: filtUren.length,
                byActiviteit: urenByActiviteit,
                byUser: urenByUser,
                gemiddeldPerRegistratie: filtUren.length > 0 ? totalUren / filtUren.length : 0
            },
            dossiers: {
                totaal: filtDoss.length,
                actief: dossiersActief,
                afgerond: dossiersAfgerond
            },
            achterpaden: {
                totaal: filtAchter.length,
                schoon: achterpadenSchoon,
                vervuild: achterpadenVervuild,
                schoonPercentage: filtAchter.length > 0 ? Math.round((achterpadenSchoon / filtAchter.length) * 100) : 0
            },
            team: {
                totaal: users.length,
                actief: Object.keys(urenByUser).length
            }
        };
    }, [filteredData, users]);

    const periodLabels: Record<string, string> = {
        month: 'Afgelopen Maand',
        quarter: 'Afgelopen Kwartaal',
        year: 'Afgelopen Jaar',
        all: 'Alle Data',
        custom: `${format(new Date(customStartDate), 'dd MMM yyyy', { locale: nl })} - ${format(new Date(customEndDate), 'dd MMM yyyy', { locale: nl })}`
    };

    const handleGenerateAIPositiveReport = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            alert('Gemini API Key niet gevonden (VITE_GEMINI_API_KEY).');
            return;
        }

        setIsAiGenerating(true);
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `
Je bent een ervaren buurtmanager die een professioneel en uitgebreid verslag schrijft voor de gemeente en belanghebbenden.
Je focus ligt op het presenteren van de resultaten en de impact van het Buurtconcierge-team.

**Periode:** ${periodLabels[reportPeriod]}
**Wijk:** ${selectedWijk === 'alle' ? 'Alle Wijken' : selectedWijk}

**Data voor het verslag:**
1. Achterpaden: ${statistics.achterpaden.totaal} gecontroleerd, waarvan ${statistics.achterpaden.schoonPercentage}% brandschoon is. Successen: ${statistics.achterpaden.schoon} paden zijn nu in topconditie. Vervuild: ${statistics.achterpaden.vervuild} locaties vereisen nog aandacht.
2. Woningdossiers: ${statistics.dossiers.totaal} actieve dossiers, ${statistics.dossiers.afgerond} succesvol afgeronde dossiers waarin bewoners zijn geholpen. Focus op preventie en bewonerscontact.
3. Projecten: ${statistics.projecten.totaal} lopende initiatieven, waarvan ${statistics.projecten.afgerond} al succesvol zijn opgeleverd. Dit betreft buurtverbeteringen, sociale events en infrastructurele projecten.
4. Urenregistratie: Het team heeft ${statistics.uren.totaal.toFixed(1)} uur geïnvesteerd in de wijk. De meeste tijd ging naar: ${Object.entries(statistics.uren.byActiviteit).slice(0, 5).map(([k, v]) => `${k} (${v.toFixed(1)}u)`).join(', ')}.
5. Meldingen: Van de ${statistics.meldingen.totaal} binnengekomen meldingen is ${statistics.meldingen.afgerondPercentage}% opgelost. Categorieën: ${Object.entries(statistics.meldingen.byCategorie).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(', ')}.
6. Team: ${statistics.team.totaal} teamleden zijn betrokken, waarvan ${statistics.team.actief} actief geregistreerde uren hebben.

**Opdracht:**
Schrijf een uitgebreid, professioneel en feitelijk verslag in het Nederlands.
Gebruik een zakelijke maar toegankelijke schrijfstijl.
Begin met een pakkende subtitel die de essentie van de periode samenvat (bijv. "Een Periode van Groei, Verbinding en Zichtbare Vooruitgang").

Structureer het verslag in 4-5 uitgebreide paragrafen van elk minimaal 4-5 zinnen:

1. INLEIDING - Schets de algemene context en de belangrijkste ontwikkelingen in de wijk deze periode. Benoem de kern van de werkzaamheden.

2. LEEFBAARHEID - Bespreek de resultaten bij achterpaden (controles, vervuiling, verbeteringen) en woningdossiers (aantal actief, afgerond, type problematiek). Leg uit wat dit betekent voor bewoners.

3. TEAM PRESTATIES - Beschrijf de inzet van het team: uren, activiteiten, verdeling over werkzaamheden. Benoem ook de lopende en afgeronde projecten en hun impact.

4. MELDINGEN & RESPONS - Analyseer de binnenkomende meldingen, categorieën en oplossingspercentage. Wat zegt dit over de responsiviteit?

5. VOORUITBLIK - Sluit af met een blik op de toekomst: wat zijn de prioriteiten, kansen en uitdagingen voor de komende periode?

Houd het professioneel en feitelijk onderbouwd. Gebruik GEEN markdown-titels (zoals # of ##), want dit wordt direct in een PDF geplaatst. Schrijf in vloeiende paragrafen.
`;

            const result = await model.generateContent(prompt);
            const narrative = result.response.text();

            // Create PDF with better layout
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            const footerHeight = 15;
            const maxY = pageHeight - footerHeight;
            let yPos = 20;

            // Helper function to check and add new page if needed
            const checkPageBreak = (neededHeight: number) => {
                if (yPos + neededHeight > maxY) {
                    doc.addPage();
                    yPos = 20;
                    return true;
                }
                return false;
            };

            // ===== PAGE 1: TITLE PAGE =====
            // Header Background
            doc.setFillColor(34, 197, 94); // Green-500
            doc.rect(0, 0, pageWidth, 50, 'F');

            // Title in Header
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text('Verslag', pageWidth / 2, 25, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Buurtconcierge - Team Impact Rapportage', pageWidth / 2, 38, { align: 'center' });

            yPos = 60;
            doc.setTextColor(0, 0, 0);

            // Period & Date info box
            doc.setFillColor(249, 250, 251); // Gray-50
            doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, 'F');

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(55, 65, 81);
            doc.text(`Periode: ${periodLabels[reportPeriod]}`, margin + 5, yPos + 8);
            doc.text(`Locatie: ${selectedWijk === 'alle' ? 'Alle Wijken' : selectedWijk}`, margin + 5, yPos + 15);
            doc.text(`Datum: ${format(new Date(), 'dd MMMM yyyy', { locale: nl })}`, pageWidth - margin - 5, yPos + 12, { align: 'right' });

            yPos += 30;

            // Section: Samenvatting
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(21, 128, 61); // Dark green
            doc.text('Samenvatting', margin, yPos);
            yPos += 10;

            // Draw green accent line
            doc.setDrawColor(34, 197, 94);
            doc.setLineWidth(1);
            doc.line(margin, yPos - 3, margin + 40, yPos - 3);

            // Narrative Body - split into proper paragraphs
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(55, 65, 81);

            const lineHeight = 5;
            const paragraphs = narrative.split('\n\n').filter(p => p.trim());

            for (const paragraph of paragraphs) {
                const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
                const paragraphHeight = lines.length * lineHeight + 5;

                checkPageBreak(paragraphHeight);

                for (const line of lines) {
                    if (yPos > maxY) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += lineHeight;
                }
                yPos += 5; // Extra space between paragraphs
            }

            // ===== PAGE 2: KPI's =====
            doc.addPage();
            yPos = 20;

            // Section header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(21, 128, 61);
            doc.text('Kerncijfers', margin, yPos);
            yPos += 5;

            // Green accent line
            doc.setDrawColor(34, 197, 94);
            doc.setLineWidth(1);
            doc.line(margin, yPos, margin + 30, yPos);
            yPos += 10;

            // KPI Table with better styling
            const kpiData = [
                ['Achterpaden', `${statistics.achterpaden.schoonPercentage}% Schoon`, `${statistics.achterpaden.schoon} van ${statistics.achterpaden.totaal} locaties op orde`],
                ['Woningdossiers', `${statistics.dossiers.totaal} Actief`, `${statistics.dossiers.afgerond} Afgerond`],
                ['Projecten', `${statistics.projecten.totaal} Totaal`, `${statistics.projecten.afgerond} Afgerond (${statistics.projecten.afgerondPercentage}%)`],
                ['Team Inzet', `${statistics.uren.totaal.toFixed(0)} Uur`, `${Object.keys(statistics.uren.byUser).length} Teamleden actief`],
                ['Meldingen', `${statistics.meldingen.totaal} Totaal`, `${statistics.meldingen.afgerond} Opgelost (${statistics.meldingen.afgerondPercentage}%)`],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Domein', 'Status', 'Resultaat']],
                body: kpiData,
                theme: 'striped',
                headStyles: {
                    fillColor: [34, 197, 94],
                    textColor: 255,
                    fontSize: 11,
                    fontStyle: 'bold',
                    cellPadding: 6
                },
                bodyStyles: {
                    fontSize: 10,
                    cellPadding: 5
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 45 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 'auto' }
                },
                margin: { left: margin, right: margin }
            });

            yPos = (doc as any).lastAutoTable.finalY + 20;

            // Details section
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(21, 128, 61);
            doc.text('Details per Domein', margin, yPos);
            yPos += 8;

            // Uren breakdown
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(55, 65, 81);
            doc.text('Uren per Activiteit:', margin, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const topActivities = Object.entries(statistics.uren.byActiviteit)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            for (const [activity, hours] of topActivities) {
                doc.text(`• ${activity}: ${hours.toFixed(1)} uur`, margin + 5, yPos);
                yPos += 5;
            }
            yPos += 10;

            // Meldingen breakdown
            checkPageBreak(40);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Meldingen per Categorie:', margin, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const topCategories = Object.entries(statistics.meldingen.byCategorie)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            for (const [category, count] of topCategories) {
                doc.text(`• ${category}: ${count} melding${count !== 1 ? 'en' : ''}`, margin + 5, yPos);
                yPos += 5;
            }

            // ===== PAGE 3: VISUAL CHARTS (drawn with jsPDF) =====
            doc.addPage();
            yPos = 20;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(21, 128, 61);
            doc.text('Visuele Analyse', margin, yPos);
            yPos += 5;

            // Green accent line
            doc.setDrawColor(34, 197, 94);
            doc.setLineWidth(1);
            doc.line(margin, yPos, margin + 35, yPos);
            yPos += 15;

            // Helper function to draw a simple bar chart
            const drawBarChart = (title: string, data: { label: string; value: number; color: string }[], startY: number, chartWidth: number, chartHeight: number) => {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(55, 65, 81);
                doc.text(title, margin, startY);

                const barStartY = startY + 8;
                const maxValue = Math.max(...data.map(d => d.value), 1);
                const barHeight = 8;
                const barGap = 4;
                const maxBarWidth = chartWidth - 60;

                data.forEach((item, index) => {
                    const y = barStartY + (index * (barHeight + barGap));
                    const barWidth = (item.value / maxValue) * maxBarWidth;

                    // Draw bar
                    const rgb = hexToRgb(item.color);
                    doc.setFillColor(rgb.r, rgb.g, rgb.b);
                    doc.roundedRect(margin + 50, y, barWidth, barHeight, 2, 2, 'F');

                    // Draw label
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(55, 65, 81);
                    const labelText = item.label.length > 12 ? item.label.substring(0, 12) + '...' : item.label;
                    doc.text(labelText, margin, y + 6);

                    // Draw value
                    doc.text(item.value.toString(), margin + 55 + barWidth, y + 6);
                });

                return barStartY + (data.length * (barHeight + barGap)) + 10;
            };

            // Helper to convert hex to RGB
            const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : { r: 0, g: 0, b: 0 };
            };

            // Chart 1: Meldingen per Categorie
            const categorieData = Object.entries(statistics.meldingen.byCategorie)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map((entry, i) => ({
                    label: entry[0],
                    value: entry[1],
                    color: PIE_COLORS[i % PIE_COLORS.length]
                }));

            if (categorieData.length > 0) {
                yPos = drawBarChart('Meldingen per Categorie', categorieData, yPos, contentWidth, 80);
            }

            // Chart 2: Status Overzicht
            const statusData = [
                { label: 'Meld. Afgerond', value: statistics.meldingen.afgerond, color: '#22c55e' },
                { label: 'Meld. Open', value: statistics.meldingen.totaal - statistics.meldingen.afgerond, color: '#ef4444' },
                { label: 'Proj. Afgerond', value: statistics.projecten.afgerond, color: '#3b82f6' },
                { label: 'Proj. Lopend', value: statistics.projecten.lopend, color: '#f97316' },
            ].filter(d => d.value > 0);

            if (statusData.length > 0) {
                yPos = drawBarChart('Status Overzicht', statusData, yPos, contentWidth, 60);
            }

            // Chart 3: Uren per Activiteit
            const urenData = Object.entries(statistics.uren.byActiviteit)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map((entry, i) => ({
                    label: entry[0],
                    value: Math.round(entry[1]),
                    color: PIE_COLORS[i % PIE_COLORS.length]
                }));

            if (urenData.length > 0) {
                yPos = drawBarChart('Uren per Activiteit', urenData, yPos, contentWidth, 80);
            }

            // Summary boxes at the bottom
            checkPageBreak(50);
            yPos += 10;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(55, 65, 81);
            doc.text('Kerngetallen Samenvatting', margin, yPos);
            yPos += 10;

            const summaryBoxWidth = (contentWidth - 20) / 3;
            const summaryBoxHeight = 30;
            const summaryData = [
                { label: 'Achterpaden', value: `${statistics.achterpaden.schoonPercentage}%`, sub: 'schoon', color: '#22c55e' },
                { label: 'Meldingen', value: `${statistics.meldingen.afgerondPercentage}%`, sub: 'opgelost', color: '#3b82f6' },
                { label: 'Projecten', value: `${statistics.projecten.afgerondPercentage}%`, sub: 'afgerond', color: '#8b5cf6' },
            ];

            summaryData.forEach((item, index) => {
                const x = margin + (index * (summaryBoxWidth + 10));
                const rgb = hexToRgb(item.color);

                // Box background
                doc.setFillColor(249, 250, 251);
                doc.roundedRect(x, yPos, summaryBoxWidth, summaryBoxHeight, 3, 3, 'F');

                // Colored left border
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
                doc.rect(x, yPos, 3, summaryBoxHeight, 'F');

                // Text
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text(item.label, x + 8, yPos + 8);

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(rgb.r, rgb.g, rgb.b);
                doc.text(item.value, x + 8, yPos + 20);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text(item.sub, x + 8, yPos + 26);
            });

            // Footer on all pages
            const totalPages = (doc as any).internal.pages.length - 1;
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Footer line
                doc.setDrawColor(229, 231, 235);
                doc.setLineWidth(0.5);
                doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                // Footer text
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text(
                    `Buurtconcierge Rapportage`,
                    margin,
                    pageHeight - 8
                );
                doc.text(
                    `Pagina ${i} van ${totalPages}`,
                    pageWidth - margin,
                    pageHeight - 8,
                    { align: 'right' }
                );
            }

            doc.save(`Verslag-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

        } catch (error) {
            console.error('AI Report Error:', error);
            alert('Er is een fout opgetreden bij het genereren van het AI verslag.');
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handlePrintReport = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Helper function to check if we need a new page
        const checkPageBreak = (requiredSpace: number) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        // Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Buurtconcierge Managementrapport', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`${periodLabels[reportPeriod]} - ${selectedWijk === 'alle' ? 'Alle Wijken' : selectedWijk}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(10);
        doc.text(`Gegenereerd op: ${format(new Date(), 'dd MMMM yyyy', { locale: nl })}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        // Executive Summary
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Executive Summary', 20, yPos);
        yPos += 8;

        checkPageBreak(50);

        // KPI Table - Verbeterde kolombreedte
        const kpiData = [
            ['Meldingen', statistics.meldingen.totaal.toString(), `${statistics.meldingen.afgerondPercentage}% afgerond`],
            ['Projecten', statistics.projecten.totaal.toString(), `${statistics.projecten.lopend} lopend`],
            ['Uren Geregistreerd', `${statistics.uren.totaal.toFixed(1)}u`, `${statistics.uren.registraties} registraties`],
            ['Woningdossiers', statistics.dossiers.totaal.toString(), `${statistics.dossiers.actief} actief`],
            ['Achterpaden', statistics.achterpaden.totaal.toString(), `${statistics.achterpaden.schoonPercentage}% schoon`],
            ['Team', statistics.team.totaal.toString(), `${statistics.team.actief} actief`],
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Categorie', 'Totaal', 'Status']],
            body: kpiData,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 4,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 80 }
            },
            headStyles: {
                fillColor: [30, 64, 175],
                textColor: 255,
                fontSize: 11,
                fontStyle: 'bold'
            },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Meldingen Analyse
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Meldingen Analyse', 20, yPos);
        yPos += 8;

        const topCategories = Object.entries(statistics.meldingen.byCategorie)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 8); // Toon top 8 in plaats van top 5

        if (topCategories.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Categorie', 'Aantal', 'Percentage']],
                body: topCategories.map(([cat, count]) => {
                    const percentage = statistics.meldingen.totaal > 0
                        ? ((count as number / statistics.meldingen.totaal) * 100).toFixed(1)
                        : '0';
                    return [cat, count.toString(), `${percentage}%`];
                }),
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 35, halign: 'center' },
                    2: { cellWidth: 35, halign: 'center' }
                },
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
                margin: { left: 20, right: 20 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 12;
        }

        // Projecten Overzicht
        checkPageBreak(40);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Projecten Overzicht', 20, yPos);
        yPos += 8;

        const projectData = [
            ['Totaal Projecten', statistics.projecten.totaal.toString()],
            ['Lopend', statistics.projecten.lopend.toString()],
            ['Afgerond', statistics.projecten.afgerond.toString()],
            ['Afgerond %', `${statistics.projecten.afgerondPercentage}%`],
        ];

        autoTable(doc, {
            startY: yPos,
            body: projectData,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 100, fontStyle: 'bold' },
                1: { cellWidth: 70, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;

        // Team Performance - Alle teamleden
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Team Performance', 20, yPos);
        yPos += 8;

        const allPerformers = Object.entries(statistics.uren.byUser)
            .sort(([, a], [, b]) => (b as number) - (a as number));

        if (allPerformers.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Rank', 'Teamlid', 'Uren', 'Percentage']],
                body: allPerformers.map(([name, hours], index) => {
                    const percentage = statistics.uren.totaal > 0
                        ? ((hours as number / statistics.uren.totaal) * 100).toFixed(1)
                        : '0';
                    const rank = index === 0 ? '#1' : index === 1 ? '#2' : index === 2 ? '#3' : `${index + 1}`;
                    return [rank, name, (hours as number).toFixed(1), `${percentage}%`];
                }),
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 35, halign: 'right' },
                    3: { cellWidth: 35, halign: 'center' }
                },
                headStyles: {
                    fillColor: [34, 197, 94],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                // Highlight top 3
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 0 && data.row.index < 3) {
                        data.cell.styles.fillColor = [220, 252, 231]; // Light green
                        data.cell.styles.textColor = [34, 197, 94]; // Green text
                    }
                },
                margin: { left: 20, right: 20 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 12;
        }

        // Uren per Activiteit
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Uren per Activiteit', 20, yPos);
        yPos += 8;

        const activiteitData = Object.entries(statistics.uren.byActiviteit)
            .sort(([, a], [, b]) => (b as number) - (a as number));

        if (activiteitData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Activiteit', 'Uren', 'Percentage']],
                body: activiteitData.map(([activiteit, hours]) => {
                    const percentage = statistics.uren.totaal > 0
                        ? ((hours as number / statistics.uren.totaal) * 100).toFixed(1)
                        : '0';
                    return [activiteit, (hours as number).toFixed(1), `${percentage}%`];
                }),
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 35, halign: 'right' },
                    2: { cellWidth: 35, halign: 'center' }
                },
                headStyles: {
                    fillColor: [147, 51, 234],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                margin: { left: 20, right: 20 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 12;
        }

        // Woningdossiers & Achterpaden
        checkPageBreak(50);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Woningdossiers & Achterpaden', 20, yPos);
        yPos += 8;

        const extraData = [
            ['Woningdossiers Totaal', statistics.dossiers.totaal.toString()],
            ['Dossiers Actief', statistics.dossiers.actief.toString()],
            ['Dossiers Afgerond', statistics.dossiers.afgerond.toString()],
            ['', ''],
            ['Achterpaden Totaal', statistics.achterpaden.totaal.toString()],
            ['Achterpaden Schoon', `${statistics.achterpaden.schoon} (${statistics.achterpaden.schoonPercentage}%)`],
            ['Achterpaden Vervuild', statistics.achterpaden.vervuild.toString()],
        ];

        autoTable(doc, {
            startY: yPos,
            body: extraData,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 100, fontStyle: 'bold' },
                1: { cellWidth: 70, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;

        // Conclusie
        checkPageBreak(70);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Conclusie & Aanbevelingen', 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Sterke Punten:', 20, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const strengths = [
            `${statistics.meldingen.afgerondPercentage}% van de meldingen succesvol afgehandeld`,
            `${statistics.team.actief} van ${statistics.team.totaal} teamleden actief betrokken`,
            `${statistics.uren.totaal.toFixed(0)} uur geregistreerd aan productieve activiteiten`,
            `${statistics.achterpaden.schoonPercentage}% van achterpaden voldoet aan standaard`,
        ];

        strengths.forEach(strength => {
            checkPageBreak(7);
            const lines = doc.splitTextToSize(`• ${strength}`, pageWidth - 50);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5;
        });

        yPos += 6;
        checkPageBreak(35);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('Aanbevelingen:', 20, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const recommendations = [
            `Continue focus op tijdige afhandeling van meldingen`,
            `Stimuleer teamleden zonder urenregistratie tot actieve deelname`,
            `Plan vervolgacties voor lopende projecten (${statistics.projecten.lopend} actief)`,
            `Intensiveer monitoring van vervuilde achterpaden (${statistics.achterpaden.vervuild} locaties)`,
        ];

        recommendations.forEach(rec => {
            checkPageBreak(7);
            const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 50);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5;
        });

        // Footer
        const totalPages = (doc as any).internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Pagina ${i} van ${totalPages} - Buurtconcierge © ${new Date().getFullYear()}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        // Save PDF
        doc.save(`rapport-${periodLabels[reportPeriod]}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleExportExcel = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Type: 'Meldingen Totaal', Waarde: statistics.meldingen.totaal },
            { Type: 'Meldingen Afgerond', Waarde: statistics.meldingen.afgerond },
            { Type: 'Projecten Totaal', Waarde: statistics.projecten.totaal },
            { Type: 'Projecten Afgerond', Waarde: statistics.projecten.afgerond },
            { Type: 'Uren Totaal', Waarde: statistics.uren.totaal.toFixed(1) },
            { Type: 'Dossiers Totaal', Waarde: statistics.dossiers.totaal },
            { Type: 'Achterpaden Totaal', Waarde: statistics.achterpaden.totaal },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Overzicht');
        XLSX.writeFile(wb, `rapport-${periodLabels[reportPeriod]}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };


    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                        📊 Compleet Managementrapport
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Overzicht van alle activiteiten en prestaties
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleGenerateAIPositiveReport}
                        disabled={isAiGenerating}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow hover:from-green-700 hover:to-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAiGenerating ? (
                            <SparklesIcon className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                            <SparklesIcon className="h-5 w-5 mr-2" />
                        )}
                        Genereer Verslag
                    </button>
                    <button
                        onClick={handlePrintReport}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition-colors"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-4 print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            📅 Periode
                        </label>
                        <select
                            id="period-select"
                            value={reportPeriod}
                            onChange={(e) => setReportPeriod(e.target.value as any)}
                            className="w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg py-2 px-3"
                        >
                            <option value="month">Afgelopen Maand</option>
                            <option value="quarter">Afgelopen Kwartaal</option>
                            <option value="year">Afgelopen Jaar</option>
                            <option value="all">Alle Data</option>
                            <option value="custom">Handmatige Periode</option>
                        </select>
                    </div>
                    {reportPeriod === 'custom' && (
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📆 Startdatum
                            </label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg py-2 px-3"
                            />
                        </div>
                    )}
                    {reportPeriod === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📆 Einddatum
                            </label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg py-2 px-3"
                            />
                        </div>
                    )}
                    <div className={reportPeriod === 'custom' ? 'lg:col-span-3' : ''}>
                        <label htmlFor="wijk-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            📍 Wijk
                        </label>
                        <select
                            id="wijk-select"
                            value={selectedWijk}
                            onChange={(e) => setSelectedWijk(e.target.value)}
                            className="w-full bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg py-2 px-3"
                        >
                            {wijken.map(w => <option key={w} value={w}>{w === 'alle' ? 'Alle Wijken' : w}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6">
                <div className="text-center border-b-2 border-gray-300 pb-4">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Buurtconciërge Managementrapport</h1>
                    <p className="text-lg text-gray-700">{periodLabels[reportPeriod]} - {selectedWijk === 'alle' ? 'Alle Wijken' : selectedWijk}</p>
                    <p className="text-sm text-gray-600 mt-2">Gegenereerd op: {format(new Date(), 'dd MMMM yyyy', { locale: nl })}</p>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-xl p-6 print:bg-white print:shadow-none">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <span className="text-3xl mr-3">🎯</span>
                    Executive Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">📝 Meldingen</p>
                        <p className="text-3xl font-bold text-blue-600">{statistics.meldingen.totaal}</p>
                        <p className="text-xs text-green-600 mt-1">{statistics.meldingen.afgerondPercentage}% afgerond</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">🚀 Projecten</p>
                        <p className="text-3xl font-bold text-purple-600">{statistics.projecten.totaal}</p>
                        <p className="text-xs text-green-600 mt-1">{statistics.projecten.afgerondPercentage}% afgerond</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">⏱️ Uren</p>
                        <p className="text-3xl font-bold text-orange-600">{statistics.uren.totaal.toFixed(0)}</p>
                        <p className="text-xs text-gray-600 mt-1">{statistics.uren.registraties} registraties</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">🏠 Dossiers</p>
                        <p className="text-3xl font-bold text-red-600">{statistics.dossiers.totaal}</p>
                        <p className="text-xs text-gray-600 mt-1">{statistics.dossiers.actief} actief</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">🚶 Achterpaden</p>
                        <p className="text-3xl font-bold text-green-600">{statistics.achterpaden.totaal}</p>
                        <p className="text-xs text-green-600 mt-1">{statistics.achterpaden.schoonPercentage}% schoon</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">👥 Team</p>
                        <p className="text-3xl font-bold text-indigo-600">{statistics.team.totaal}</p>
                        <p className="text-xs text-gray-600 mt-1">{statistics.team.actief} actief</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow print:shadow-sm">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">⚡ Efficiency</p>
                        <p className="text-3xl font-bold text-yellow-600">
                            {Math.round((statistics.meldingen.afgerondPercentage + statistics.projecten.afgerondPercentage) / 2)}%
                        </p>
                        <p className="text-xs text-gray-600 mt-1">gemiddeld</p>
                    </div>
                </div>
            </div>

            {/* Rest of report continues... */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                {/* Meldingen Detail */}
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">📝</span>
                        Meldingen Analyse
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="font-medium">Totaal</span>
                            <span className="text-2xl font-bold text-blue-600">{statistics.meldingen.totaal}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-medium">Afgerond</span>
                            <span className="text-2xl font-bold text-green-600">{statistics.meldingen.afgerond}</span>
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Top Categorieën:</p>
                            {Object.entries(statistics.meldingen.byCategorie)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([cat, count]) => (
                                    <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-sm">{cat}</span>
                                        <span className="font-bold text-blue-600">{count}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Projecten Detail */}
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">🚀</span>
                        Projecten Analyse
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <span className="font-medium">Totaal Projecten</span>
                            <span className="text-2xl font-bold text-purple-600">{statistics.projecten.totaal}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="font-medium">Lopend</span>
                            <span className="text-2xl font-bold text-blue-600">{statistics.projecten.lopend}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-medium">Afgerond</span>
                            <span className="text-2xl font-bold text-green-600">{statistics.projecten.afgerond}</span>
                        </div>
                        <div className="mt-4">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold inline-block text-purple-600">
                                            Voortgang
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-purple-600">
                                            {statistics.projecten.afgerondPercentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-4 text-xs flex rounded-full bg-purple-200">
                                    <div
                                        style={{ width: `${statistics.projecten.afgerondPercentage}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-500 to-purple-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Uren & Team Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">⏱️</span>
                        Urenregistratie
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="font-medium">Totaal Uren</span>
                            <span className="text-2xl font-bold text-orange-600">{statistics.uren.totaal.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="font-medium">Registraties</span>
                            <span className="text-2xl font-bold text-blue-600">{statistics.uren.registraties}</span>
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Per Activiteit:</p>
                            {Object.entries(statistics.uren.byActiviteit)
                                .sort((a, b) => b[1] - a[1])
                                .map(([act, uren]) => (
                                    <div key={act} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-sm">{act}</span>
                                        <span className="font-bold text-orange-600">{uren.toFixed(1)}h</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">👥</span>
                        Team Performance
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <span className="font-medium">Teamleden Totaal</span>
                            <span className="text-2xl font-bold text-indigo-600">{statistics.team.totaal}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-medium">Actief (uren geregistreerd)</span>
                            <span className="text-2xl font-bold text-green-600">{statistics.team.actief}</span>
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Top Performers:</p>
                            {Object.entries(statistics.uren.byUser)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([name, uren], idx) => (
                                    <div key={name} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                                            <span className="text-sm font-medium">{name}</span>
                                        </div>
                                        <span className="font-bold text-indigo-600">{uren.toFixed(1)}h</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dossiers & Achterpaden */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">🏠</span>
                        Woningdossiers
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="font-medium">Totaal Dossiers</span>
                            <span className="text-2xl font-bold text-red-600">{statistics.dossiers.totaal}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <span className="font-medium">Actief</span>
                            <span className="text-2xl font-bold text-yellow-600">{statistics.dossiers.actief}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-medium">Afgerond</span>
                            <span className="text-2xl font-bold text-green-600">{statistics.dossiers.afgerond}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6 print:break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="text-2xl mr-2">🚶</span>
                        Achterpaden Monitoring
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="font-medium">Totaal Gecontroleerd</span>
                            <span className="text-2xl font-bold text-blue-600">{statistics.achterpaden.totaal}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="font-medium">Schoon</span>
                            <span className="text-2xl font-bold text-green-600">{statistics.achterpaden.schoon}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="font-medium">Vervuild</span>
                            <span className="text-2xl font-bold text-red-600">{statistics.achterpaden.vervuild}</span>
                        </div>
                        <div className="mt-4">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold inline-block text-green-600">
                                            Schoon Percentage
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-green-600">
                                            {statistics.achterpaden.schoonPercentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-4 text-xs flex rounded-full bg-green-200">
                                    <div
                                        style={{ width: `${statistics.achterpaden.schoonPercentage}%` }}
                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-green-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conclusie */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-xl p-6 print:bg-white print:shadow-none print:break-inside-avoid">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <span className="text-3xl mr-3">✨</span>
                    Conclusie & Aanbevelingen
                </h2>
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                        <h4 className="font-bold text-green-600 mb-2">💚 Sterke Punten:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            <li>{statistics.meldingen.afgerondPercentage}% van de meldingen succesvol afgehandeld</li>
                            <li>{statistics.team.actief} van {statistics.team.totaal} teamleden actief betrokken</li>
                            <li>{statistics.uren.totaal.toFixed(0)} uur geregistreerd aan productieve activiteiten</li>
                            <li>{statistics.achterpaden.schoonPercentage}% van achterpaden voldoet aan standaard</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                        <h4 className="font-bold text-blue-600 mb-2">🎯 Aanbevelingen:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                            <li>Continue focus op tijdige afhandeling van meldingen</li>
                            <li>Stimuleer teamleden zonder urenregistratie tot actieve deelname</li>
                            <li>Plan vervolgacties voor lopende projecten ({statistics.projecten.lopend} actief)</li>
                            <li>Intensiveer monitoring van vervuilde achterpaden ({statistics.achterpaden.vervuild} locaties)</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Charts Section for PDF Export - using fixed dimensions for html2canvas */}
            <div id="report-charts-container" className="bg-white rounded-xl shadow-xl p-6 print:shadow-none" style={{ width: '800px' }}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Visuele Analyse
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {/* Meldingen per Categorie Pie Chart */}
                    <div className="bg-gray-50 rounded-lg p-4" style={{ width: '380px' }}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Meldingen per Categorie</h3>
                        <PieChart width={350} height={250}>
                            <Pie
                                data={Object.entries(statistics.meldingen.byCategorie).map(([name, value]) => ({ name, value }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {Object.entries(statistics.meldingen.byCategorie).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </div>

                    {/* Status Verdeling Pie Chart */}
                    <div className="bg-gray-50 rounded-lg p-4" style={{ width: '380px' }}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Overzicht Status</h3>
                        <PieChart width={350} height={250}>
                            <Pie
                                data={[
                                    { name: 'Meldingen Afgerond', value: statistics.meldingen.afgerond },
                                    { name: 'Meldingen Open', value: statistics.meldingen.totaal - statistics.meldingen.afgerond },
                                    { name: 'Projecten Afgerond', value: statistics.projecten.afgerond },
                                    { name: 'Projecten Lopend', value: statistics.projecten.lopend },
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                <Cell fill="#22c55e" />
                                <Cell fill="#ef4444" />
                                <Cell fill="#3b82f6" />
                                <Cell fill="#f97316" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </div>

                    {/* Uren per Activiteit */}
                    <div className="bg-gray-50 rounded-lg p-4" style={{ width: '780px' }}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Uren per Activiteit</h3>
                        <PieChart width={750} height={220}>
                            <Pie
                                data={Object.entries(statistics.uren.byActiviteit).slice(0, 6).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }))}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, value }) => `${name}: ${value}h`}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {Object.entries(statistics.uren.byActiviteit).slice(0, 6).map((_, index) => (
                                    <Cell key={`cell-uren-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </div>
                </div>
            </div>

            {/* Footer for print */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
                <p>Dit rapport is gegenereerd door het Buurtconciërge Managementsysteem</p>
                <p>© {new Date().getFullYear()} - Vertrouwelijk</p>
            </div>
        </div>
    );
};
// --- END: New Reports Page ---

export const NotificationsPage: React.FC = () => {
  const { notificaties, markSingleNotificationAsRead, users, projectInvitations, respondToProjectInvitation, currentUser } = useAppContext();
  const navigate = ReactRouterDOM.useNavigate();
  const [isResponding, setIsResponding] = useState(false);

  // Filter pending invitations for current user
  const pendingInvitations = projectInvitations.filter(
    inv => inv.invitedUserId === currentUser?.id && inv.status === 'pending'
  );

  const handleNotificationClick = (notificatie: Notificatie) => {
    if (!notificatie.isRead) {
      markSingleNotificationAsRead(notificatie.id);
    }
    navigate(notificatie.link);
  };

  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    setIsResponding(true);
    try {
      await respondToProjectInvitation(invitationId, response);
    } catch (error) {
      alert('Er is een fout opgetreden bij het reageren op de uitnodiging.');
    } finally {
      setIsResponding(false);
    }
  };

  const getSenderName = (message: string) => {
    const match = message.match(/^(.*?) stuurde een bericht/);
    return match ? match[1] : 'Iemand';
  }

  const getSenderAvatar = (message: string) => {
    const senderName = getSenderName(message);
    const sender = users.find(u => u.name === senderName);
    return sender?.avatarUrl || 'https://avatar.vercel.sh/default.png';
  }

  const sortedNotifications = [...notificaties].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Notificaties</h1>

      {/* Project Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200">Project Uitnodigingen</h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">Je hebt {pendingInvitations.length} openstaande uitnodiging(en)</p>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-dark-border">
            {pendingInvitations.map((invitation) => (
              <li key={invitation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors cursor-pointer"
                  onClick={() => navigate(`/invitation/${invitation.id}`)}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      Uitnodiging voor project: <span className="font-semibold">{invitation.projectTitle}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                      Van: {invitation.invitedByName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {format(invitation.createdAt, "d MMM yyyy 'om' HH:mm", { locale: nl })}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Klik om details te bekijken en te reageren →
                    </p>
                  </div>
                  <div className="flex-shrink-0 space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvitationResponse(invitation.id, 'accepted');
                      }}
                      disabled={isResponding}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Accepteren
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvitationResponse(invitation.id, 'declined');
                      }}
                      disabled={isResponding}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-dark-border text-xs font-medium rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-border disabled:bg-gray-100"
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      Afwijzen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regular Notifications */}
      {sortedNotifications.length === 0 && pendingInvitations.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-dark-text-secondary">
            Er zijn geen nieuwe notificaties.
          </p>
        </div>
      ) : sortedNotifications.length > 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Berichten & Updates</h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-dark-border">
            {sortedNotifications.map((notificatie) => (
              <li
                key={notificatie.id}
                onClick={() => handleNotificationClick(notificatie)}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-bg cursor-pointer flex items-start space-x-4 ${!notificatie.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="flex-shrink-0">
                  {notificatie.targetType === 'message' ? (
                    <img className="h-10 w-10 rounded-full" src={getSenderAvatar(notificatie.message)} alt="Avatar" />
                  ) : (
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notificatie.targetType === 'project' ? 'bg-purple-500' : 'bg-yellow-500'}`}>
                      {notificatie.targetType === 'project' ? <SparklesIcon className="h-6 w-6 text-white" /> : <AlertTriangleIcon className="h-6 w-6 text-white" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-dark-text-primary">{notificatie.message}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    {format(notificatie.timestamp, "d MMM yyyy 'om' HH:mm", { locale: nl })}
                  </p>
                </div>
                {!notificatie.isRead && (
                  <div className="flex-shrink-0 self-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export const ContactenPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Collegas' | 'Externe Contacten'>('Collegas');
    const tabs = ['Collegas', 'Externe Contacten'];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Contacten</h1>

            <div>
                <div className="border-b border-gray-200 dark:border-dark-border">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`${
                                    activeTab === tab
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {activeTab === 'Collegas' && <CollegaTab />}
            {activeTab === 'Externe Contacten' && <ExterneContactenTab />}
        </div>
    );
};

const CollegaTab: React.FC = () => {
    const { users, currentUser, getOrCreateConversation, sendChatMessage } = useAppContext();
    const navigate = ReactRouterDOM.useNavigate();
    const [isMessageModalOpen, setIsMessageModalOpen] = React.useState(false);
    const [selectedColleague, setSelectedColleague] = React.useState<User | null>(null);
    const [message, setMessage] = React.useState('');

    const allUsers = users.filter(u => u.id !== currentUser?.id);

    const handleOpenMessageModal = (user: User) => {
        setSelectedColleague(user);
        setIsMessageModalOpen(true);
    };

    const handleCloseMessageModal = () => {
        setSelectedColleague(null);
        setIsMessageModalOpen(false);
        setMessage('');
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !selectedColleague || !currentUser) return;
        try {
            const conv = await getOrCreateConversation([currentUser.id, selectedColleague.id]);
            if (conv?.id) {
                await sendChatMessage(conv.id, { text: message.trim() });
                handleCloseMessageModal();
                navigate(`/chat/${conv.id}`);
            } else {
                throw new Error("Kon geen gesprek aanmaken of ophalen.");
            }
        } catch (err) {
            console.error("Fout bij verzenden van bericht:", err);
            alert('Versturen mislukt. Probeer later opnieuw.');
            return;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {allUsers.map(user => (
                <div key={user.id} className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-5 text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                    <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 mx-auto rounded-full mb-4 border-4 border-gray-200 dark:border-dark-border" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{user.role}</p>
                    {user.phone && <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2">{user.phone}</p>}

                    <div className="mt-4 flex justify-center space-x-3">
                        <button onClick={() => handleOpenMessageModal(user)} title={`Bericht sturen`} className="p-2 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:bg-brand-primary/20 hover:text-brand-primary transition-colors">
                            <MessageSquareIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleCall(user)} title={`Bellen`} className="p-2 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:bg-green-500/20 hover:text-green-600 transition-colors">
                            <PhoneIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
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
}

const ExterneContactenTab: React.FC = () => {
    const { externalContacts, deleteExternalContact } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<ExternalContact | null>(null);
    const [wijkFilter, setWijkFilter] = useState<string>('');
    const [organisationFilter, setOrganisationFilter] = useState<string>('');

    const handleOpenModal = (contact: ExternalContact | null = null) => {
        setEditingContact(contact);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingContact(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Weet je zeker dat je dit contact wilt verwijderen?')) {
            await deleteExternalContact(id);
        }
    };

    const filteredContacts = useMemo(() => {
        return externalContacts.filter(contact => {
            const wijkMatch = !wijkFilter || contact.wijk === wijkFilter;
            const orgMatch = !organisationFilter || contact.organisation === organisationFilter;
            return wijkMatch && orgMatch;
        });
    }, [externalContacts, wijkFilter, organisationFilter]);

    const wijken = useMemo(() => {
        const wijkSet = new Set(externalContacts.map(c => c.wijk).filter(Boolean));
        return Array.from(wijkSet) as string[];
    }, [externalContacts]);

    const organisations = useMemo(() => {
        const orgSet = new Set(externalContacts.map(c => c.organisation));
        return Array.from(orgSet);
    }, [externalContacts]);

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                <div className="flex gap-4 flex-wrap">
                    <select value={wijkFilter} onChange={e => setWijkFilter(e.target.value)} className="p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary">
                        <option value="">Alle Wijken</option>
                        {wijken.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={organisationFilter} onChange={e => setOrganisationFilter(e.target.value)} className="p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary">
                        <option value="">Alle Organisaties</option>
                        {organisations.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary">
                    Nieuw Extern Contact
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(contact => {
                    // Organisatie type kleuren
                    const orgColors: Record<string, string> = {
                        'Gemeente': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                        'Centrada': 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
                        'Politie': 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
                        'Boa': 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
                        'Bewoner/Vrijwilliger': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                        'Welzijn Lelystad': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                        'Overig': 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    };
                    const orgColor = orgColors[contact.organisation] || orgColors['Overig'];

                    return (
                        <div key={contact.id} className={`bg-white dark:bg-dark-surface rounded-lg shadow-sm border-2 ${orgColor} p-5 hover:shadow-md transition-shadow`}>
                            {/* Header met naam en acties */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                                        {contact.name}
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary">
                                        {contact.organisation}
                                    </span>
                                </div>
                                <div className="flex-shrink-0 flex space-x-1 ml-2">
                                    <button
                                        onClick={() => handleOpenModal(contact)}
                                        className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
                                        title="Bewerken"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(contact.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        title="Verwijderen"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Contact informatie met icons */}
                            <div className="space-y-2 mb-3">
                                <div className="flex items-center text-sm text-gray-700 dark:text-dark-text-primary">
                                    <svg className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <a href={`tel:${contact.phone}`} className="hover:text-brand-primary transition-colors">
                                        {contact.phone}
                                    </a>
                                </div>
                                {contact.email && (
                                    <div className="flex items-center text-sm text-gray-700 dark:text-dark-text-primary">
                                        <svg className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <a href={`mailto:${contact.email}`} className="hover:text-brand-primary transition-colors truncate">
                                            {contact.email}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Extra info */}
                            {contact.extraInfo && (
                                <div className="bg-gray-50 dark:bg-dark-bg rounded-md p-3 mb-3">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                        {contact.extraInfo}
                                    </p>
                                </div>
                            )}

                            {/* Wijk badge (onderaan) */}
                            {contact.type === 'wijk' && contact.wijk && (
                                <div className="flex items-center text-xs pt-3 border-t border-gray-200 dark:border-dark-border">
                                    <svg className="h-3.5 w-3.5 mr-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-gray-600 dark:text-dark-text-secondary font-medium">
                                        Wijk: {contact.wijk}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {isModalOpen && <ExternalContactModal contact={editingContact} onClose={handleCloseModal} />}
        </div>
    );
}

const ExternalContactModal: React.FC<{ contact: ExternalContact | null; onClose: () => void; }> = ({ contact, onClose }) => {
    const { addExternalContact, updateExternalContact } = useAppContext();
    const [name, setName] = useState(contact?.name || '');
    const [organisation, setOrganisation] = useState<ExternalContact['organisation']>(contact?.organisation || 'Gemeente');
    const [phone, setPhone] = useState(contact?.phone || '');
    const [email, setEmail] = useState(contact?.email || '');
    const [type, setType] = useState<'algemeen' | 'wijk'>(contact?.type || 'algemeen');
    const [wijk, setWijk] = useState(contact?.wijk || '');
    const [showExtraInfo, setShowExtraInfo] = useState(!!contact?.extraInfo);
    const [extraInfo, setExtraInfo] = useState(contact?.extraInfo || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data: Omit<ExternalContact, 'id' | 'creatorId'> = {
            name,
            organisation,
            phone,
            email,
            type,
            wijk: type === 'wijk' ? wijk : '',
            extraInfo: showExtraInfo ? extraInfo : ''
        };
        if (contact) {
            await updateExternalContact(contact.id, data);
        } else {
            await addExternalContact(data);
        }
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={contact ? 'Contact Bewerken' : 'Nieuw Contact'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Naam" required className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary" />

                <select value={organisation} onChange={e => setOrganisation(e.target.value as ExternalContact['organisation'])} required className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary">
                    <option value="Gemeente">Gemeente</option>
                    <option value="Centrada">Centrada</option>
                    <option value="Politie">Politie</option>
                    <option value="Boa">Boa</option>
                    <option value="Bewoner/Vrijwilliger">Bewoner/Vrijwilliger</option>
                    <option value="Welzijn Lelystad">Welzijn Lelystad</option>
                    <option value="Overig">Overig</option>
                </select>

                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefoonnummer" required className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optioneel)" className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary" />

                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary">
                    <option value="algemeen">Algemeen</option>
                    <option value="wijk">Wijk-specifiek</option>
                </select>

                {type === 'wijk' && (
                    <select value={wijk} onChange={e => setWijk(e.target.value)} required className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary">
                        <option value="">Kies een wijk</option>
                        {MOCK_WIJKEN.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                )}

                <div className="flex items-center">
                    <input type="checkbox" id="extra-info-check" checked={showExtraInfo} onChange={e => setShowExtraInfo(e.target.checked)} className="h-4 w-4 rounded" />
                    <label htmlFor="extra-info-check" className="ml-2 block text-sm text-gray-900 dark:text-dark-text-primary">Extra informatie toevoegen</label>
                </div>

                {showExtraInfo && (
                    <textarea value={extraInfo} onChange={e => setExtraInfo(e.target.value)} placeholder="Extra informatie" className="w-full p-2 border rounded dark:bg-dark-surface dark:border-dark-border dark:text-dark-text-primary" />
                )}

                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-dark-border dark:text-dark-text-secondary dark:hover:bg-gray-600">Annuleren</button>
                    <button type="submit" className="px-4 py-2 rounded bg-brand-primary text-white">Opslaan</button>
                </div>
            </form>
        </Modal>
    );
}

// Project Invitation Detail Page
export const ProjectInvitationDetailPage: React.FC = () => {
  const { invitationId } = ReactRouterDOM.useParams<{ invitationId: string }>();
  const navigate = ReactRouterDOM.useNavigate();
  const { projectInvitations, projecten, users, respondToProjectInvitation, currentUser } = useAppContext();
  const [isResponding, setIsResponding] = useState(false);

  const invitation = projectInvitations.find(inv => inv.id === invitationId);
  const project = invitation ? projecten.find(p => p.id === invitation.projectId) : null;
  const invitedByUser = invitation ? users.find(u => u.id === invitation.invitedByUserId) : null;

  // Redirect if invitation not found or not for current user
  useEffect(() => {
    if (!invitation || invitation.invitedUserId !== currentUser?.id) {
      navigate('/notifications');
    }
  }, [invitation, currentUser, navigate]);

  // Redirect if invitation already responded to
  useEffect(() => {
    if (invitation && invitation.status !== 'pending') {
      navigate('/notifications');
    }
  }, [invitation, navigate]);

  const handleResponse = async (response: 'accepted' | 'declined') => {
    if (!invitation) return;

    setIsResponding(true);
    try {
      await respondToProjectInvitation(invitation.id, response);
      // Navigate to project if accepted, to notifications if declined
      if (response === 'accepted') {
        navigate('/projects');
      } else {
        navigate('/notifications');
      }
    } catch (error) {
      alert('Er is een fout opgetreden bij het reageren op de uitnodiging.');
      setIsResponding(false);
    }
  };

  if (!invitation || !project) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/notifications')}
          className="p-2 rounded-lg bg-gray-100 dark:bg-dark-border hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Project Uitnodiging</h1>
      </div>

      <div className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-200">
                Je bent uitgenodigd voor een project!
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Van: {invitedByUser?.name || invitation.invitedByName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">Project Details</h3>
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
              <div className="flex items-start space-x-4">
                {project.imageUrl && (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                    {project.title}
                  </h4>
                  <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
                    {project.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-dark-text-secondary">
                    <span>� {project.participantIds?.length || 0} teamleden</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === ProjectStatus.Lopend ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invitation Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">Uitnodiging Details</h3>
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                <span className="font-medium">Ontvangen op:</span> {format(invitation.createdAt, "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
            </div>
          </div>

          {/* Current Team Members */}
          {project.participantIds && project.participantIds.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-4">Huidige Teamleden</h3>
              <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                <div className="flex flex-wrap gap-3">
                  {project.participantIds.map((memberId: string) => {
                    const member = users.find(u => u.id === memberId);
                    return member ? (
                      <div key={memberId} className="flex items-center space-x-2 bg-white dark:bg-dark-surface rounded-lg p-2 shadow-sm">
                        <img
                          src={member.avatarUrl || 'https://avatar.vercel.sh/default.png'}
                          alt={member.name}
                          className="h-8 w-8 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                          {member.name}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border">
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => handleResponse('declined')}
              disabled={isResponding}
              className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <XIcon className="h-4 w-4" />
              <span>Afwijzen</span>
            </button>
            <button
              onClick={() => handleResponse('accepted')}
              disabled={isResponding}
              className="px-6 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>{isResponding ? 'Bezig...' : 'Accepteren'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
