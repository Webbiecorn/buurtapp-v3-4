

import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AppShell } from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IssuesPage from './pages/IssuesPage';
import ProjectsPage from './pages/ProjectsPage';
import DossierPage from './pages/DossierPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import DossierDetailPage from './pages/DossierDetailPage';
import StatisticsPage from './pages/StatisticsPage';
import AdminPage from './pages/AdminPage';
import { UserRole } from './types';
import { ReportsPage, ActiveColleaguesPage, NotificationsPage } from './pages/ExtraPages';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';


const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { currentUser } = useAppContext();

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
            <ReactRouterDOM.Route path="/login" element={<LoginPage />} />
            
            <ReactRouterDOM.Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/issues" element={<ProtectedRoute><IssuesPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/dossiers" element={<ProtectedRoute roles={[UserRole.Beheerder, UserRole.Concierge]}><DossierPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/dossier/:adres" element={<ProtectedRoute roles={[UserRole.Beheerder, UserRole.Concierge]}><DossierDetailPage /></ProtectedRoute>} />
            {/* <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} /> */}
            <ReactRouterDOM.Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/chat/:conversationId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <ReactRouterDOM.Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <ReactRouterDOM.Route path="/time-tracking" element={
                <ProtectedRoute roles={[UserRole.Concierge]}><TimeTrackingPage /></ProtectedRoute>
            } />
            
            <ReactRouterDOM.Route path="/statistics" element={
                <ProtectedRoute roles={[UserRole.Beheerder, UserRole.Viewer]}><StatisticsPage /></ProtectedRoute>
            } />

             <ReactRouterDOM.Route path="/active" element={
                <ProtectedRoute roles={[UserRole.Beheerder, UserRole.Concierge]}><ActiveColleaguesPage /></ProtectedRoute>
            } />
            
            <ReactRouterDOM.Route path="/admin" element={
                <ProtectedRoute roles={[UserRole.Beheerder]}><AdminPage /></ProtectedRoute>
            } />

            <ReactRouterDOM.Route path="/reports" element={
                <ProtectedRoute roles={[UserRole.Beheerder]}><ReportsPage /></ProtectedRoute>
            } />

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