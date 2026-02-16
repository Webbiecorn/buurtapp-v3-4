import React, { Suspense } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { UserRole } from './types';
import { PageSkeleton } from './components/Skeletons';

// Lazy load alle pagina's voor betere performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const AchterpadenPage = React.lazy(() => import('./pages/AchterpadenPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const IssuesPage = React.lazy(() => import('./pages/IssuesPage'));
const NieuweMeldingPage = React.lazy(() => import('./pages/NieuweMeldingPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const DossierPage = React.lazy(() => import('./pages/DossierPage'));
const UrenregistratiePage = React.lazy(() => import('./pages/UrenregistratiePage'));
const DossierDetailPage = React.lazy(() => import('./pages/DossierDetailPage'));
const StatisticsPage = React.lazy(() => import('./pages/StatisticsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ReportsPage = React.lazy(() => import('./pages/ExtraPages').then(module => ({ default: module.ReportsPage })));
const ContactenPage = React.lazy(() => import('./pages/ExtraPages').then(module => ({ default: module.ContactenPage })));
const NotificationsPage = React.lazy(() => import('./pages/ExtraPages').then(module => ({ default: module.NotificationsPage })));
const ProjectInvitationDetailPage = React.lazy(() => import('./pages/ExtraPages').then(module => ({ default: module.ProjectInvitationDetailPage })));
const UpdatesPage = React.lazy(() => import('./pages/UpdatesPage'));

// Loading component voor Suspense fallback
const PageLoader = () => <PageSkeleton />;


const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { currentUser, isInitialLoading } = useAppContext();

  // Wacht tot auth + profiel geladen zijn om heen-en-weer navigeren te voorkomen
  if (isInitialLoading) {
    return <PageLoader />;
  }
  if (!currentUser) {
    return <ReactRouterDOM.Navigate to="/login" replace />;
  }
  
  if(roles && !roles.includes(currentUser.role)) {
    return <ReactRouterDOM.Navigate to="/" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

const AppRoutes: React.FC = () => {
    const { currentUser } = useAppContext();

  return (
    <ReactRouterDOM.Routes>
      <ReactRouterDOM.Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <ReactRouterDOM.Route path="/" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/issues" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><IssuesPage /></Suspense></ProtectedRoute>} />
  <ReactRouterDOM.Route path="/issues/nieuw" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><NieuweMeldingPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/projects" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/dossiers" element={<ProtectedRoute roles={[UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer]}><Suspense fallback={<PageLoader />}><DossierPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/dossier/:adres" element={<ProtectedRoute roles={[UserRole.Beheerder, UserRole.Concierge, UserRole.Viewer]}><Suspense fallback={<PageLoader />}><DossierDetailPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/notifications" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/invitation/:invitationId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ProjectInvitationDetailPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/chat/:conversationId" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ChatPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ProfilePage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/time-tracking" element={<ProtectedRoute roles={[UserRole.Concierge, UserRole.Beheerder]}><Suspense fallback={<PageLoader />}><UrenregistratiePage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/statistics" element={<ProtectedRoute roles={[UserRole.Beheerder, UserRole.Viewer]}><Suspense fallback={<PageLoader />}><StatisticsPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/achterpaden" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AchterpadenPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/admin" element={<ProtectedRoute roles={[UserRole.Beheerder]}><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/reports" element={<ProtectedRoute roles={[UserRole.Beheerder]}><Suspense fallback={<PageLoader />}><ReportsPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/contacten" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ContactenPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="/updates" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><UpdatesPage /></Suspense></ProtectedRoute>} />
      <ReactRouterDOM.Route path="*" element={<ReactRouterDOM.Navigate to={currentUser ? "/" : "/login"} replace />} />
    </ReactRouterDOM.Routes>
  );
};


const App: React.FC = () => {
  return (
    <AppProvider>
      <ReactRouterDOM.HashRouter>
        <AppRoutes />
      </ReactRouterDOM.HashRouter>
    </AppProvider>
  );
};

export default App;