import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { DossierStatus, UserRole } from '../types';
import { Modal, NewProjectForm, StatCard } from '../components/ui';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import nl from 'date-fns/locale/nl';
import subMonths from 'date-fns/subMonths';
import { eachMonthOfInterval } from 'date-fns';

const AddUserModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addUser } = useAppContext();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Concierge);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            alert('Naam en email zijn verplicht.');
            return;
        }
        addUser({ name, email, role });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Nieuwe Gebruiker Toevoegen">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Naam</label>
                    <input
                        type="text"
                        id="user-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>
                <div>
                    <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Email</label>
                    <input
                        type="email"
                        id="user-email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                </div>
                <div>
                    <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Rol</label>
                    <select
                        id="user-role"
                        value={role}
                        onChange={e => setRole(e.target.value as UserRole)}
                        className="mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    >
                        {Object.values(UserRole).map(roleValue => (
                            <option key={roleValue} value={roleValue} className="bg-white dark:bg-dark-surface">{roleValue}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                    >
                        Gebruiker Toevoegen
                    </button>
                </div>
            </form>
        </Modal>
    );
};


type SlimDossier = {
  id: string;
  status: DossierStatus;
  woningType?: string | null;
  createdAt?: Date | null;
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#22c55e'];

const AdminPage: React.FC = () => {
    const { users, projecten, updateUserRole, removeUser, theme } = useAppContext();
    const [dossiers, setDossiers] = useState<SlimDossier[]>([]);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    
    // Subscribe to dossiers (analytics only)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'dossiers'), (ss) => {
            const list: SlimDossier[] = ss.docs.map(d => {
                const v: any = d.data();
                // derive createdAt from eerste historie-item met type 'Aanmaak' of earliest date
                let created: Date | null = null;
                if (Array.isArray(v.historie) && v.historie.length) {
                    const dates = v.historie
                      .map((h: any) => h?.date instanceof Timestamp ? h.date.toDate() : (h?.date ? new Date(h.date) : null))
                      .filter(Boolean) as Date[];
                    if (dates.length) created = new Date(Math.min(...dates.map(d => d.getTime())));
                }
                return {
                    id: d.id,
                    status: (v.status as DossierStatus) || 'actief',
                    woningType: v.woningType ?? null,
                    createdAt: created,
                };
            });
            setDossiers(list);
        });
        return () => unsub();
    }, []);

    // Stats
    const projectStats = useMemo(() => {
        const totaal = projecten.length;
        const lopend = projecten.filter(p => String(p.status) === 'Lopend').length;
        const afgerond = projecten.filter(p => String(p.status) === 'Afgerond').length;
        return { totaal, lopend, afgerond };
    }, [projecten]);

    const dossierStats = useMemo(() => {
        const totaal = dossiers.length;
        const actief = dossiers.filter(d => d.status === 'actief').length;
        const afgesloten = dossiers.filter(d => d.status === 'afgesloten').length;
        const onderzoek = dossiers.filter(d => d.status === 'in onderzoek').length;
        return { totaal, actief, afgesloten, onderzoek };
    }, [dossiers]);

    // Trends (last 6 months)
    const months = useMemo(() => eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() }), []);
    const projectTrend = useMemo(() => {
        return months.map(ms => {
            const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
            const maand = format(ms, 'MMM', { locale: nl });
            const nieuw = projecten.filter(p => p.startDate >= ms && p.startDate <= me).length;
            const afgerond = projecten.filter(p => p.endDate && p.endDate >= ms && p.endDate <= me).length;
            return { maand, nieuw, afgerond };
        });
    }, [months, projecten]);

    const dossierTrend = useMemo(() => {
        return months.map(ms => {
            const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
            const maand = format(ms, 'MMM', { locale: nl });
            const nieuw = dossiers.filter(d => d.createdAt && d.createdAt >= ms && d.createdAt <= me).length;
            return { maand, nieuw };
        });
    }, [months, dossiers]);

    // Distributions
    const dossierStatusData = useMemo(() => (
        [
            { name: 'Actief', value: dossiers.filter(d => d.status === 'actief').length },
            { name: 'Afgesloten', value: dossiers.filter(d => d.status === 'afgesloten').length },
            { name: 'In onderzoek', value: dossiers.filter(d => d.status === 'in onderzoek').length },
        ]
    ), [dossiers]);

    const woningTypeData = useMemo(() => {
        const counts = dossiers.reduce((acc, d) => {
            const key = d.woningType || 'Onbekend';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const arr = Object.entries(counts).map(([name, value]) => ({ name, value }));
        // top 6 + overig
        arr.sort((a, b) => b.value - a.value);
        const top = arr.slice(0, 6);
        const rest = arr.slice(6).reduce((s, x) => s + x.value, 0);
        return rest > 0 ? [...top, { name: 'Overig', value: rest }] : top;
    }, [dossiers]);

    const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const tooltipStyle = theme === 'dark' ? { backgroundColor: '#1f2937', border: '1px solid #374151' } : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' };
    
    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateUserRole(userId, newRole);
    };
    
    const handleAddUser = () => {
        setIsAddUserModalOpen(true);
    };

    const handleRemoveUser = (userId: string) => {
        if(window.confirm('Weet u zeker dat u deze gebruiker wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
            removeUser(userId);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Beheer</h1>

            {/* Admin Dashboard: Projecten & Woningdossiers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={<span className="font-bold">P</span>} title="Projecten (totaal)" value={projectStats.totaal} color="bg-indigo-600" />
                <StatCard icon={<span className="font-bold">▶</span>} title="Projecten (lopend)" value={projectStats.lopend} color="bg-blue-600" />
                <StatCard icon={<span className="font-bold">✔</span>} title="Projecten (afgerond)" value={projectStats.afgerond} color="bg-green-600" />
                <StatCard icon={<span className="font-bold">🏠</span>} title="Dossiers (totaal)" value={dossierStats.totaal} color="bg-rose-600" />
            </div>

            {/* Trends verplaatst naar Statistieken pagina */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Dossierstatus</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={dossierStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {dossierStatusData.map((_, idx) => (
                                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">Woningtype verdeling</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={woningTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {woningTypeData.map((_, idx) => (
                                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Gebruikersbeheer</h2>
                    <button onClick={handleAddUser} className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg shadow-md hover:bg-brand-secondary transition-colors">
                        Gebruiker Toevoegen
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Naam</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Email</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">Rol</th>
                                <th className="p-3 text-sm font-semibold text-gray-500 dark:text-dark-text-secondary text-right">Acties</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-gray-200 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-bg">
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary flex items-center">
                                        <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full mr-3" />
                                        {user.name}
                                    </td>
                                    <td className="p-3 text-gray-800 dark:text-dark-text-primary">{user.email}</td>
                                    <td className="p-3">
                                        <select 
                                            value={user.role} 
                                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                            className="bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                                        >
                                            {Object.values(UserRole).map(role => (
                                                <option key={role} value={role} className="bg-white dark:bg-dark-surface">{role}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-400 font-semibold">
                                            Verwijderen
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-white dark:bg-dark-surface rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">Projectbeheer</h2>
                <div className="text-center">
                    <p className="text-gray-600 dark:text-dark-text-secondary mb-4">Maak snel een nieuw wijkverbeteringsproject aan.</p>
                     <button onClick={() => setIsNewProjectModalOpen(true)} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                        Nieuw Project Aanmaken
                    </button>
                </div>
             </div>
             <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Nieuw Project Aanmaken">
                <NewProjectForm onClose={() => setIsNewProjectModalOpen(false)} />
            </Modal>
            {isAddUserModalOpen && <AddUserModal onClose={() => setIsAddUserModalOpen(false)} />}
        </div>
    );
};

export default AdminPage;