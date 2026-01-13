


import React, { ReactNode, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { HomeIcon, AlertTriangleIcon, ClockIcon, BriefcaseIcon, BarChartIcon, UsersIcon, SettingsIcon, LogOutIcon, BellIcon, SunIcon, MoonIcon, MenuIcon, XIcon, DownloadIcon, FolderIcon } from './Icons';

type NavItem = {
  path: string;
  name: string;
  icon: ReactNode;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { path: '/', name: 'Dashboard', icon: <HomeIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/issues', name: 'Meldingen', icon: <AlertTriangleIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/projects', name: 'Projecten', icon: <BriefcaseIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/dossiers', name: 'Woningdossiers', icon: <FolderIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  // { path: '/map', name: 'Kaart', icon: <MapIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/time-tracking', name: 'Urenregistratie', icon: <ClockIcon className="h-5 w-5" />, roles: [UserRole.Concierge, UserRole.Beheerder] },
  { path: '/statistics', name: 'Statistieken', icon: <BarChartIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Viewer] },
  { path: '/reports', name: 'Rapportages', icon: <DownloadIcon className="h-5 w-5" />, roles: [UserRole.Beheerder] },
  { path: '/contacten', name: 'Contacten', icon: <UsersIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/admin', name: 'Beheer', icon: <SettingsIcon className="h-5 w-5" />, roles: [UserRole.Beheerder] },
  { path: '/achterpaden', name: 'Achterpaden', icon: <FolderIcon className="h-5 w-5" />, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
  { path: '/updates', name: 'Updates', icon: <span className="text-lg">📋</span>, roles: [UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer] },
];

const NavLinkItem: React.FC<{ item: NavItem, hasUnread?: boolean }> = ({ item, hasUnread }) => (
    <ReactRouterDOM.NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-brand-primary text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:bg-dark-border dark:hover:text-dark-text-primary'
        }`
      }
    >
      {item.icon}
      <span className="ml-4 flex-grow">{item.name}</span>
      {hasUnread && <div className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>}
    </ReactRouterDOM.NavLink>
  );

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (isOpen: boolean) => void }> = ({ isOpen, setIsOpen }) => {
  const { currentUser, notificaties } = useAppContext();

  const filteredNavItems = navItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  const hasUnreadIssues = currentUser?.role === UserRole.Beheerder && notificaties.some(n =>
      n.userId === currentUser.id && !n.isRead && n.targetType === 'melding'
  );

  const hasUnreadProjects = (currentUser?.role === UserRole.Beheerder || currentUser?.role === UserRole.Concierge) && notificaties.some(n =>
      n.userId === currentUser.id && !n.isRead && n.targetType === 'project'
  );

  const getUnreadStatus = (path: string) => {
    if (path === '/issues') return hasUnreadIssues;
    if (path === '/projects') return hasUnreadProjects;
    return false;
  }

  return (
    <>
        <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-white dark:bg-dark-surface transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} print:hidden`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-dark-border">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Concierge App</h1>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 dark:text-dark-text-secondary">
             <XIcon className="h-6 w-6"/>
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {filteredNavItems.map(item => 
            <div key={item.path} onClick={() => setIsOpen(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(false); }}>
              <NavLinkItem item={item} hasUnread={getUnreadStatus(item.path)} />
            </div>
          )}
        </nav>
      </aside>
  {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setIsOpen(false); }}></div>}
    </>
  );
};

const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { currentUser, logout, toggleTheme, theme, notificaties } = useAppContext();
  const navigate = ReactRouterDOM.useNavigate();

  const unreadNotifications = notificaties.filter(n => n.userId === currentUser?.id && !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm sticky top-0 z-20 md:ml-64 print:hidden">
      <div className="flex items-center h-16 px-4 md:px-8 border-b border-gray-200 dark:border-dark-border">
        <button onClick={onMenuClick} className="md:hidden text-gray-500 dark:text-dark-text-secondary">
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="flex-1" /> {/* Spacer */}
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border">
            {theme === 'dark' ? <SunIcon className="h-5 w-5 text-yellow-400" /> : <MoonIcon className="h-5 w-5 text-gray-400" />}
          </button>
          <ReactRouterDOM.NavLink to="/notifications" className="relative p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border">
            <BellIcon className="h-6 w-6" />
            {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-dark-surface"></span>
            )}
          </ReactRouterDOM.NavLink>
          <ReactRouterDOM.Link to="/profile" className="flex items-center p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border">
            <img src={currentUser?.avatarUrl} alt="avatar" className="h-9 w-9 rounded-full" />
            <div className="ml-3 hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">{currentUser?.name}</p>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{currentUser?.role}</p>
            </div>
          </ReactRouterDOM.Link>
          <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border">
            <LogOutIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export const AppShell: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-dark-bg print:bg-white`}>
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}/>
          <div className="flex flex-col flex-1">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="flex-1 p-4 md:p-8 md:ml-64 print:m-0 print:p-0">
              {children}
            </main>
          </div>
      </div>
    );
};