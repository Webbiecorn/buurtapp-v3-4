import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTimer } from '../hooks/useTimer';
import { Modal } from '../components/ui';
import { Urenregistratie } from '../types';
import {
    differenceInMinutes,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    isWithinInterval,
} from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { nl } from 'date-fns/locale/nl';
import { MOCK_WIJKEN } from '../data/mockData';

const StartWorkModal: React.FC<{
    onClose: () => void;
    onStart: (activiteit: string, details: string) => void;
    isSwitching: boolean;
}> = ({ onClose, onStart, isSwitching }) => {
    const { projecten } = useAppContext();
    const [activiteit, setActiviteit] = useState('Wijkronde');
    const [details, setDetails] = useState('');

    useEffect(() => {
        setDetails('');
    }, [activiteit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart(activiteit, details);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={isSwitching ? 'Wissel van Taak' : 'Start Werkdag'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="activiteit" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Type Werk</label>
                    <select id="activiteit" value={activiteit} onChange={e => setActiviteit(e.target.value)} className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                        <option className="bg-white dark:bg-dark-surface">Wijkronde</option>
                        <option className="bg-white dark:bg-dark-surface">Project</option>
                        <option className="bg-white dark:bg-dark-surface">Overig</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Details</label>
                    {activiteit === 'Wijkronde' && (
                        <select id="details" value={details} onChange={e => setDetails(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                            <option value="" className="bg-white dark:bg-dark-surface">Kies een wijk</option>
                            {MOCK_WIJKEN.map(wijk => <option key={wijk} value={wijk} className="bg-white dark:bg-dark-surface">{wijk}</option>)}
                        </select>
                    )}
                    {activiteit === 'Project' && (
                        <select id="details" value={details} onChange={e => setDetails(e.target.value)} required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                            <option value="" className="bg-white dark:bg-dark-surface">Kies een project</option>
                            {projecten.filter(p => p.status === 'Lopend').map(p => <option key={p.id} value={p.title} className="bg-white dark:bg-dark-surface">{p.title}</option>)}
                        </select>
                    )}
                    {activiteit === 'Overig' && (
                        <input type="text" id="details" value={details} onChange={e => setDetails(e.target.value)} placeholder="Korte omschrijving" required className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                    )}
                </div>
                <div className="flex justify-end pt-4">
                    <button type="submit" className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
                        {isSwitching ? 'Wissel Taak' : 'Start Timer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const TimeTrackingPage: React.FC = () => {
    // CORRECTIE: De nieuwe functie 'switchUrenregistratie' wordt nu uit de context gehaald.
    const { currentUser, urenregistraties, startUrenregistratie, stopUrenregistratie, switchUrenregistratie, getActiveUrenregistratie, updateUrenregistratie, deleteUrenregistratie } = useAppContext();
    const [editEntry, setEditEntry] = useState<Urenregistratie | null>(null);
    const [editStart, setEditStart] = useState<string>('');
    const [editEnd, setEditEnd] = useState<string>('');
    const [editActiviteit, setEditActiviteit] = useState<string>('');
    const [editDetails, setEditDetails] = useState<string>('');
    const [editError, setEditError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [filter, setFilter] = useState<'today' | 'week' | 'month'>('week');

    const activeEntry = getActiveUrenregistratie();
    const { formattedTime, isActive } = useTimer(activeEntry?.starttijd);

    // CORRECTIE: Deze functie gebruikt nu de nieuwe 'switchUrenregistratie' logica.
    const handleModalSubmit = (activiteit: string, details: string) => {
        if (isActive) {
            // Als er al een taak actief is, wisselen we van taak.
            switchUrenregistratie({ activiteit, details });
        } else {
            // Anders starten we een nieuwe werkdag.
            startUrenregistratie({ activiteit, details });
        }
    };

    const handleStop = () => {
        stopUrenregistratie();
    };

    const filteredEntries = useMemo(() => {
        const now = new Date();
        let interval: { start: Date; end: Date; };

        switch (filter) {
            case 'today':
                interval = { start: startOfDay(now), end: endOfDay(now) };
                break;
            case 'week':
                interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
                break;
            case 'month':
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
        }

        return urenregistraties
            .filter(u =>
                u.gebruikerId === currentUser?.id &&
                u.eindtijd &&
                isWithinInterval(new Date(u.starttijd), interval)
            )
            .sort((a, b) => new Date(b.starttijd).getTime() - new Date(a.starttijd).getTime());
    }, [urenregistraties, currentUser, filter]);

    const totalMinutes = useMemo(() => {
        return filteredEntries.reduce((acc, curr) => {
            if (curr.eindtijd) {
                return acc + differenceInMinutes(new Date(curr.eindtijd), new Date(curr.starttijd));
            }
            return acc;
        }, 0);
    }, [filteredEntries]);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} uur en ${mins} min`;
    };

    const formatEntryDuration = (entry: Urenregistratie) => {
        if (!entry.eindtijd) return 'N/A';
        const minutes = differenceInMinutes(new Date(entry.eindtijd), new Date(entry.starttijd));
        return formatDuration(minutes);
    }
    
    const filterTextMap = {
        today: 'vandaag',
        week: 'deze week',
        month: 'deze maand'
    };

    return (
        <div className="space-y-8">
            {toast && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-40" role="status" aria-live="polite">
                    {toast}
                </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Urenregistratie</h1>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-8 flex flex-col items-center justify-center space-y-6">
                <div className="text-7xl font-mono font-bold tracking-widest text-gray-900 dark:text-dark-text-primary">
                    {formattedTime}
                </div>
                <div className="text-center">
                    <p className="text-lg text-gray-500 dark:text-dark-text-secondary">Huidige taak:</p>
                    <p className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">{isActive ? `${activeEntry?.activiteit} - ${activeEntry?.details}` : 'Niet ingeklokt'}</p>
                </div>
                <div className="flex space-x-4">
                    {!isActive ? (
                        <button onClick={() => setIsModalOpen(true)} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                            Start Werkdag
                        </button>
                    ) : (
                        <>
                            <button onClick={handleStop} className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors">
                                Stop Werkdag
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="px-8 py-3 bg-yellow-500 text-black font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                                Wissel van Taak
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Mijn Urenoverzicht</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setFilter('today')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'today' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Vandaag</button>
                        <button onClick={() => setFilter('week')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'week' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Deze Week</button>
                        <button onClick={() => setFilter('month')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${filter === 'month' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-dark-border'}`}>Deze Maand</button>
                    </div>
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Totaal voor {filterTextMap[filter]}: <span className="font-bold text-gray-800 dark:text-dark-text-primary">{formatDuration(totalMinutes)}</span></p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Datum</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Activiteit</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Start/Eind</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Duur</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} className="border-b border-gray-200 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg">
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{format(entry.starttijd, 'dd MMM yyyy', { locale: nl })}</td>
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{entry.activiteit} - <span className="text-gray-500 dark:text-dark-text-secondary">{entry.details}</span></td>
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{format(entry.starttijd, 'HH:mm')} - {entry.eindtijd && format(entry.eindtijd, 'HH:mm')}</td>
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary flex items-center gap-2">
                                        <span>{formatEntryDuration(entry)}</span>
                                        <button
                                            type="button"
                                            className="ml-2 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-gray-600"
                                            onClick={() => {
                                                setEditEntry(entry);
                                                const toLocal = (d?: Date) => d ? new Date(d).toISOString().slice(0,16) : '';
                                                setEditStart(toLocal(entry.starttijd));
                                                setEditEnd(toLocal(entry.eindtijd));
                                                setEditActiviteit(entry.activiteit);
                                                setEditDetails(entry.details);
                                                setEditError(null);
                                            }}
                                        >Bewerken</button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                            onClick={async () => {
                                                if (confirm('Weet je zeker dat je deze registratie wilt verwijderen?')) {
                                                    await deleteUrenregistratie(entry.id);
                                                    setToast('Registratie verwijderd');
                                                    setTimeout(() => setToast(null), 2000);
                                                }
                                            }}
                                        >Verwijderen</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-6 text-gray-500 dark:text-dark-text-secondary">Geen uren geregistreerd in deze periode.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && <StartWorkModal onClose={() => setIsModalOpen(false)} onStart={handleModalSubmit} isSwitching={isActive} />}

                        {editEntry && (
                <Modal isOpen={true} onClose={() => setEditEntry(null)} title={`Urenregistratie bewerken (${format(editEntry.starttijd, 'dd MMM yyyy', { locale: nl })})`}>
                    <form className="space-y-3" onSubmit={async (e) => {
                        e.preventDefault();
                        setEditError(null);
                        if (!editStart || !editEnd) { setEditError('Start en eindtijd zijn verplicht.'); return; }
                        const start = new Date(editStart);
                        const end = new Date(editEnd);
                        if (start >= end) { setEditError('Starttijd moet vóór eindtijd liggen.'); return; }
                                                // Overlap check in UI voor directe feedback (context valideert ook)
                                                const overlap = urenregistraties
                                                    .filter(u => u.gebruikerId === currentUser?.id && u.id !== editEntry.id && u.eindtijd)
                                                    .some(u => {
                                                        const oStart = new Date(u.starttijd).getTime();
                                                        const oEnd = new Date(u.eindtijd as Date).getTime();
                                                        return start.getTime() < oEnd && end.getTime() > oStart;
                                                    });
                                                if (overlap) { setEditError('Deze tijden overlappen met een bestaande registratie.'); return; }
                        // 21-dagen check in UI (info); server enforce is in context
                        const within21 = Date.now() - start.getTime() <= 21*24*60*60*1000;
                        if (!within21 && currentUser?.role !== 'Beheerder') {
                            setEditError('Aanpassen beperkt tot 21 dagen na starttijd.');
                            return;
                        }
                        await updateUrenregistratie(editEntry.id, { starttijd: start, eindtijd: end, activiteit: editActiviteit, details: editDetails });
                        setEditEntry(null);
                                                setToast('Registratie opgeslagen');
                                                setTimeout(() => setToast(null), 2000);
                    }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                Start
                                <input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary" required />
                            </label>
                            <label className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                Einde
                                <input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary" required />
                            </label>
                            <label className="md:col-span-2 text-xs text-gray-600 dark:text-dark-text-secondary">
                                Activiteit
                                <select value={editActiviteit} onChange={e=>setEditActiviteit(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary">
                                    <option className="bg-white dark:bg-dark-surface">Wijkronde</option>
                                    <option className="bg-white dark:bg-dark-surface">Project</option>
                                    <option className="bg-white dark:bg-dark-surface">Overig</option>
                                </select>
                            </label>
                            <label className="md:col-span-2 text-xs text-gray-600 dark:text-dark-text-secondary">
                                Details
                                <input type="text" value={editDetails} onChange={e=>setEditDetails(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary" />
                            </label>
                        </div>
                        {editError && <p className="text-sm text-red-600">{editError}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={()=>setEditEntry(null)} className="px-4 py-2 rounded bg-gray-200 dark:bg-dark-border">Annuleren</button>
                            <button type="submit" className="px-4 py-2 rounded bg-brand-primary text-white">Opslaan</button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Let op: aanpassen is toegestaan binnen 21 dagen (behalve voor beheerders).</p>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default TimeTrackingPage;